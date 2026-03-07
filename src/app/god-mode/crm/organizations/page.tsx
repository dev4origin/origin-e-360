"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  nom: string;
  type: string;
  subscription_status: string;
  departement: string;
  region: string;
  email_professionnel: string;
  nom_representant_legal: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  trial: "#3b82f6",
  expired: "#f59e0b",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trial: "Trial",
  expired: "Expiré",
  cancelled: "Annulé",
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("fournisseurs")
        .select("*")
        .order("nom", { ascending: true })
        .limit(500);
      if (err) throw err;
      setOrgs(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--gm-accent)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error}</p>
        <button onClick={fetchData} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  const types = [...new Set(orgs.map((o) => o.type).filter(Boolean))];

  const filtered = orgs.filter((o) => {
    const matchesType = typeFilter === "all" || o.type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      o.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.departement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.nom_representant_legal
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      o.email_professionnel?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Client 360°
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Sélectionnez une organisation pour voir sa fiche complète
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
          style={{
            color: "var(--gm-text-muted)",
            borderColor: "var(--gm-border)",
          }}
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Tous les types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            {filtered.length} organisations
          </span>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher une organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              width: "280px",
            }}
          />
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div
            className="col-span-full text-center py-12"
            style={{ color: "var(--gm-text-muted)" }}
          >
            Aucune organisation trouvée
          </div>
        ) : (
          filtered.map((org) => {
            const statusColor =
              STATUS_COLORS[org.subscription_status] || "#8888a4";
            const statusLabel =
              STATUS_LABELS[org.subscription_status] ||
              org.subscription_status ||
              "—";

            return (
              <Link
                key={org.id}
                href={`/god-mode/crm/organizations/${org.id}`}
                className="rounded-xl border p-5 space-y-3 transition-all hover:border-[var(--gm-accent)] hover:shadow-lg group"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: "var(--gm-surface-2)",
                        color: "var(--gm-accent)",
                      }}
                    >
                      {org.nom?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {org.nom}
                      </h3>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--gm-surface-2)",
                          color: "var(--gm-text-muted)",
                        }}
                      >
                        {org.type}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--gm-accent)" }}
                  />
                </div>

                <div
                  className="flex items-center gap-3 text-[11px]"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  {org.departement && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} /> {org.departement}
                    </span>
                  )}
                  {org.nom_representant_legal && (
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {org.nom_representant_legal}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <span
                    className="badge text-[10px]"
                    style={{
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                    }}
                  >
                    {statusLabel}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    {new Date(org.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
