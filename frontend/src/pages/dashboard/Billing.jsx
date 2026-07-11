import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { Button } from "../../components/ui/button";

export default function Billing() {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);

  useEffect(() => {
    api.get("/billing/status")
      .then(({ data }) => setBilling(data))
      .catch(() => toast.error("Could not load billing status"))
      .finally(() => setLoading(false));
  }, []);

  const redirect = async (endpoint, body) => {
    setAction(endpoint);
    try {
      const { data } = await api.post(endpoint, body);
      window.location.assign(data.url);
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
      setAction(null);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading billing…</div>;

  const isPro = billing?.plan === "pro";
  return (
    <div data-testid="billing-page">
      <h1 className="font-serif text-4xl tracking-tight mb-2">Billing</h1>
      <p className="text-muted-foreground mb-10">Manage your plan, subscription, and invoices.</p>

      {!billing?.configured && (
        <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          Payments are not active yet. The site owner must configure Stripe before upgrades can be purchased.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className={`rounded-2xl border p-7 ${!isPro ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
          <p className="text-sm text-muted-foreground">Starter</p>
          <p className="font-serif text-4xl my-3">$0<span className="font-sans text-sm text-muted-foreground">/month</span></p>
          <ul className="space-y-2 text-sm mb-7">
            {["3 active workflows", "100 runs per month", "Web and mobile access"].map((item) => <li key={item} className="flex gap-2"><Check className="w-4 h-4 text-primary" />{item}</li>)}
          </ul>
          {!isPro && <p className="text-sm font-medium text-primary">Your current plan</p>}
        </div>

        <div className={`rounded-2xl border p-7 ${isPro ? "border-accent ring-1 ring-accent/30" : "border-border"}`}>
          <p className="text-sm text-muted-foreground">Pro</p>
          <p className="font-serif text-4xl my-3">$19<span className="font-sans text-sm text-muted-foreground">/user/month</span></p>
          <ul className="space-y-2 text-sm mb-7">
            {["Unlimited workflows", "10,000 runs per month", "Priority support"].map((item) => <li key={item} className="flex gap-2"><Check className="w-4 h-4 text-accent" />{item}</li>)}
          </ul>
          {isPro ? (
            <Button onClick={() => redirect("/billing/portal")} disabled={!!action} variant="outline" className="rounded-xl">
              <CreditCard className="w-4 h-4 mr-2" /> Manage subscription
            </Button>
          ) : (
            <Button onClick={() => redirect("/billing/checkout", { plan: "pro" })} disabled={!!action || !billing?.configured} className="rounded-xl bg-accent text-accent-foreground">
              {action ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />} Upgrade to Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
