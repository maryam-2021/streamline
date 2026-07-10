import { useEffect, useState } from "react";
import { Users, Workflow, PlayCircle, Inbox, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`} className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-teal-900/5 dark:shadow-black/40">
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
      <Icon className="w-5 h-5" />
    </span>
    <div className="font-serif text-3xl">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

export default function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div data-testid="dashboard-overview">
      <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">
        Welcome, {user?.name?.split(" ")[0]}
      </h1>
      <p className="text-muted-foreground mb-10">Here's what's happening with your automations.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={Users} label="Clients" value={stats?.clients ?? "—"} />
        <StatCard icon={Workflow} label="Active Workflows" value={stats ? `${stats.active_workflows}/${stats.workflows}` : "—"} />
        <StatCard icon={PlayCircle} label="Total Runs" value={stats?.runs ?? "—"} accent />
        {user?.role === "admin" && <StatCard icon={Inbox} label="Leads" value={stats?.leads ?? "—"} accent />}
      </div>

      <h2 className="font-serif text-2xl tracking-tight mb-6">Recent activity</h2>
      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-teal-900/5 dark:shadow-black/40 divide-y divide-border" data-testid="recent-activity-list">
        {stats?.recent_runs?.length ? (
          stats.recent_runs.map((run) => (
            <div key={run.id} className="flex items-center gap-4 px-6 py-4">
              {run.status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{run.workflow_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()}</p>
              </div>
              <span className="text-xs text-muted-foreground">{run.duration_ms}ms</span>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${run.status === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                {run.status}
              </span>
            </div>
          ))
        ) : (
          <p className="px-6 py-10 text-sm text-muted-foreground" data-testid="no-activity-message">
            No runs yet. Create a workflow and hit Run to see activity here.
          </p>
        )}
      </div>
    </div>
  );
}
