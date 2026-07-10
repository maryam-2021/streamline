import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { api, formatApiErrorDetail } from "../../lib/api";

const empty = { name: "", email: "", company: "", status: "active" };

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/clients").then(({ data }) => setClients(data)).catch(() => setClients([]));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ name: c.name, email: c.email, company: c.company || "", status: c.status }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, company: form.company || null };
      if (editing) await api.put(`/clients/${editing}`, payload);
      else await api.post("/clients", payload);
      toast.success(editing ? "Client updated" : "Client added");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/clients/${id}`);
    toast.success("Client deleted");
    load();
  };

  return (
    <div data-testid="clients-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl tracking-tight mb-2">Clients</h1>
          <p className="text-muted-foreground">Manage your client roster.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-client-button" onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4 mr-2" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{editing ? "Edit client" : "New client"}</DialogTitle>
              <DialogDescription>{editing ? "Update client details." : "Add a client to your roster."}</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4 mt-2" data-testid="client-form">
              <Input data-testid="client-name-input" required placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
              <Input data-testid="client-email-input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
              <Input data-testid="client-company-input" placeholder="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-xl" />
              <select
                data-testid="client-status-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button type="submit" disabled={saving} data-testid="client-save-button" className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editing ? "Save changes" : "Add client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-teal-900/5 dark:shadow-black/40 divide-y divide-border" data-testid="clients-list">
        {clients === null ? (
          <p className="px-6 py-10 text-sm text-muted-foreground">Loading...</p>
        ) : clients.length === 0 ? (
          <p className="px-6 py-10 text-sm text-muted-foreground" data-testid="no-clients-message">No clients yet. Add your first client.</p>
        ) : (
          clients.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-4" data-testid={`client-row-${c.id}`}>
              <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {c.name[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.email}{c.company ? ` · ${c.company}` : ""}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${c.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {c.status}
              </span>
              <button data-testid={`client-edit-${c.id}`} onClick={() => openEdit(c)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button data-testid={`client-delete-${c.id}`} onClick={() => remove(c.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
