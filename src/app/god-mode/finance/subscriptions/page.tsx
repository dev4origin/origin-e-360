"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface License {
  id: string;
  license_key: string;
  fournisseur_id: string;
  tier: string;
  payment_period: string | null;
  starts_at: string;
  expires_at: string;
  activated_at: string | null;
  is_active: boolean;
  is_trial: boolean;
  auto_renew: boolean;
  created_at: string;
  org_name?: string;
  org_type?: string;
  subscription_status?: string;
}

interface SubscriptionTier {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  max_producers: number;
  price_monthly: number;
  price_quarterly: number;
  price_biannual: number;
  price_annual: number;
  features: unknown[];
  is_active: boolean;
}

interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  expired: number;
  cancelled: number;
  expiring_soon: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Actif",
    color: "var(--gm-success)",
    icon: <CheckCircle size={14} />,
  },
  trial: {
    label: "Essai",
    color: "var(--gm-accent)",
    icon: <Clock size={14} />,
  },
  expired: {
    label: "Expiré",
    color: "var(--gm-danger)",
    icon: <XCircle size={14} />,
  },
  cancelled: {
    label: "Annulé",
    color: "var(--gm-text-muted)",
    icon: <XCircle size={14} />,
  },
};

const TIER_COLORS: Record<string, string> = {
  trial: "#8b5cf6",
  starter: "#6366f1",
  pro: "#22c55e",
  enterprise: "#f59e0b",
  free: "#64748b",
};

