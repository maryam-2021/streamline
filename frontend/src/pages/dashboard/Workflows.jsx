import { useEffect, useState } from "react";
import { Plus, Play, Pause, Trash2, Loader2, X, ArrowRight, Link2, Mail, MessageSquare, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { RunSteps } from "../../components/RunDetails";
import { api, formatApiErrorDetail } from "../../lib/api";

const stepIcons = { webhook: Link2, slack: MessageSquare, email: Mail };

const triggers = ["New contact form submission", "New client added", "Schedule: daily 9am", "Webhook received", "Email received"];

export default function Workflows() {
  const [workflows, setWorkflows] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", trigger: triggers[0] });
  const [steps, setSteps] = useState([]);
  const [stepInput, setStepInput] = useState("");
  const [stepType, setStepType] = useState("action");
  const [stepUrl, setStepUrl] = useState("");
  const [stepTo, setStepTo] = useState("");
  const [stepMessage, setStepMessage] = useState("");
  const [runsFor, setRunsFor] = useState(null);
  const [runs, setRuns] = useState(null);

  const load = () => api.get("/workflows").then(({ data }) => setWorkflows(data)).catch(() => setWorkflows([]));
  useEffect(() => { load(); }, []);

  const openRuns = async (wf) => {
    setRunsFor(wf);
    setRuns(null);
    const { data } = await api.get(`/runs?workflow_id=${wf.id}&limit=20`);
    setRuns(data);
  };

  const addStep = () => {
    if (!stepInput.trim()) return;
    if ((stepType === "webhook" || stepType === "slack") && !stepUrl.trim()) return;
    if (stepType === "email" && !stepTo.trim()) return;
    setSteps([...steps, {
      name: stepInput.trim(),
      type: stepType,
      url: stepType === "webhook" || stepType === "slack" ? stepUrl.trim() : null,
      to: stepType === "email" ? stepTo.trim() : null,
      message: stepMessage.trim() || null,
    }]);
    setStepInput("");
    setStepUrl("");
    setStepTo("");
    setStepMessage("");
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/workflows", { ...form, description: form.description || null, steps });
      toast.success("Workflow created");
      setOpen(false);
      setForm({ name: "", description: "", trigger: triggers[0] });
      setSteps([]);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    await api.patch(`/workflows/${id}/status`);
    load();
  };

  const run = async (id) => {
    setRunningId(id);
    try {
      const { data } = await api.post(`/workflows/${id}/run`);
      if (data.status === "success") toast.success(`Run completed in ${data.duration_ms}ms`);
      else {
        const failed = (data.steps_results || []).find((s) => s.status === "failed");
        toast.error(failed ? `Step "${failed.name}" failed: ${failed.detail}` : "Run failed");
      }
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setRunningId(null);
    }
  };

  const remove = async (id) => {
    await api.delete(`/workflows/${id}`);
    toast.success("Workflow deleted");
    load();
  };

  return (
    <div data-testid="workflows-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">Workflows</h1>
          <p className="text-muted-foreground">Build and run your automations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-workflow-button" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4 mr-2" /> New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">New workflow</DialogTitle>
              <DialogDescription>Pick a trigger and chain the steps to automate.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4 mt-2" data-testid="workflow-form">
              <Input data-testid="workflow-name-input" required placeholder="Workflow name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
              <Input data-testid="workflow-description-input" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Trigger</label>
                <select
                  data-testid="workflow-trigger-select"
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {triggers.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Steps</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <select
                    data-testid="workflow-step-type-select"
                    value={stepType}
                    onChange={(e) => setStepType(e.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:shrink-0"
                  >
                    <option value="action">Action (logged)</option>
                    <option value="webhook">Webhook (HTTP POST)</option>
                    <option value="slack">Slack message</option>
                    <option value="email">Send email</option>
                  </select>
                  <div className="flex gap-2 flex-1">
                    <Input data-testid="workflow-step-input" placeholder="Step name" value={stepInput} onChange={(e) => setStepInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }} className="rounded-xl" />
                    <Button type="button" data-testid="workflow-add-step-button" onClick={addStep} variant="outline" className="rounded-xl shrink-0">Add</Button>
                  </div>
                </div>
                {stepType === "webhook" && (
                  <Input data-testid="workflow-step-url-input" type="url" placeholder="https://webhook-url.example.com/hook" value={stepUrl} onChange={(e) => setStepUrl(e.target.value)} className="rounded-xl" />
                )}
                {steps.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {steps.map((s, i) => {
                      const Icon = stepIcons[s.type];
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-secondary px-3 py-1.5 rounded-full">
                          {Icon && <Icon className="w-3 h-3 text-accent" />}
                          {i + 1}. {s.name}
                          <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remove step">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={saving} data-testid="workflow-save-button" className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create workflow
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6" data-testid="workflows-list">
        {workflows === null ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : workflows.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-xl shadow-teal-900/5 dark:shadow-black/40">
            <p className="text-sm text-muted-foreground" data-testid="no-workflows-message">No workflows yet. Create your first automation.</p>
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} data-testid={`workflow-card-${wf.id}`} className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-xl shadow-teal-900/5 dark:shadow-black/40">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-serif text-xl tracking-tight">{wf.name}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${wf.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`} data-testid={`workflow-status-${wf.id}`}>
                      {wf.status}
                    </span>
                  </div>
                  {wf.description && <p className="text-sm text-muted-foreground">{wf.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" data-testid={`workflow-run-${wf.id}`} onClick={() => run(wf.id)} disabled={runningId === wf.id} className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
                    {runningId === wf.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span className="ml-1.5">Run</span>
                  </Button>
                  <button data-testid={`workflow-runs-${wf.id}`} onClick={() => openRuns(wf)} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors" aria-label="Run history">
                    <History className="w-4 h-4" />
                  </button>
                  <button data-testid={`workflow-toggle-${wf.id}`} onClick={() => toggle(wf.id)} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors" aria-label="Toggle status">
                    {wf.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button data-testid={`workflow-delete-${wf.id}`} onClick={() => remove(wf.id)} className="p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 flex-wrap">
                <span className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full">{wf.trigger}</span>
                {wf.steps.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="bg-secondary px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                      {s.type === "webhook" && <Link2 className="w-3 h-3 text-accent" />}
                      {s.name}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">{wf.runs_count} run{wf.runs_count === 1 ? "" : "s"}</p>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!runsFor} onOpenChange={(open) => !open && setRunsFor(null)}>
        <DialogContent className="rounded-2xl max-h-[80vh] overflow-y-auto" data-testid="workflow-runs-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Run history — {runsFor?.name}</DialogTitle>
            <DialogDescription>Last {runs?.length ?? "…"} runs with step-by-step results.</DialogDescription>
          </DialogHeader>
          {runs === null ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="no-runs-message">No runs yet for this workflow.</p>
          ) : (
            <div className="space-y-5">
              {runs.map((run) => (
                <div key={run.id} className="border border-border rounded-xl p-4" data-testid={`run-history-${run.id}`}>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()} · {run.duration_ms}ms · {run.triggered_by}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${run.status === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {run.status}
                    </span>
                  </div>
                  <RunSteps run={run} />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
