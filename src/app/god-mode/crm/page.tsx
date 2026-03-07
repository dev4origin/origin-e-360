"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Fournisseur {
  id: string;
  nom: string;
  type: string;
  departement: string | null;
  region: string | null;
  statut_kyc: string;
  subscription_status: string;
  email_professionnel: string | null;
  nom_representant_legal: string | null;
  created_at: string;
}

const KYC_COLORS: Record<string, string> = {
  VERIFIED: "badge-success",
  PENDING: "badge-warning",
  REJECTED: "badge-danger",
};

const KYC_LABELS: Record<string, string> = {
  VERIFIED: "Vérifié",
  PENDING: "En attente",
  REJECTED: "Rejeté",
};

export default function CRMPage() {
  const [orgs, setOrgs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      let query = supabase
        .from("fournisseurs")
        .select(
          "id, nom, type, departement, region, statut_kyc, subscription_status, email_professionnel, nom_representant_legal, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data } = await query;
      setOrgs((data as Fournisseur[]) ?? []);
      setLoading(false);
    };
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const filtered = orgs.filter((o) =>
    o.nom.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats summary
  const stats = {
    total: orgs.length,
    cooperatives: orgs.filter((o) => o.type === "cooperative").length,
    exportateurs: orgs.filter((o) => o.type === "exportateur").length,
    kycVerified: orgs.filter((o) => o.statut_kyc === "VERIFIED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
          CRM — Fournisseurs
        </h1>
        <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
          Gestion et suivi de toutes les organisations de l&apos;écosystème
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "var(--gm-accent)" },
          {
            label: "Coopératives",
            value: stats.cooperatives,
            color: "var(--gm-success)",
          },
          {
            label: "Exportateurs",
            value: stats.exportateurs,
            color: "var(--gm-info)",
          },
          {
            label: "KYC Vérifié",
            value: stats.kycVerified,
            color: "var(--gm-warning)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              {s.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-sm"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <Search size={16} style={{ color: "var(--gm-text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: "var(--gm-text)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--gm-text-muted)" }} />
          {[
            "all",
            "cooperative",
            "exportateur",
            "industriel",
            "ong",
            "etat",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t ? "text-white" : ""
              }`}
              style={{
                backgroundColor:
                  typeFilter === t ? "var(--gm-accent)" : "var(--gm-surface)",
                color: typeFilter === t ? "white" : "var(--gm-text-muted)",
              }}
            >
              {t === "all" ? "Tous" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--gm-accent)" }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle
            size={32}
            className="mx-auto mb-2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <p style={{ color: "var(--gm-text-muted)" }}>
            Aucun fournisseur trouvé
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <table className="gm-table w-full">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Département</th>
                <th>Abonnement</th>
                <th>KYC</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "rgba(99,102,241,0.1)" }}
                      >
                        <Building2
                          size={14}
                          style={{ color: "var(--gm-accent)" }}
                        />
                      </div>
                      <div>
                        <span
                          className="text-sm font-medium block"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {org.nom}
                        </span>
                        {org.nom_representant_legal && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--gm-text-muted)" }}
                          >
                            {org.nom_representant_legal}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-info text-xs">{org.type}</span>
                  </td>
                  <td style={{ color: "var(--gm-text-muted)" }}>
                    {org.departement || "—"}
                  </td>
                  <td>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          org.subscription_status === "active"
                            ? "rgba(34,197,94,0.15)"
                            : org.subscription_status === "trial"
                              ? "rgba(59,130,246,0.15)"
                              : org.subscription_status === "expired"
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(239,68,68,0.15)",
                        color:
                          org.subscription_status === "active"
                            ? "var(--gm-success)"
                            : org.subscription_status === "trial"
                              ? "var(--gm-info)"
                              : org.subscription_status === "expired"
                                ? "var(--gm-warning)"
                                : "var(--gm-danger)",
                      }}
                    >
                      {org.subscription_status === "active"
                        ? "Actif"
                        : org.subscription_status === "trial"
                          ? "Trial"
                          : org.subscription_status === "expired"
                            ? "Expiré"
                            : "Annulé"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={KYC_COLORS[org.statut_kyc] || "badge-info"}
                    >
                      {KYC_LABELS[org.statut_kyc] || org.statut_kyc}
                    </span>
                  </td>
                  <td style={{ color: "var(--gm-text-muted)" }}>
                    {new Date(org.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td>
                    <Link
                      href={`/god-mode/crm/organizations/${org.id}`}
                      className="flex items-center gap-1 text-xs font-medium"
                      style={{ color: "var(--gm-accent)" }}
                    >
                      360° <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
