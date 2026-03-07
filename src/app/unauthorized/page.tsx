import { ShieldOff } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--gm-bg)" }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
        >
          <ShieldOff size={36} style={{ color: "var(--gm-danger)" }} />
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--gm-text)" }}
        >
          Accès Refusé
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--gm-muted)" }}>
          Votre compte n&apos;est pas autorisé à accéder à Origin.e 360°.
          Contactez un administrateur si vous pensez qu&apos;il s&apos;agit
          d&apos;une erreur.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--gm-accent)" }}
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
