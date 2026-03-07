"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { FinanceDashboard } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TIER_COLORS: Record<string, string> = {
  starter: "#6366f1",
  pro: "#22c55e",
  enterprise: "#f59e0b",
  trial: "#8b5cf6",
  free: "#64748b",
};

const PERIOD_MONTHLY: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
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
          <p className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
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

interface License {
  id: string;
  tier: string;
  payment_period: string;
  is_active: boolean;
  expires_at: string;
}

interface SubTier {
  tier: string;
  price_monthly: number;
  price_quarterly: number;
  price_biannual: number;
  price_annual: number;
}

interface PaymentProof {
  id: string;
  fournisseur_id: string;
  tier: string;
  amount: number;
  payment_method: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
}

interface Fournisseur {
  id: string;
  nom: string;
  subscription_status: string;
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all data in parallel
      const [licensesRes, tiersRes, fournisseursRes, paymentsRes] = await Promise.all([
        supabase.from("licenses").select("id, tier, payment_period, is_active, expires_at"),
        supabase.from("subscription_tiers").select("tier, price_monthly, price_quarterly, price_biannual, price_annual"),
        supabase.from("fournisseurs").select("id, nom, subscription_status"),
        supabase.from("payment_proofs").select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      if (licensesRes.error) throw licensesRes.error;
      if (tiersRes.error) throw tiersRes.error;
      if (fournisseursRes.error) throw fournisseursRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const licenses = (licensesRes.data || []) as License[];
      const tiers = (tiersRes.data || []) as SubTier[];
      const fournisseurs = (fournisseursRes.data || []) as Fournisseur[];
      const payments = (paymentsRes.data || []) as PaymentProof[];

      // Build a tier price map
      const tierPriceMap = new Map(tiers.map((t) => [t.tier, t]));
      const orgNameMap = new Map(fournisseurs.map((f) => [f.id, f.nom]));

      // Calculate MRR per active license
      const activeLicenses = licenses.filter((l) => l.is_active);

      const getMrr = (l: License): number => {
        const tp = tierPriceMap.get(l.tier);
        if (!tp) return 0;
        const period = l.payment_period || "monthly";
        switch (period) {
          case "monthly": return tp.price_monthly || 0;
          case "quarterly": return Math.round((tp.price_quarterly || 0) / 3);
          case "biannual": return Math.round((tp.price_biannual || 0) / 6);
          case "annual": return Math.round((tp.price_annual || 0) / 12);
          default: return 0;
        }
      };

      const getArr = (l: License): number => {
        const tp = tierPriceMap.get(l.tier);
        if (!tp) return 0;
        const period = l.payment_period || "monthly";
        switch (period) {
          case "monthly": return (tp.price_monthly || 0) * 12;
          case "quarterly": return (tp.price_quarterly || 0) * 4;
          case "biannual": return (tp.price_biannual || 0) * 2;
          case "annual": return tp.price_annual || 0;
          default: return 0;
        }
      };

      // Group by tier
      const byTierMap = new Map<string, { tier: string; count: number; mrr_contribution: number }>();
      activeLicenses.forEach((l) => {
        const existing = byTierMap.get(l.tier);
        const mrr = getMrr(l);
        if (existing) {
          existing.count += 1;
          existing.mrr_contribution += mrr;
        } else {
          byTierMap.set(l.tier, { tier: l.tier, count: 1, mrr_contribution: mrr });
        }
      });

      const totalMrr = activeLicenses.reduce((s, l) => s + getMrr(l), 0);
      const totalArr = activeLicenses.reduce((s, l) => s + getArr(l), 0);

      // Subscription status counts
      const subCounts = { active: 0, trial: 0, expired: 0, cancelled: 0 };
      fournisseurs.forEach((f) => {
        if (f.subscription_status in subCounts) {
          subCounts[f.subscription_status as keyof typeof subCounts] += 1;
        }
      });

      // Expiring soon (within 30 days)
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const expiringSoon = activeLicenses.filter(
        (l) => l.expires_at && new Date(l.expires_at) <= in30Days
      ).length;

      // Payments
      const pendingPayments = payments
        .filter((p) => p.status === "pending")
        .map((p) => ({
          id: p.id,
          org_name: orgNameMap.get(p.fournisseur_id) || "Organisation",
          tier: p.tier || "—",
          amount: p.amount || 0,
          method: p.payment_method || "—",
          created_at: p.created_at,
        }));

      const recentApproved = payments
        .filter((p) => p.status === "approved")
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          org_name: orgNameMap.get(p.fournisseur_id) || "Organisation",
          amount: p.amount || 0,
          reviewed_at: p.reviewed_at || p.created_at,
        }));

      const financeData: FinanceDashboard = {
        generated_at: new Date().toISOString(),
        revenue: {
          by_tier: Array.from(byTierMap.values()),
          total_mrr: totalMrr,
          arr: totalArr,
        },
        subscriptions: {
          ...subCounts,
          expiring_soon: expiringSoon,
        },
        payments: {
          pending: pendingPayments,
          recent_approved: recentApproved,
        },
      };

      setData(financeData);
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
        <p style={{ color: "var(--gm-text)" }}>
          {error || "Aucune donnée disponible"}
        </p>
        <button onClick={fetchData} className="btn-primary text-sm px-4 py-2">
          Réessayer
        </button>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Finance
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Revenus, abonnements et paiements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/god-mode/finance/metrics"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
            style={{
              color: "var(--gm-accent)",
              borderColor: "var(--gm-accent)",
            }}
            title="Métriques SaaS avancées"
          >
            <TrendingUp size={14} />
            Métriques
          </Link>
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
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={`${fmt(data.revenue.total_mrr)} FCFA`}
          icon={<TrendingUp size={20} />}
          color="#22c55e"
        />
        <StatCard
          label="ARR"
          value={`${fmt(data.revenue.arr)} FCFA`}
          icon={<DollarSign size={20} />}
          color="#6366f1"
        />
        <StatCard
          label="Abonnements actifs"
          value={String(data.subscriptions.active)}
          icon={<Users size={20} />}
          color="#f59e0b"
        />
        <StatCard
          label="Paiements en attente"
          value={String(data.payments.pending.length)}
          icon={<CreditCard size={20} />}
          color="#ef4444"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Tier - Bar Chart */}
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--gm-text)" }}
          >
            Revenus par Tier
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue.by_tier}>
                <XAxis
                  dataKey="tier"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${fmt(value)} FCFA`, "MRR"]}
                />
                <Bar dataKey="mrr_contribution" radius={[6, 6, 0, 0]}>
                  {data.revenue.by_tier.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={TIER_COLORS[entry.tier] || "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Breakdown - Pie Chart */}
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--gm-text)" }}
          >
            Répartition Abonnements
          </h2>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Actifs",
                      value: data.subscriptions.active,
                      color: "#22c55e",
                    },
                    {
                      name: "Essai",
                      value: data.subscriptions.trial,
                      color: "#6366f1",
                    },
                    {
                      name: "Expirés",
                      value: data.subscriptions.expired,
                      color: "#ef4444",
                    },
                    {
                      name: "Annulés",
                      value: data.subscriptions.cancelled,
                      color: "#64748b",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {["#22c55e", "#6366f1", "#ef4444", "#64748b"].map(
                    (color, i) => (
                      <Cell key={i} fill={color} />
                    ),
                  )}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {[
                {
                  label: "Actifs",
                  value: data.subscriptions.active,
                  color: "#22c55e",
                },
                {
                  label: "Essai",
                  value: data.subscriptions.trial,
                  color: "#6366f1",
                },
                {
                  label: "Expirés",
                  value: data.subscriptions.expired,
                  color: "#ef4444",
                },
                {
                  label: "Annulés",
                  value: data.subscriptions.cancelled,
                  color: "#64748b",
                },
                {
                  label: "Bientôt expirants",
                  value: data.subscriptions.expiring_soon,
                  color: "#f59e0b",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span style={{ color: "var(--gm-text-muted)" }}>{item.label}</span>
                  <span
                    className="ml-auto font-semibold"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments Table */}
      <div
        className="rounded-xl p-5 border"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--gm-text)" }}
        >
          Paiements en attente
        </h2>
        {data.payments.pending.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle
              size={32}
              className="mx-auto mb-2"
              style={{ color: "var(--gm-success)" }}
            />
            <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
              Aucun paiement en attente
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gm-table w-full">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Tier</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.pending.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ color: "var(--gm-text)" }}>
                      {payment.org_name}
                    </td>
                    <td>
                      <span className="badge-info">{payment.tier}</span>
                    </td>
                    <td style={{ color: "var(--gm-text)" }}>
                      {fmt(payment.amount)} FCFA
                    </td>
                    <td style={{ color: "var(--gm-text-muted)" }}>
                      {payment.method}
                    </td>
                    <td style={{ color: "var(--gm-text-muted)" }}>
                      {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs px-3 py-1">
                          Approuver
                        </button>
                        <button className="btn-ghost text-xs px-3 py-1">
                          Détails
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently Approved */}
      <div
        className="rounded-xl p-5 border"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--gm-text)" }}
        >
          Paiements récemment approuvés
        </h2>
        {data.payments.recent_approved.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Aucun paiement récent
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.payments.recent_approved.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ backgroundColor: "var(--gm-bg)" }}
              >
                <CheckCircle size={16} style={{ color: "var(--gm-success)" }} />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {p.org_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
                    {fmt(p.amount)} FCFA •{" "}
                    {new Date(p.reviewed_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
