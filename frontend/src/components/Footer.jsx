import { Zap } from "lucide-react";

const columns = [
  { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "API Reference", "Community", "Status"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] },
];

export const Footer = () => (
  <footer data-testid="footer" className="bg-foreground text-background dark:bg-card dark:text-foreground border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </span>
            <span className="font-serif text-2xl tracking-tight">StreamLine</span>
          </div>
          <p className="text-sm opacity-70 leading-relaxed max-w-xs">
            Workflow automation for small teams. Web and mobile, one design system, $0 to start.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-5 opacity-60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{c.title}</h4>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#hero" data-testid={`footer-link-${l.toLowerCase().replace(/\s/g, "-")}`} className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-16 pt-8 border-t border-background/10 dark:border-border flex flex-col sm:flex-row justify-between gap-4">
        <p className="text-xs opacity-50">© 2026 StreamLine. All rights reserved.</p>
        <p className="text-xs opacity-50">Built with a shared teal design system.</p>
      </div>
    </div>
  </footer>
);
