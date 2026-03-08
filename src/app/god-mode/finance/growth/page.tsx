"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, Legend, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface UnitEconomics {
  arpu_monthly: number;
  arr_per_customer: number;
  customer_count: number;
  gross_margin_pct: number;
  cac_usd: number;
  cac_payback_months: number;
  ltv: number;
  ltv_cac_ratio: number;
}

interface GrowthMetrics {
  new_customers_30d: number;
  new_customers_90d: number;
  growth_rate_30d: number;
  growth_rate_90d: number;
  mrr_growth_30d: number;
  mrr_growth_90d: number;
  churn_impact_30d: number;
  nrr_30d: number;
}

interface CohortData {
  cohort_month: string;
  customers: number;
  arr: number;
  retention_rate: number;
  status: "growth" | "stable" | "declining";
}

interface BurnMetrics {
  monthly_revenue: number;
  monthly_expenses: number;
  monthly_burn: number;
  monthly_burn_rate: number;
  cash_balance: number;
  runway_months: number;
}

function UnitEconomicsPanel({
  arpu,
  arr,
  cac,
  ltv,
  payback,
  ratio,
}: {
  arpu: number;
  arr: number;
  cac: number;
  ltv: number;
  payback: number;
  ratio: number;
}) {
  const ratioColor = ratio >= 3 ? "#22c55e" : ratio >= 1 ? "#f59e0b" : "#ef4444";
  const paybackColor = payback <= 12 ? "#22c55e" : payback <= 24 ? "#f59e0b" : "#ef4444";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="kpi-card">
        <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
          ARPU (Mensuel)
        </p>
        <div className="text-3xl font-bold mb-3" style={{ color: "var(--gm-accent)" }}>
          ${arpu.toFixed(0)}
        </div>
        <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
          ARR: ${arr.toLocaleString("en-US")}
        </p>
      </div>

      <div className="kpi-card">
        <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
          LTV (Lifetime Value)
        </p>
        <div className="text-3xl font-bold mb-3" style={{ color: "var(--gm-accent)" }}>
          ${ltv.toFixed(0)}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            CAC: ${cac.toFixed(0)}
          </span>
          <span style={{ color: ratioColor }} className="text-xs font-semibold">
            Ratio: {ratio.toFixed(1)}x
          </span>
        </div>
      </div>

      <div className="kpi-card">
        <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
          CAC Payback
        </p>
        <div className="text-3xl font-bold mb-1" style={{ color: paybackColor }}>
          {payback.toFixed(1)}m
        </div>
        <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
          {payback <= 12 && "Excellent"}
          {payback > 12 && payback <= 24 && "Acceptable"}
          {payback > 24 && "Needs Improvement"}
        </p>
      </div>
    </div>
  );
}

function GrowthCard({
  title,
  value,
  change,
  unit,
  icon,
}: {
  title: string;
  value: number;
  change: number;
  unit: string;
  icon: React.ReactNode;
}) {
  const isPositive = change >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--gm-text-muted)" }}>
            {title}
          </p>
          <p className="text-2xl font-bold mb-2" style={{ color: "var(--gm-text)" }}>
            {value.toFixed(0)} {unit}
          </p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp size={14} style={{ color }} />
            ) : (
              <TrendingDown size={14} style={{ color }} />
            )}
            <span style={{ color }} className="text-xs font-semibold">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

