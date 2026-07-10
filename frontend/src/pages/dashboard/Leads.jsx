import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../../lib/api";

export default function Leads() {
  const [leads, setLeads] = useState(null);

  useEffect(() => {
    api.get("/leads").then(({ data }) => setLeads(data)).catch(() => setLeads([]));
  }, []);

  return (
    <div data-testid="leads-page">
      <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">Leads</h1>
      <p className="text-muted-foreground mb-10">Contact form submissions from your marketing site.</p>

      <div className="space-y-4" data-testid="leads-list">
        {leads === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : leads.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-xl shadow-teal-900/5 dark:shadow-black/40">
            <p className="text-sm text-muted-foreground" data-testid="no-leads-message">No leads yet.</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} data-testid={`lead-card-${lead.id}`} className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-teal-900/5 dark:shadow-black/40">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm">{lead.name}{lead.company ? ` · ${lead.company}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{lead.email} · {new Date(lead.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{lead.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
