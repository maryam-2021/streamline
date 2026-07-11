import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Zap, LayoutDashboard, Users, Workflow, Inbox, LogOut, Moon, Sun, CreditCard, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/clients", label: "Clients", icon: Users },
  { to: "/dashboard/workflows", label: "Workflows", icon: Workflow },
  { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const items = user?.role === "admin" ? [...navItems, { to: "/dashboard/leads", label: "Leads", icon: Inbox }] : navItems;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex" data-testid="dashboard-layout">
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col fixed inset-y-0">
        <div className="p-6 flex items-center gap-2 border-b border-border">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-serif text-xl tracking-tight">StreamLine</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`sidebar-link-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm truncate" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="dashboard-theme-toggle"
              onClick={toggleTheme}
              className="flex-1 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              data-testid="logout-button"
              onClick={handleLogout}
              className="flex-1 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </span>
          <span className="font-serif text-lg">StreamLine</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="p-2 text-muted-foreground" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={handleLogout} className="p-2 text-muted-foreground" aria-label="Log out" data-testid="mobile-logout-button">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile bottom tab bar (PWA companion feel) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]" data-testid="mobile-tab-bar">
        <div className="flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`mobile-tab-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-24 md:pb-0">
        <div className="p-6 lg:p-12 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
