import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { GoogleButton } from "./Login";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      setUser(data);
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-10" data-testid="register-logo">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="font-serif text-2xl tracking-tight">StreamLine</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 lg:p-10 shadow-xl shadow-teal-900/5 dark:shadow-black/40">
          <h1 className="font-serif text-3xl tracking-tight mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-8">Start automating in minutes — free</p>
          <form onSubmit={submit} className="space-y-5" data-testid="register-form">
            <Input data-testid="register-name-input" required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
            <Input data-testid="register-email-input" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            <Input data-testid="register-password-input" required type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-xl" />
            {error && <p data-testid="register-error" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} data-testid="register-submit-button" className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Account
            </Button>
          </form>
          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px bg-border flex-1" />
          </div>
          <GoogleButton />
          <p className="text-sm text-muted-foreground text-center mt-8">
            Already have an account?{" "}
            <Link to="/login" data-testid="register-login-link" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
