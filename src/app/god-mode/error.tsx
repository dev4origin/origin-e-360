"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GodModeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <AlertTriangle size={48} style={{ color: "var(--gm-danger)" }} />
      <h2 className="text-lg font-bold" style={{ color: "var(--gm-text)" }}>
        Erreur inattendue
      </h2>
      <p
        className="text-sm max-w-md text-center"
        style={{ color: "var(--gm-text-muted)" }}
      >
        {error.message || "Une erreur est survenue."}
      </p>
      {error.digest && (
        <code
          className="text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--gm-surface-2)",
            color: "var(--gm-text-muted)",
          }}
        >
          Digest: {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: "var(--gm-accent)" }}
      >
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  );
}
