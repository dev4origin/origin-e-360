"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface License {
  id: string;
  fournisseur_id: string;
  tier: string;
  payment_period: string;
  is_active: boolean;
  expires_at: string;
  starts_at: string;
  created_at: string;
}

interface SubscriptionTier {
  tier: string;
  price_monthly: number;
  price_quarterly: number;
  price_biannual: number;
  price_annual: number;
}

interface RevenueDaily {
  report_date: string;
  new_subscriptions: number;
  churned_subscriptions: number;
  mrr_contribution: number;
  currency: string;
}

interface KPIData {
  arr: number;
  mrr: number;
  nrrPercent: number;
  churnRate: number;
  growthRate: number;
  activeCustomers: number;
  trendData: Array<{
    date: string;
    mrr: number;
    arr: number;
    churn: number;
  }>;
}

function StatCard({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = trend && trend >= 0;
  const trendColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: "var(--gm-text-muted)" }}>
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold" style={{ color: "var(--gm-text)" }}>
              {value}
            </p>
            {unit && (
              <span
                className="text-xs font-medium"
                style={{ color: "var(--gm-text-muted)" }}
              >
                {unit}
              </span>
            )}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <ArrowUp size={12} style={{ color: trendColor }} />
              ) : (
                <ArrowDown size={12} style={{ color: trendColor }} />
              )}
              <span className="text-[11px] font-medium" style={{ color: trendColor }}>
                {Math.abs(trend).toFixed(1)}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [licensesRes, tiersRes, revenueRes, fournisseursRes] = await Promise.all([
        supabase
          .from("licenses")
          .select("id, fournisseur_id, tier, payment_period, is_active, expires_at, starts_at, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("subscription_tiers").select("tier, price_monthly, price_quarterly, price_biannual, price_annual"),
        supabase
          .from("revenue_daily")
          .select("report_date, new_subscriptions, churned_subscriptions, mrr_contribution, currency")
          .order("report_date", { ascending: true })
          .limit(90),
        supabase.from("fournisseurs").select("id, subscription_status"),
      ]);

      if (licensesRes.error) throw licensesRes.error;
      if (tiersRes.error) throw tiersRes.error;
      if (revenueRes.error) throw revenueRes.error;

      const licenses = (licensesRes.data || []) as License[];
      const tiers = (tiersRes.data || []) as SubscriptionTier[];
      const revenue = (revenueRes.data || []) as RevenueDaily[];
      const fournisseurs = (fournisseursRes.data || []) as Array<{
        id: string;
        subscription_status: string;
      }>;

      // Build tier price map
      const tierPriceMap = new Map(
        tiers.map((t) => [
          t.tier,
          {
            monthly: t.price_monthly,
            quarterly: t.price_quarterly,
            biannual: t.price_biannual,
            annual: t.price_annual,
          },
        ]),
      );

      // Calculate ARR (Annual Recurring Revenue)
      const activeLicenses = licenses.filter((l) => l.is_active && new Date(l.expires_at) > new Date());
      let arr = 0;

      activeLicenses.forEach((license) => {
        const prices = tierPriceMap.get(license.tier);
        if (prices) {
          const period = (license.payment_period || "monthly") as "monthly" | "quarterly" | "biannual" | "annual";
          const monthlyValue = prices[period] / (period === "monthly" ? 1 : period === "quarterly" ? 3 : period === "biannual" ? 6 : 12);
          arr += monthlyValue * 12;
        }
      });

      // Calculate MRR (Monthly Recurring Revenue)
      const mrr = arr / 12;

      // Calculate Churn Rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRevenue = revenue.filter((r) => new Date(r.report_date) >= thirtyDaysAgo);
      const totalChurned = recentRevenue.reduce((sum, r) => sum + r.churned_subscriptions, 0);
      const totalNew = recentRevenue.reduce((sum, r) => sum + r.new_subscriptions, 0);
      const churnRate = activeLicenses.length > 0 ? (totalChurned / activeLicenses.length) * 100 : 0;

      // Calculate NRR (Net Revenue Retention)
      // Simplified: comparing last 30 days vs previous 30 days
      const mrrNow = recentRevenue.reduce((sum, r) => sum + r.mrr_contribution, 0) || mrr;
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 30);

      const prevRevenue = revenue.filter(
        (r) => new Date(r.report_date) >= sixtyDaysAgo && new Date(r.report_date) < twoMonthsAgo,
      );
      const mrrPrev = prevRevenue.reduce((sum, r) => sum + r.mrr_contribution, 0) || mrr;
      const nrrPercent = mrrPrev > 0 ? (mrrNow / mrrPrev) * 100 : 100;

      // Calculate Growth Rate (month-over-month)
      const lastMonth = revenue.filter((r) => new Date(r.report_date) >= thirtyDaysAgo);
      const currentMRR = lastMonth.reduce((sum, r) => sum + r.mrr_contribution, 0) || mrr;
      const growthRate = mrrPrev > 0 ? (((currentMRR - mrrPrev) / mrrPrev) * 100) : 0;

      // Active customers count
      const activeCustomers = new Set(
        licenses.filter((l) => l.is_active && new Date(l.expires_at) > new Date()).map((l) => l.fournisseur_id),
      ).size;

      // Build trend data (last 90 days)
      const trendData = revenue.map((r) => ({
        date: new Date(r.report_date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
        mrr: r.mrr_contribution || 0,
        arr: (r.mrr_contribution || 0) * 12,
        churn: r.churned_subscriptions || 0,
      }));

      setKpis({
        arr,
        mrr,
        nrrPercent,
        churnRate,
        growthRate,
        activeCustomers,
        trendData,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
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
        <button onClick={fetchMetrics} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Métriques SaaS
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            KPIs critiques pour la croissance et la santé de l'entreprise
          </p>
        </div>
        <button
          onClick={fetchMetrics}
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

      {/* Critical KPIs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--gm-text)" }}>
          🔴 Indicateurs Critiques
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="ARR (Revenus Annuels Récurrents)"
            value={Math.round(kpis.arr).toLocaleString("fr-FR")}
            unit="FCFA"
            icon={<TrendingUp size={20} />}
            color="#f59e0b"
          />
          <StatCard
            label="MRR (Revenus Mensuels Récurrents)"
            value={Math.round(kpis.mrr).toLocaleString("fr-FR")}
            unit="FCFA"
            icon={<TrendingUp size={20} />}
            color="#22c55e"
          />
          <StatCard
            label="NRR (Rétention Nette de Revenus)"
            value={kpis.nrrPercent.toFixed(1)}
            unit="%"
            icon={<TrendingUp size={20} />}
            color={kpis.nrrPercent > 110 ? "#22c55e" : kpis.nrrPercent > 100 ? "#f59e0b" : "#ef4444"}
            trend={kpis.nrrPercent - 100}
            trendLabel="vs baseline 100%"
          />
          <StatCard
            label="Churn Rate (Taux de Résiliation)"
            value={kpis.churnRate.toFixed(2)}
            unit="%"
            icon={<ArrowDown size={20} />}
            color={kpis.churnRate < 5 ? "#22c55e" : kpis.churnRate < 10 ? "#f59e0b" : "#ef4444"}
            trend={-kpis.churnRate}
            trendLabel="clients perdus"
          />
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--gm-text)" }}>
          📈 Croissance & Santé
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Croissance MRR (30j)"
            value={kpis.growthRate.toFixed(2)}
            unit="%"
            icon={<TrendingUp size={20} />}
            color={kpis.growthRate > 5 ? "#22c55e" : kpis.growthRate > 0 ? "#f59e0b" : "#ef4444"}
            trend={kpis.growthRate}
            trendLabel="vs mois précédent"
          />
          <StatCard
            label="Clients Actifs"
            value={kpis.activeCustomers}
            icon={<Users size={20} />}
            color="#6366f1"
          />
          <StatCard
            label="Santé Business"
            value={kpis.nrrPercent > 110 ? "Excellente" : kpis.nrrPercent > 100 ? "Bonne" : "Alerte"}
            icon={kpis.nrrPercent > 110 ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
            color={kpis.nrrPercent > 110 ? "#22c55e" : kpis.nrrPercent > 100 ? "#f59e0b" : "#ef4444"}
          />
        </div>
      </div>

      {/* Benchmarks */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
          📊 Benchmarks SaaS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--gm-text-muted)" }}>NRR Target</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>&gt; 110%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(kpis.nrrPercent / 1.2, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Actuel : {kpis.nrrPercent.toFixed(1)}% {kpis.nrrPercent > 110 ? "✅" : "⚠️"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--gm-text-muted)" }}>Churn Target</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>&lt; 5%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(kpis.churnRate / 0.05, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Actuel : {kpis.churnRate.toFixed(2)}% {kpis.churnRate < 5 ? "✅" : "⚠️"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--gm-text-muted)" }}>Growth Target</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>&gt; 5%/mois</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(Math.max(kpis.growthRate + 5, 0) / 10, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Actuel : {kpis.growthRate.toFixed(2)}% {kpis.growthRate > 5 ? "✅" : "⚠️"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--gm-text-muted)" }}>ARR Target</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>&gt; 0</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                style={{
                  width: `${Math.min((kpis.arr / 1000000) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Actuel : {(kpis.arr / 1000000).toFixed(2)}M FCFA
            </p>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--gm-text)" }}>
          📉 Tendances (90 jours)
        </h2>

        {/* MRR Trend */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--gm-text)" }}>
            MRR Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={kpis.trendData}>
              <XAxis
                dataKey="date"
                stroke="var(--gm-text-muted)"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="var(--gm-text-muted)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--gm-bg)",
                  border: "1px solid var(--gm-border)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Trend */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--gm-text)" }}>
            Churn Trend (clients perdus/jour)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={kpis.trendData}>
              <XAxis
                dataKey="date"
                stroke="var(--gm-text-muted)"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="var(--gm-text-muted)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--gm-bg)",
                  border: "1px solid var(--gm-border)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="churn"
                stroke="#ef4444"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      {(kpis.nrrPercent < 100 || kpis.churnRate > 5 || kpis.growthRate < 0) && (
        <div
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
          style={{}}
        >
          <h3
            className="text-sm font-semibold mb-2 flex items-center gap-2"
            style={{ color: "#f59e0b" }}
          >
            <AlertTriangle size={16} />
            Alertes
          </h3>
          <ul className="space-y-1 text-sm" style={{ color: "var(--gm-text-muted)" }}>
            {kpis.nrrPercent < 100 && (
              <li>
                ⚠️ NRR &lt; 100% : Les revenus diminuent. Attention au churn et expansion clients.
              </li>
            )}
            {kpis.churnRate > 5 && (
              <li>
                ⚠️ Churn &gt; 5% : Taux de résiliation élevé. À investiguer urgement.
              </li>
            )}
            {kpis.growthRate < 0 && (
              <li>
                ⚠️ Croissance négative : MRR en baisse. Renforcer acquisition et fidélisation.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