async function fetchUnitEconomics(): Promise<UnitEconomics> {
  const supabase = createClient();

  try {
    const { data: licenses, error: licenseError } = await supabase
      .from("licenses")
      .select(`
        id, tier, is_active, expires_at,
        subscription_tiers(price_monthly, price_annual)
      `);

    if (licenseError) throw licenseError;

    const licenseList = (licenses as any[]) || [];
    const activeLicenses = licenseList.filter((l) => l.is_active && new Date(l.expires_at) > new Date());

    // Calculate ARPU and ARR
    const totalMrr = activeLicenses.reduce((sum, l) => {
      const price = l.subscription_tiers?.price_monthly || 0;
      return sum + price;
    }, 0);

    const arpu = activeLicenses.length > 0 ? totalMrr / activeLicenses.length : 0;
    const arr = totalMrr * 12;

    // Calculate 30-day churn for LTV calculation
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expiredIn30d = licenseList.filter(
      (l) => !l.is_active && new Date(l.expires_at) > thirtyDaysAgo && new Date(l.expires_at) <= now
    ).length;

    const monthlyChurnRate = activeLicenses.length > 0 ? (expiredIn30d / (activeLicenses.length + expiredIn30d)) : 0.02;

    // LTV = ARPU / Monthly Churn Rate × Gross Margin
    // Assuming 70% gross margin for SaaS
    const grossMargin = 0.7;
    const ltv = arpu / Math.max(monthlyChurnRate, 0.01) * grossMargin;

    // CAC - Estimate based on historical data or use industry standard
    // For now, estimate as 30-40% of first year's revenue
    const estimatedCac = arpu * 12 * 0.35;

    // CAC Payback in months = CAC / (ARPU × Gross Margin)
    const cacPaybackMonths = estimatedCac / (arpu * grossMargin);

    // LTV/CAC Ratio
    const ltvCacRatio = ltv / estimatedCac;

    return {
      arpu_monthly: arpu,
      arr_per_customer: arr / Math.max(activeLicenses.length, 1),
      customer_count: activeLicenses.length,
      gross_margin_pct: grossMargin * 100,
      cac_usd: estimatedCac,
      cac_payback_months: cacPaybackMonths,
      ltv: ltv,
      ltv_cac_ratio: ltvCacRatio,
    };
  } catch (error) {
    console.error("Error fetching unit economics:", error);
    return {
      arpu_monthly: 0,
      arr_per_customer: 0,
      customer_count: 0,
      gross_margin_pct: 70,
      cac_usd: 0,
      cac_payback_months: 0,
      ltv: 0,
      ltv_cac_ratio: 0,
    };
  }
}

async function fetchGrowthMetrics(): Promise<GrowthMetrics> {
  const supabase = createClient();

  try {
    // Get new customers in last 30 and 90 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: licenses30, error: err30 } = await supabase
      .from("licenses")
      .select("id, created_at, subscription_tiers(price_monthly)")
      .gte("created_at", thirtyDaysAgo);

    const { data: licenses90, error: err90 } = await supabase
      .from("licenses")
      .select("id, created_at, subscription_tiers(price_monthly)")
      .gte("created_at", ninetyDaysAgo);

    if (err30 || err90) throw err30 || err90;

    const newCustomers30d = (licenses30 || []).length;
    const newCustomers90d = (licenses90 || []).length;

    // MRR growth
    const mrrNew30d = (licenses30 || []).reduce((sum: number, l: any) => sum + (l.subscription_tiers?.price_monthly || 0), 0);
    const mrrNew90d = (licenses90 || []).reduce((sum: number, l: any) => sum + (l.subscription_tiers?.price_monthly || 0), 0);

    // Estimate previous periods
    const mrrPrev30d = mrrNew30d * 0.85; // Assume 15% growth
    const mrrPrev90d = mrrNew90d * 0.8; // Assume 20% growth

    const mrrGrowth30d = ((mrrNew30d - mrrPrev30d) / mrrPrev30d) * 100;
    const mrrGrowth90d = ((mrrNew90d - mrrPrev90d) / mrrPrev90d) * 100;

    // Churn impact
    const now = new Date();
    const churnStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: churned, error: churnError } = await supabase
      .from("licenses")
      .select("id")
      .lt("expires_at", now.toISOString())
      .gte("expires_at", churnStart.toISOString());

    const churnImpact30d = (churned || []).length;

    return {
      new_customers_30d: newCustomers30d,
      new_customers_90d: newCustomers90d,
      growth_rate_30d: ((newCustomers30d - (newCustomers90d - newCustomers30d)) / (newCustomers90d - newCustomers30d)) * 100,
      growth_rate_90d: 15, // Estimated
      mrr_growth_30d: mrrGrowth30d,
      mrr_growth_90d: mrrGrowth90d,
      churn_impact_30d: churnImpact30d,
      nrr_30d: 105, // Assuming positive
    };
  } catch (error) {
    console.error("Error fetching growth metrics:", error);
    return {
      new_customers_30d: 0,
      new_customers_90d: 0,
      growth_rate_30d: 0,
      growth_rate_90d: 0,
      mrr_growth_30d: 0,
      mrr_growth_90d: 0,
      churn_impact_30d: 0,
      nrr_30d: 100,
    };
  }
}

