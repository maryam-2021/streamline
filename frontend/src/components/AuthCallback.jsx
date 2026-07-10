import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export const AuthCallback = () => {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const sessionId = new URLSearchParams(window.location.hash.substring(1)).get("session_id");
    if (!sessionId) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data);
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { state: { user: data } });
      } catch {
        setError("Sign-in failed. Please try again.");
        setTimeout(() => navigate("/login"), 2000);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="auth-callback">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        {error || "Signing you in..."}
      </div>
    </div>
  );
};
