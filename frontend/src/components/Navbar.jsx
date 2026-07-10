import { useState } from "react";
import { Moon, Sun, Zap, Menu, X } from "lucide-react";
import { Button } from "./ui/button";

const links = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export const Navbar = ({ theme, toggleTheme }) => {
  const [open, setOpen] = useState(false);

  return (
    <nav data-testid="navbar" className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#hero" data-testid="navbar-logo" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-serif text-xl tracking-tight">StreamLine</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`navbar-link-${l.label.toLowerCase()}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors focus:ring-2 focus:ring-accent focus:outline-none"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <a href="/login" data-testid="navbar-login-link" className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors items-center">
            Log in
          </a>
          <Button asChild data-testid="navbar-cta" className="hidden md:inline-flex rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <a href="/register">Get Started</a>
          </Button>
          <button
            data-testid="navbar-mobile-toggle"
            className="md:hidden w-9 h-9 rounded-xl border border-border flex items-center justify-center"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div data-testid="navbar-mobile-menu" className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};