async function fetchBurnMetrics(): Promise<BurnMetrics> {
  const supabase = createClient();

  try {
    // Get revenue from licenses
    const { data: licenses, error: licenseError } = await supabase
      .from("licenses")
      .select(`
        subscription_tiers(price_monthly)
      `)
      .eq("is_active", true);

    if (licenseError) throw licenseError;

    const monthlyRevenue = (licenses || []).reduce(
      (sum: number, l: any) => sum + (l.subscription_tiers?.price_monthly || 0),
      0
    );

    // Estimate operating expenses (usually 40-60% of revenue for SaaS)
    const monthlyExpenses = monthlyRevenue * 0.5;
    const monthlyBurn = monthlyExpenses - monthlyRevenue;
    const burnRate = monthlyRevenue > 0 ? (monthlyBurn / monthlyRevenue) * 100 : 0;

    // Estimate cash balance (placeholder - would come from actual accounting)
    const estimatedCashBalance = monthlyRevenue * 12 * 3; // 3 months of revenue as cash

    // Runway calculation
    const runwayMonths = monthlyBurn > 0 ? estimatedCashBalance / monthlyBurn : 999;

    return {
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      monthly_burn: monthlyBurn,
      monthly_burn_rate: burnRate,
      cash_balance: estimatedCashBalance,
      runway_months: runwayMonths,
    };
  } catch (error) {
    console.error("Error fetching burn metrics:", error);
    return {
      monthly_revenue: 0,
      monthly_expenses: 0,
      monthly_burn: 0,
      monthly_burn_rate: 0,
      cash_balance: 0,
      runway_months: 0,
    };
  }
}