function KpiCard({
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

export default function SubscriptionsPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"licenses" | "tiers">("licenses");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [licensesRes, tiersRes, orgsRes] = await Promise.all([
        supabase
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscription_tiers")
          .select("*")
          .order("price_monthly", { ascending: true }),
        supabase
          .from("fournisseurs")
          .select("id, nom, type, subscription_status"),
      ]);

      if (licensesRes.error) throw licensesRes.error;
      if (tiersRes.error) throw tiersRes.error;

      const orgsMap = new Map(
        (orgsRes.data || []).map(
          (o: {
            id: string;
            nom: string;
            type: string;
            subscription_status: string;
          }) => [
            o.id,
            { name: o.nom, type: o.type, status: o.subscription_status },
          ],
        ),
      );

      const enrichedLicenses = (licensesRes.data || []).map((l: License) => {
        const org = orgsMap.get(l.fournisseur_id) as
          | { name: string; type: string; status: string }
          | undefined;
        return {
          ...l,
          org_name: org?.name || "Organisation inconnue",
          org_type: org?.type || "",
          subscription_status: org?.status || "",
        };
      });

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

      const active = enrichedLicenses.filter(
        (l: License) => l.is_active && !l.is_trial,
      ).length;
      const trial = enrichedLicenses.filter(
        (l: License) => l.is_trial && l.is_active,
      ).length;
      const expired = enrichedLicenses.filter(
        (l: License) => !l.is_active && new Date(l.expires_at) < now,
      ).length;
      const expiringSoon = enrichedLicenses.filter(
        (l: License) =>
          l.is_active &&
          new Date(l.expires_at) <= thirtyDaysFromNow &&
          new Date(l.expires_at) > now,
      ).length;

      setLicenses(enrichedLicenses);
      setTiers(tiersRes.data || []);
      setStats({
        total: enrichedLicenses.length,
        active,
        trial,
        expired,
        cancelled: enrichedLicenses.length - active - trial - expired,
        expiring_soon: expiringSoon,
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

  const filteredLicenses = licenses.filter((l) => {
    const matchesSearch =
      !searchQuery ||
      l.org_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.license_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tier?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && l.is_active && !l.is_trial) ||
      (statusFilter === "trial" && l.is_trial && l.is_active) ||
      (statusFilter === "expired" && !l.is_active) ||
      (statusFilter === "expiring" &&
        l.is_active &&
        new Date(l.expires_at) <= new Date(Date.now() + 30 * 86400000));

    const matchesTier = tierFilter === "all" || l.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const getDaysRemaining = (expiresAt: string): number => {
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  };

  const formatPrice = (amount: number): string => {
    return amount.toLocaleString("fr-FR") + " FCFA";
  };

  const uniqueTiers = [...new Set(licenses.map((l) => l.tier))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Abonnements & Licences
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Gestion des licences et plans tarifaires
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
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total licences"
            value={stats.total}
            icon={<CreditCard size={20} />}
            color="#6366f1"
          />
          <KpiCard
            label="Actives"
            value={stats.active}
            icon={<CheckCircle size={20} />}
            color="#22c55e"
          />
          <KpiCard
            label="Essai gratuit"
            value={stats.trial}
            icon={<Clock size={20} />}
            color="#8b5cf6"
          />
          <KpiCard
            label="Expirées"
            value={stats.expired}
            icon={<XCircle size={20} />}
            color="#ef4444"
          />
          <KpiCard
            label="Expirent bientôt"
            value={stats.expiring_soon}
            icon={<ShieldAlert size={20} />}
            color="#f59e0b"
            subtitle="Sous 30 jours"
          />
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <button
            onClick={() => setActiveTab("licenses")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "licenses" ? "var(--gm-accent)" : "transparent",
              color:
                activeTab === "licenses" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <CreditCard size={14} />
            Licences ({licenses.length})
          </button>
          <button
            onClick={() => setActiveTab("tiers")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "tiers" ? "var(--gm-accent)" : "transparent",
              color: activeTab === "tiers" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <TrendingUp size={14} />
            Plans tarifaires ({tiers.length})
          </button>
        </div>

        {activeTab === "licenses" && (
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
              <option value="all">Tous statuts</option>
              <option value="active">Actives</option>
              <option value="trial">Essai</option>
              <option value="expired">Expirées</option>
              <option value="expiring">Expirent bientôt</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-transparent outline-none"
              style={{
                borderColor: "var(--gm-border)",
                color: "var(--gm-text)",
                backgroundColor: "var(--gm-surface)",
              }}
            >
              <option value="all">Tous plans</option>
              {uniqueTiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

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
                  width: "240px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Licenses Tab */}
      {activeTab === "licenses" && (
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
                <th>Organisation</th>
                <th>
                  <div className="flex items-center gap-1">
                    Plan <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Statut</th>
                <th>Période</th>
                <th>Expiration</th>
                <th>Jours restants</th>
                <th>Renouvellement</th>
              </tr>
            </thead>
            <tbody>
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Aucune licence trouvée
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => {
                  const days = getDaysRemaining(license.expires_at);
                  const isExpired = days < 0;
                  const isExpiringSoon = days >= 0 && days <= 30;

                  const statusKey = license.is_trial
                    ? "trial"
                    : license.is_active
                      ? "active"
                      : "expired";
                  const statusCfg =
                    STATUS_CONFIG[statusKey] || STATUS_CONFIG.expired;
                  const tierColor = TIER_COLORS[license.tier] || "#64748b";

                  return (
                    <tr key={license.id}>
                      <td>
                        <div>
                          <span
                            className="font-medium text-sm"
                            style={{ color: "var(--gm-text)" }}
                          >
                            {license.org_name}
                          </span>
                          <p
                            className="text-[11px]"
                            style={{ color: "var(--gm-text-muted)" }}
                          >
                            {license.org_type} •{" "}
                            {license.license_key?.slice(0, 12)}...
                          </p>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${tierColor}15`,
                            color: tierColor,
                          }}
                        >
                          {license.tier}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge flex items-center gap-1 w-fit"
                          style={{
                            backgroundColor: `${statusCfg.color}15`,
                            color: statusCfg.color,
                          }}
                        >
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ color: "var(--gm-text-muted)" }}>
                        {license.payment_period || "—"}
                      </td>
                      <td style={{ color: "var(--gm-text-muted)" }}>
                        {new Date(license.expires_at).toLocaleDateString(
                          "fr-FR",
                        )}
                      </td>
                      <td>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: isExpired
                              ? "var(--gm-danger)"
                              : isExpiringSoon
                                ? "var(--gm-warning)"
                                : "var(--gm-success)",
                          }}
                        >
                          {isExpired
                            ? `Expiré (${Math.abs(days)}j)`
                            : `${days}j`}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: license.auto_renew
                              ? "rgba(34, 197, 94, 0.12)"
                              : "rgba(136, 136, 164, 0.12)",
                            color: license.auto_renew
                              ? "var(--gm-success)"
                              : "var(--gm-text-muted)",
                          }}
                        >
                          {license.auto_renew ? "Auto" : "Manuel"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === "tiers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tiers.length === 0 ? (
            <div
              className="col-span-full text-center py-16"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucun plan tarifaire configuré
            </div>
          ) : (
            tiers.map((tier) => {
              const tierColor = TIER_COLORS[tier.tier] || "#64748b";
              const licensesForTier = licenses.filter(
                (l) => l.tier === tier.tier,
              );
              const activeLicenses = licensesForTier.filter(
                (l) => l.is_active,
              ).length;

              return (
                <div
                  key={tier.id}
                  className="rounded-xl p-5 border transition-all hover:border-indigo-500/30"
                  style={{
                    backgroundColor: "var(--gm-surface)",
                    borderColor: "var(--gm-border)",
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="text-lg font-bold"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {tier.name}
                        </h3>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${tierColor}15`,
                            color: tierColor,
                          }}
                        >
                          {tier.tier}
                        </span>
                      </div>
                      {tier.description && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {tier.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`status-dot ${tier.is_active ? "up" : "down"}`}
                    />
                  </div>

                  {/* Pricing Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: "Mensuel", value: tier.price_monthly },
                      { label: "Trimestriel", value: tier.price_quarterly },
                      { label: "Semestriel", value: tier.price_biannual },
                      { label: "Annuel", value: tier.price_annual },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className="rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: "var(--gm-bg)" }}
                      >
                        <p
                          className="text-[10px] mb-0.5"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {p.label}
                        </p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {p.value > 0 ? formatPrice(p.value) : "Gratuit"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div
                    className="flex items-center justify-between pt-3 border-t text-xs"
                    style={{ borderColor: "var(--gm-border)" }}
                  >
                    <span style={{ color: "var(--gm-text-muted)" }}>
                      Max {tier.max_producers} producteurs
                    </span>
                    <span style={{ color: tierColor }}>
                      {activeLicenses} licence{activeLicenses !== 1 ? "s" : ""}{" "}
                      active{activeLicenses !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
