import { CheckCircle2, XCircle, Link2, Mail, MessageSquare, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

const typeIcon = { webhook: Link2, slack: MessageSquare, email: Mail, action: FileText };

export const RunSteps = ({ run }) => (
  <div className="space-y-2">
    {(run.steps_results || []).length === 0 && (
      <p className="text-xs text-muted-foreground">No step details recorded for this run.</p>
    )}
    {(run.steps_results || []).map((s, i) => {
      const Icon = typeIcon[s.type] || FileText;
      return (
        <div key={i} className="flex items-center gap-3 bg-secondary/60 rounded-xl px-4 py-3" data-testid={`run-step-${i}`}>
          {s.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-destructive shrink-0" />
          )}
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{i + 1}. {s.name}</p>
            <p className="text-xs text-muted-foreground truncate">{s.detail}</p>
          </div>
          <span className="text-xs capitalize text-muted-foreground">{s.type}</span>
        </div>
      );
    })}
  </div>
);

export const RunDetailsDialog = ({ run, onOpenChange }) => (
  <Dialog open={!!run} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl" data-testid="run-details-dialog">
      {run && (
        <>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{run.workflow_name}</DialogTitle>
            <DialogDescription>
              {new Date(run.started_at).toLocaleString()} · {run.duration_ms}ms · {run.triggered_by} ·{" "}
              <span className={run.status === "success" ? "text-primary" : "text-destructive"}>{run.status}</span>
            </DialogDescription>
          </DialogHeader>
          <RunSteps run={run} />
        </>
      )}
    </DialogContent>
  </Dialog>
);