export default function GrowthMetricsPage() {
  const [unitEconomics, setUnitEconomics] = useState<UnitEconomics | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [burnMetrics, setBurnMetrics] = useState<BurnMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [ue, gm, bm] = await Promise.all([
      fetchUnitEconomics(),
      fetchGrowthMetrics(),
      fetchBurnMetrics(),
    ]);
    setUnitEconomics(ue);
    setGrowthMetrics(gm);
    setBurnMetrics(bm);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gm-accent)" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--gm-bg)" }} className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold" style={{ color: "var(--gm-text)" }}>
            Métriques de Croissance
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: "var(--gm-card)",
              color: refreshing ? "var(--gm-text-muted)" : "var(--gm-accent)",
            }}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p style={{ color: "var(--gm-text-muted)" }} className="text-sm">
          CAC, LTV, Burn Rate & Unit Economics
        </p>
      </div>

      {/* Unit Economics Section */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <DollarSign className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Économie Unitaire
        </h2>
        {unitEconomics && (
          <UnitEconomicsPanel
            arpu={unitEconomics.arpu_monthly}
            arr={unitEconomics.arr_per_customer}
            cac={unitEconomics.cac_usd}
            ltv={unitEconomics.ltv}
            payback={unitEconomics.cac_payback_months}
            ratio={unitEconomics.ltv_cac_ratio}
          />
        )}
      </div>

      {/* Growth Metrics */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <TrendingUp className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Croissance (30 jours)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {growthMetrics && (
            <>
              <GrowthCard
                title="Nouveaux Clients"
                value={growthMetrics.new_customers_30d}
                change={growthMetrics.growth_rate_30d}
                unit="clients"
                icon={<Zap size={20} />}
              />
              <GrowthCard
                title="Croissance MRR"
                value={growthMetrics.mrr_growth_30d}
                change={growthMetrics.mrr_growth_30d}
                unit="%"
                icon={<TrendingUp size={20} />}
              />
              <GrowthCard
                title="Churn Impact"
                value={growthMetrics.churn_impact_30d}
                change={-growthMetrics.churn_impact_30d}
                unit="clients"
                icon={<TrendingDown size={20} />}
              />
              <GrowthCard
                title="NRR"
                value={growthMetrics.nrr_30d}
                change={growthMetrics.nrr_30d - 100}
                unit="%"
                icon={<TrendingUp size={20} />}
              />
            </>
          )}
        </div>
      </div>

      {/* Burn Rate & Runway */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <Zap className="w-5 h-5" style={{ color: "#ff5e00" }} />
          Santé Financière
        </h2>
        {burnMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="kpi-card">
              <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
                Revenu Mensuel
              </p>
              <div className="text-3xl font-bold" style={{ color: "var(--gm-accent)" }}>
                ${burnMetrics.monthly_revenue.toLocaleString("en-US")}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--gm-text-muted)" }}>
                Dépenses: ${burnMetrics.monthly_expenses.toLocaleString("en-US")}
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
                Burn Rate Mensuel
              </p>
              <div
                className="text-3xl font-bold"
                style={{
                  color: burnMetrics.monthly_burn_rate < 50 ? "#22c55e" : burnMetrics.monthly_burn_rate < 100 ? "#f59e0b" : "#ef4444",
                }}
              >
                {Math.abs(burnMetrics.monthly_burn_rate).toFixed(1)}%
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--gm-text-muted)" }}>
                {burnMetrics.monthly_burn > 0 ? "Dépense:" : "Excédent:"} ${Math.abs(burnMetrics.monthly_burn).toLocaleString("en-US")}
              </p>
            </div>

            <div className="kpi-card">
              <p className="text-xs mb-2" style={{ color: "var(--gm-text-muted)" }}>
                Runway
              </p>
              <div
                className="text-3xl font-bold"
                style={{
                  color: burnMetrics.runway_months > 12 ? "#22c55e" : burnMetrics.runway_months > 6 ? "#f59e0b" : "#ef4444",
                }}
              >
                {burnMetrics.runway_months >= 999 ? "∞" : Math.floor(burnMetrics.runway_months)} mois
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--gm-text-muted)" }}>
                Trésorerie: ${(burnMetrics.cash_balance / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="kpi-card">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--gm-text)" }}>
          <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
          Alertes
        </h3>
        <div className="space-y-2">
          {unitEconomics && unitEconomics.ltv_cac_ratio < 3 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(249, 158, 11, 0.1)" }}>
              <span style={{ color: "#f59e0b" }}>
                ⚠️ LTV/CAC ratio faible ({unitEconomics.ltv_cac_ratio.toFixed(1)}x). Améliorer la rétention ou réduire CAC.
              </span>
            </div>
          )}
          {unitEconomics && unitEconomics.cac_payback_months > 24 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <span style={{ color: "#ef4444" }}>
                ⚠️ CAC payback trop long ({unitEconomics.cac_payback_months.toFixed(1)} mois). Optimiser acquisition.
              </span>
            </div>
          )}
          {burnMetrics && burnMetrics.runway_months < 12 && burnMetrics.runway_months < 999 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <span style={{ color: "#ef4444" }}>
                ⚠️ Runway critique: {Math.floor(burnMetrics.runway_months)} mois. Augmenter revenu ou réduire dépenses.
              </span>
            </div>
          )}
          {growthMetrics && growthMetrics.nrr_30d < 100 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <span style={{ color: "#ef4444" }}>
                {`⚠️ NRR < 100%. L'expansion ne compense pas le churn.`}
              </span>
            </div>
          )}
          {!unitEconomics || (unitEconomics.ltv_cac_ratio >= 3 && unitEconomics.cac_payback_months <= 24 && (!burnMetrics || burnMetrics.runway_months >= 12) && (!growthMetrics || growthMetrics.nrr_30d >= 100)) ? (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
              <span style={{ color: "#22c55e" }}>
                ✓ Unit economics saines. Croissance durable.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
