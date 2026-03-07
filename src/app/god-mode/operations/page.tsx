"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowUpDown,
  Box,
  Calendar,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Scale,
  Search,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

interface OperationsData {
  campaigns: {
    id: string;
    year: string;
    date_debut: string;
    date_fin: string;
    status: string;
    created_at: string;
  }[];
  deliveries_today: number;
  deliveries_week: number;
  total_volume_kg: number;
  active_partnerships: number;
  batches_in_transit: number;
  recent_deliveries: {
    id: string;
    date_livraison: string;
    poids_kg: number;
    validation_status: string;
    producteur_nom?: string;
    cooperative_nom?: string;
  }[];
  batches: {
    id: string;
    batch_code: string;
    status: string;
    total_weight_kg: number;
    created_at: string;
    owner_name?: string;
  }[];
}

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--gm-text-muted)" }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--gm-text)" }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] mt-1" style={{ color }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function OperationsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "deliveries" | "batches" | "campaigns"
  >("deliveries");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .split("T")[0];

      const [
        campaignsRes,
        deliveriesTodayRes,
        deliveriesWeekRes,
        recentDeliveriesRes,
        partnershipsRes,
        batchesRes,
        volumeRes,
      ] = await Promise.all([
        supabase
          .from("campagnes")
          .select("id, year, date_debut, date_fin, status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("livraisons")
          .select("id", { count: "exact", head: true })
          .eq("date_livraison", today),
        supabase
          .from("livraisons")
          .select("id", { count: "exact", head: true })
          .gte("date_livraison", weekAgo),
        supabase
          .from("livraisons")
          .select("id, date_livraison, poids_kg, validation_status")
          .order("date_livraison", { ascending: false })
          .limit(50),
        supabase
          .from("partner_relationships")
          .select("id", { count: "exact", head: true })
          .eq("status", "ACTIVE"),
        supabase
          .from("trace_batches")
          .select("id, batch_code, status, total_weight_kg, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("livraisons")
          .select("poids_kg")
          .gte("date_livraison", "2025-10-01"),
      ]);

      const totalVolume = (volumeRes.data || []).reduce(
        (sum: number, d: { poids_kg: number }) => sum + (d.poids_kg || 0),
        0,
      );

      const batchesInTransit = (batchesRes.data || []).filter(
        (b: { status: string }) => b.status === "TRANSIT",
      ).length;

      setData({
        campaigns: campaignsRes.data || [],
        deliveries_today: deliveriesTodayRes.count || 0,
        deliveries_week: deliveriesWeekRes.count || 0,
        total_volume_kg: totalVolume,
        active_partnerships: partnershipsRes.count || 0,
        batches_in_transit: batchesInTransit,
        recent_deliveries: recentDeliveriesRes.data || [],
        batches: batchesRes.data || [],
      });
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

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={40} style={{ color: "var(--gm-danger)" }} />
        <p style={{ color: "var(--gm-text)" }}>{error || "Aucune donnée"}</p>
        <button onClick={fetchData} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "var(--gm-success)",
    COMPLETED: "var(--gm-info)",
    PLANNED: "var(--gm-warning)",
    TRANSIT: "var(--gm-warning)",
    DELIVERED: "var(--gm-success)",
    PROCESSING: "var(--gm-accent)",
    Validated: "var(--gm-success)",
    Pending: "var(--gm-warning)",
    Rejected: "var(--gm-danger)",
  };

  const filteredDeliveries = data.recent_deliveries.filter(
    (d) =>
      !searchQuery ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.validation_status?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredBatches = data.batches.filter(
    (b) =>
      !searchQuery ||
      b.batch_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.status?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Opérations & Traçabilité
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Suivi des livraisons, lots et campagnes
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Livraisons aujourd'hui"
          value={data.deliveries_today}
          icon={<Truck size={20} />}
          color="#6366f1"
        />
        <StatCard
          label="Livraisons / semaine"
          value={data.deliveries_week}
          icon={<Calendar size={20} />}
          color="#22c55e"
        />
        <StatCard
          label="Volume campagne"
          value={`${(data.total_volume_kg / 1000).toFixed(1)}t`}
          icon={<Scale size={20} />}
          color="#f59e0b"
          subtitle={`${data.total_volume_kg.toLocaleString("fr-FR")} kg`}
        />
        <StatCard
          label="Lots en transit"
          value={data.batches_in_transit}
          icon={<Box size={20} />}
          color="#8b5cf6"
        />
        <StatCard
          label="Partenariats actifs"
          value={data.active_partnerships}
          icon={<MapPin size={20} />}
          color="#22c55e"
        />
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          {(
            [
              {
                key: "deliveries",
                label: "Livraisons",
                icon: <Truck size={14} />,
              },
              { key: "batches", label: "Lots", icon: <Package size={14} /> },
              {
                key: "campaigns",
                label: "Campagnes",
                icon: <Calendar size={14} />,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor:
                  activeTab === tab.key ? "var(--gm-accent)" : "transparent",
                color: activeTab === tab.key ? "white" : "var(--gm-text-muted)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              width: "260px",
            }}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "deliveries" && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <table className="gm-table">
            <thead>
              <tr>
                <th>
                  <div className="flex items-center gap-1">
                    Date <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Poids (kg)</th>
                <th>Statut</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Aucune livraison trouvée
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((d) => (
                  <tr key={d.id}>
                    <td style={{ color: "var(--gm-text)" }}>
                      {new Date(d.date_livraison).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{ color: "var(--gm-text)" }}>
                      {d.poids_kg?.toLocaleString("fr-FR")}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${statusColors[d.validation_status] || "var(--gm-text-muted)"}15`,
                          color:
                            statusColors[d.validation_status] ||
                            "var(--gm-text-muted)",
                        }}
                      >
                        {d.validation_status || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {d.id.slice(0, 8)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "batches" && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <table className="gm-table">
            <thead>
              <tr>
                <th>Code lot</th>
                <th>Statut</th>
                <th>Poids (kg)</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Aucun lot trouvé
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span
                        className="font-mono text-sm"
                        style={{ color: "var(--gm-accent)" }}
                      >
                        {b.batch_code || b.id.slice(0, 12)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${statusColors[b.status] || "var(--gm-text-muted)"}15`,
                          color:
                            statusColors[b.status] || "var(--gm-text-muted)",
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--gm-text)" }}>
                      {b.total_weight_kg?.toLocaleString("fr-FR") || "—"}
                    </td>
                    <td style={{ color: "var(--gm-text-muted)" }}>
                      {new Date(b.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.campaigns.length === 0 ? (
            <div
              className="col-span-full text-center py-12"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucune campagne trouvée
            </div>
          ) : (
            data.campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-5 border transition-all hover:border-indigo-500/30"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--gm-text)" }}
                  >
                    Campagne {c.year}
                  </span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${statusColors[c.status] || "var(--gm-text-muted)"}15`,
                      color: statusColors[c.status] || "var(--gm-text-muted)",
                    }}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--gm-text-muted)" }}>Début</span>
                    <span style={{ color: "var(--gm-text)" }}>
                      {c.date_debut
                        ? new Date(c.date_debut).toLocaleDateString("fr-FR")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--gm-text-muted)" }}>Fin</span>
                    <span style={{ color: "var(--gm-text)" }}>
                      {c.date_fin
                        ? new Date(c.date_fin).toLocaleDateString("fr-FR")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
