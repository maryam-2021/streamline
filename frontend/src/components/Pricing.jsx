import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "./ui/button";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    desc: "For individuals and tiny teams getting started.",
    features: ["3 active workflows", "100 runs / month", "Web + mobile access", "Community support"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/user/month",
    desc: "For growing teams that automate everything.",
    features: ["Unlimited workflows", "10,000 runs / month", "Advanced analytics", "Priority support", "100+ integrations"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organizations with advanced needs.",
    features: ["Unlimited everything", "SSO & audit logs", "Dedicated success manager", "Custom SLAs"],
    featured: false,
  },
];

export const Pricing = () => (
  <section id="pricing" data-testid="pricing-section" className="py-20 lg:py-32 px-6 lg:px-10 bg-secondary/50">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mb-16"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-4 mb-6">Simple pricing, start free</h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">No credit card required. Upgrade when your team is ready.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            data-testid={`pricing-card-${t.name.toLowerCase()}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl p-8 lg:p-10 bg-card border flex flex-col ${
              t.featured
                ? "border-accent shadow-xl shadow-fuchsia-500/10 lg:scale-105 ring-1 ring-accent/40"
                : "border-border shadow-xl shadow-teal-900/5 dark:shadow-black/40"
            }`}
          >
            {t.featured && (
              <span className="absolute -top-3 left-8 text-xs font-semibold uppercase tracking-widest bg-accent text-accent-foreground px-3 py-1 rounded-full">
                Most popular
              </span>
            )}
            <h3 className="text-2xl tracking-tight mb-2">{t.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="font-serif text-4xl text-primary">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.period}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">{t.desc}</p>
            <ul className="space-y-3 mb-10 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              data-testid={`pricing-cta-${t.name.toLowerCase()}`}
              className={`w-full rounded-xl hover:-translate-y-0.5 transition-[transform,background-color] ${
                t.featured
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <a href={t.name === "Enterprise" ? "#contact" : t.name === "Pro" ? "/register?plan=pro" : "/register"}>{t.name === "Enterprise" ? "Contact Sales" : "Get Started"}</a>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
