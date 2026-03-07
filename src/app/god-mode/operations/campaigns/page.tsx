"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  PauseCircle,
  Play,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  name?: string;
  year: number;
  status: string;
  date_debut: string;
  date_fin: string;
  created_at: string;
  cultures?: string[];
  metadata?: Record<string, unknown>;
}

const STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ACTIVE: { label: "Active", color: "#22c55e", icon: <Play size={12} /> },
  PLANNED: {
    label: "Planifiée",
    color: "#3b82f6",
    icon: <Calendar size={12} />,
  },
  COMPLETED: {
    label: "Terminée",
    color: "#8888a4",
    icon: <CheckCircle size={12} />,
  },
  PAUSED: {
    label: "Suspendue",
    color: "#f59e0b",
    icon: <PauseCircle size={12} />,
  },
};

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliveryCounts, setDeliveryCounts] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("campagnes")
        .select("*")
        .order("date_debut", { ascending: false });
      if (err) throw err;
      setCampaigns(data || []);

      // count deliveries per campaign (group by year match or id)
      const { data: livraisons } = await supabase
        .from("livraisons")
        .select("campagne_id")
        .limit(5000);
      const counts: Record<string, number> = {};
      (livraisons || []).forEach((l: { campagne_id: string }) => {
        if (l.campagne_id)
          counts[l.campagne_id] = (counts[l.campagne_id] || 0) + 1;
      });
      setDeliveryCounts(counts);
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

  const filtered = campaigns.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.year.toString().includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;
  const currentYear = new Date().getFullYear();
  const thisYearCount = campaigns.filter(
    (c) => c.year === currentYear || c.year === currentYear + 1,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Campagnes
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Gestion des campagnes agricoles
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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total campagnes"
          value={campaigns.length}
          icon={<MapPin size={20} />}
          color="#6366f1"
        />
        <KpiCard
          label="Campagnes actives"
          value={activeCount}
          icon={<Play size={20} />}
          color="#22c55e"
        />
        <KpiCard
          label="Cette année"
          value={thisYearCount}
          icon={<Calendar size={20} />}
          color="#3b82f6"
        />
        <KpiCard
          label="Total livraisons"
          value={Object.values(deliveryCounts).reduce((a, b) => a + b, 0)}
          icon={<TrendingUp size={20} />}
          color="#f59e0b"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              backgroundColor: "var(--gm-surface)",
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIVE">Actives</option>
            <option value="PLANNED">Planifiées</option>
            <option value="COMPLETED">Terminées</option>
            <option value="PAUSED">Suspendues</option>
          </select>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher une campagne..."
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

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div
            className="col-span-full text-center py-12"
            style={{ color: "var(--gm-text-muted)" }}
          >
            Aucune campagne trouvée
          </div>
        ) : (
          filtered.map((campaign) => {
            const statusCfg = STATUS_MAP[campaign.status] || STATUS_MAP.PLANNED;
            const livCount = deliveryCounts[campaign.id] || 0;
            const daysLeft = Math.max(
              0,
              Math.ceil(
                (new Date(campaign.date_fin).getTime() - Date.now()) / 86400000,
              ),
            );
            const isOngoing = campaign.status === "ACTIVE";

            return (
              <div
                key={campaign.id}
                className="rounded-xl border p-5 space-y-4 transition-colors hover:border-[var(--gm-accent)]"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor: "var(--gm-border)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      className="font-semibold text-sm"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {campaign.name ||
                        `Campagne ${campaign.year}/${(campaign.year % 100) + 1}`}
                    </h3>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Année {campaign.year}
                    </p>
                  </div>
                  <span
                    className="badge flex items-center gap-1"
                    style={{
                      backgroundColor: `${statusCfg.color}15`,
                      color: statusCfg.color,
                    }}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Début
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {new Date(campaign.date_debut).toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Fin
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {new Date(campaign.date_fin).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    <Users size={12} />
                    {livCount} livraisons
                  </span>
                  {isOngoing && (
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{
                        color:
                          daysLeft < 30
                            ? "var(--gm-warning)"
                            : "var(--gm-text-muted)",
                      }}
                    >
                      <Clock size={12} />
                      {daysLeft} jours restants
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
