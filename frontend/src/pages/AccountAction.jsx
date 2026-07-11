import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const { data } = await api.post("/auth/forgot-password", { email });
    setMessage(data.message);
  };
  return <AccountCard title="Reset your password"><form onSubmit={submit} className="space-y-4"><Input required type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} /><Button className="w-full rounded-xl">Send reset link</Button>{message && <p className="text-sm text-primary">{message}</p>}</form></AccountCard>;
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try { const { data } = await api.post("/auth/reset-password", { token: params.get("token") || "", password }); setMessage(data.message); }
    catch (e) { setError(formatApiErrorDetail(e.response?.data?.detail)); }
  };
  return <AccountCard title="Choose a new password"><form onSubmit={submit} className="space-y-4"><Input required minLength={10} type="password" placeholder="Minimum 10 characters" value={password} onChange={(e) => setPassword(e.target.value)} /><Button className="w-full rounded-xl">Update password</Button>{message && <p className="text-sm text-primary">{message}</p>}{error && <p className="text-sm text-destructive">{error}</p>}</form></AccountCard>;
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email…");
  useEffect(() => { api.post("/auth/verify-email", { token: params.get("token") || "" }).then(({ data }) => setMessage(data.message)).catch((e) => setMessage(formatApiErrorDetail(e.response?.data?.detail))); }, [params]);
  return <AccountCard title="Email verification"><p className="text-muted-foreground mb-5">{message}</p><Link className="text-primary hover:underline" to="/login">Continue to sign in</Link></AccountCard>;
}

function AccountCard({ title, children }) {
  return <main className="min-h-screen bg-background grid place-items-center p-6"><section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl"><Link to="/" className="font-serif text-2xl text-primary">StreamLine</Link><h1 className="font-serif text-3xl mt-8 mb-6">{title}</h1>{children}</section></main>;
}
