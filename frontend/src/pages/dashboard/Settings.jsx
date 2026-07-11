import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function Settings() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const resend = async () => {
    try { const { data } = await api.post("/auth/resend-verification"); toast.success(data.message); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  const remove = async () => {
    try { await api.delete("/account", { data: { password: password || null, confirmation } }); setUser(false); navigate("/"); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return <div data-testid="settings-page"><h1 className="font-serif text-4xl mb-2">Account settings</h1><p className="text-muted-foreground mb-10">Manage account security and your StreamLine data.</p><section className="max-w-2xl rounded-2xl border border-border p-6 mb-8"><h2 className="font-serif text-2xl mb-2">Email verification</h2><p className="text-sm text-muted-foreground mb-4">{user?.email} · {user?.email_verified ? "Verified" : "Not verified"}</p>{!user?.email_verified && <Button variant="outline" onClick={resend}>Resend verification email</Button>}</section><section className="max-w-2xl rounded-2xl border border-destructive/40 p-6"><h2 className="font-serif text-2xl text-destructive mb-2">Delete account</h2><p className="text-sm text-muted-foreground mb-5">This permanently removes your clients, workflows, runs, sessions, and billing customer.</p><div className="space-y-3"><Input type="password" placeholder="Current password (if your account has one)" value={password} onChange={(e) => setPassword(e.target.value)} /><Input placeholder="Type DELETE to confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /><Button variant="destructive" disabled={confirmation !== "DELETE"} onClick={remove}>Permanently delete account</Button></div></section></div>;
}
