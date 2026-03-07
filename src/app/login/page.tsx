"use client";

import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/god-mode/dashboard");
      router.refresh();
    } catch {
      setError("Erreur de connexion inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--gm-bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "var(--gm-accent)" }}
          >
            <Lock size={28} className="text-white" />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--gm-text)" }}
          >
            Origin.e 360°
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
            Accès réservé — Équipe Origin.e
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "var(--gm-danger)",
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--gm-muted)" }}
            >
              Email
            </label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor: "var(--gm-border)",
              }}
            >
              <Mail size={16} style={{ color: "var(--gm-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@origin-e.ci"
                required
                className="bg-transparent text-sm outline-none w-full"
                style={{ color: "var(--gm-text)" }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--gm-muted)" }}
            >
              Mot de passe
            </label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor: "var(--gm-border)",
              }}
            >
              <Lock size={16} style={{ color: "var(--gm-muted)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-transparent text-sm outline-none w-full"
                style={{ color: "var(--gm-text)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: "var(--gm-muted)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--gm-accent)" }}
          >
            {loading ? "Connexion..." : "Accéder à Origin.e 360°"}
          </button>
        </form>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--gm-muted)" }}
        >
          Toutes les actions sont journalisées et auditées.
        </p>
      </div>
    </div>
  );
}
