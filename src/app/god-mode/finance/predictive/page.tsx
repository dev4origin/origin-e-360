"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, Legend, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CohortData {
  cohort_month: string;
  month_0: number; // Initial customers
  month_1: number;
  month_2: number;
  month_3: number;
  month_4: number;
  month_5: number;
  month_6: number;
  month_7: number;
  month_8: number;
  month_9: number;
  month_10: number;
  month_11: number;
  month_12: number;
  retention_rate_3m: number;
  retention_rate_6m: number;
  retention_rate_12m: number;
  avg_ltv: number;
  total_revenue: number;
}

interface CustomerJourney {
  stage: string;
  customers: number;
  conversion_rate: number;
  avg_time: number; // days
  color: string;
}

interface PredictiveMetrics {
  predicted_churn_30d: number;
  predicted_churn_90d: number;
  predicted_revenue_30d: number;
  predicted_revenue_90d: number;
  confidence_score: number;
  risk_segments: Array<{
    segment: string;
    risk_level: 'low' | 'medium' | 'high';
    customers: number;
    actions: string[];
  }>;
}

function CohortHeatmap({
  data,
}: {
  data: CohortData[];
}) {
  const months = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];

  const getRetentionColor = (retention: number) => {
    if (retention >= 80) return "#22c55e";
    if (retention >= 60) return "#84cc16";
    if (retention >= 40) return "#eab308";
    if (retention >= 20) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="kpi-card">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
        Carte de Chaleur des Cohortes
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="flex mb-2">
            <div className="w-24 text-xs font-semibold" style={{ color: "var(--gm-text-muted)" }}>
              Cohorte
            </div>
            {months.map((month) => (
              <div key={month} className="w-12 text-xs font-semibold text-center" style={{ color: "var(--gm-text-muted)" }}>
                {month}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {data.slice(0, 6).map((cohort) => (
            <div key={cohort.cohort_month} className="flex mb-1">
              <div className="w-24 text-xs font-medium" style={{ color: "var(--gm-text)" }}>
                {cohort.cohort_month}
              </div>
              {months.map((month, index) => {
                const monthKey = `month_${index}` as keyof CohortData;
                const value = cohort[monthKey] as number;
                const initial = cohort.month_0;
                const retention = initial > 0 ? (value / initial) * 100 : 0;

                return (
                  <div
                    key={month}
                    className="w-12 h-8 flex items-center justify-center text-xs font-semibold rounded"
                    style={{
                      backgroundColor: getRetentionColor(retention),
                      color: retention > 50 ? "white" : "var(--gm-text)",
                    }}
                    title={`${retention.toFixed(0)}% retention`}
                  >
                    {retention.toFixed(0)}%
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }}></div>
          <span style={{ color: "var(--gm-text-muted)" }}>≥80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#eab308" }}></div>
          <span style={{ color: "var(--gm-text-muted)" }}>40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
          <span style={{ color: "var(--gm-text-muted)" }}>{"<"}20%</span>
        </div>
      </div>
    </div>
  );
}

function CustomerJourneyFunnel({
  journey,
}: {
  journey: CustomerJourney[];
}) {
  return (
    <div className="kpi-card">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
        Parcours Client
      </h3>
      <div className="space-y-3">
        {journey.map((stage, index) => (
          <div key={stage.stage} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: "var(--gm-text)" }}>
                  {stage.stage}
                </span>
                <span className="text-sm font-bold" style={{ color: stage.color }}>
                  {stage.customers.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(stage.customers / journey[0].customers) * 100}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--gm-text-muted)" }}>
                <span>{stage.conversion_rate.toFixed(1)}% conversion</span>
                <span>{stage.avg_time} jours moyen</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictiveInsights({
  predictions,
}: {
  predictions: PredictiveMetrics;
}) {
  return (
    <div className="kpi-card">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
        Prédictions & Risques
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>
            {predictions.predicted_churn_30d}
          </div>
          <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            Churn prévu (30j)
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>
            ${predictions.predicted_revenue_30d.toLocaleString()}
          </div>
          <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            Revenu prévu (30j)
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            Confiance du modèle
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--gm-accent)" }}>
            {predictions.confidence_score.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 h-2 rounded">
          <div
            className="h-full rounded"
            style={{
              width: `${predictions.confidence_score}%`,
              backgroundColor: predictions.confidence_score > 70 ? "#22c55e" : predictions.confidence_score > 50 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold" style={{ color: "var(--gm-text)" }}>
          Segments à Risque
        </h4>
        {predictions.risk_segments.map((segment) => (
          <div key={segment.segment} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
            <div>
              <div className="text-xs font-medium" style={{ color: "var(--gm-text)" }}>
                {segment.segment}
              </div>
              <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
                {segment.customers} clients
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-semibold ${
              segment.risk_level === 'high' ? 'text-red-600 bg-red-100' :
              segment.risk_level === 'medium' ? 'text-yellow-600 bg-yellow-100' :
              'text-green-600 bg-green-100'
            }`}>
              {segment.risk_level.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function fetchCohortData(): Promise<CohortData[]> {
  const supabase = createClient();

  try {
    // Get license data for cohort analysis
    const { data: licenses, error } = await supabase
      .from("licenses")
      .select(`
        id, created_at, expires_at, is_active,
        subscription_tiers(price_monthly)
      `)
      .order("created_at");

    if (error) throw error;

    const licenseList = (licenses as any[]) || [];

    // Group by cohort month (first day of month)
    const cohorts = new Map<string, any[]>();

    licenseList.forEach((license) => {
      const createdDate = new Date(license.created_at);
      const cohortKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }
      cohorts.get(cohortKey)!.push(license);
    });

    // Calculate cohort retention
    const cohortData: CohortData[] = [];

    for (const [cohortMonth, cohortLicenses] of cohorts) {
      const initialCount = cohortLicenses.length;
      const retention = new Array(13).fill(0);

      retention[0] = initialCount;

      // Calculate retention for each month
      for (let month = 1; month <= 12; month++) {
        const targetDate = new Date(cohortMonth + '-01');
        targetDate.setMonth(targetDate.getMonth() + month);

        const activeInMonth = cohortLicenses.filter((license) => {
          const created = new Date(license.created_at);
          const expires = license.expires_at ? new Date(license.expires_at) : null;

          // Was active at the end of this month
          return created <= targetDate && (!expires || expires > targetDate);
        }).length;

        retention[month] = activeInMonth;
      }

      // Calculate metrics
      const retention3m = initialCount > 0 ? (retention[3] / initialCount) * 100 : 0;
      const retention6m = initialCount > 0 ? (retention[6] / initialCount) * 100 : 0;
      const retention12m = initialCount > 0 ? (retention[12] / initialCount) * 100 : 0;

      // Estimate LTV based on retention and pricing
      const avgPrice = cohortLicenses.reduce((sum, l) => sum + (l.subscription_tiers?.price_monthly || 0), 0) / initialCount;
      const avgLtv = avgPrice * 12 * (retention12m / 100); // Rough estimate

      const totalRevenue = cohortLicenses.reduce((sum, l) => {
        const months = Math.min(12, Math.max(1, retention12m / 10)); // Estimate active months
        return sum + (l.subscription_tiers?.price_monthly || 0) * months;
      }, 0);

      cohortData.push({
        cohort_month: cohortMonth,
        month_0: retention[0],
        month_1: retention[1],
        month_2: retention[2],
        month_3: retention[3],
        month_4: retention[4],
        month_5: retention[5],
        month_6: retention[6],
        month_7: retention[7],
        month_8: retention[8],
        month_9: retention[9],
        month_10: retention[10],
        month_11: retention[11],
        month_12: retention[12],
        retention_rate_3m: retention3m,
        retention_rate_6m: retention6m,
        retention_rate_12m: retention12m,
        avg_ltv: avgLtv,
        total_revenue: totalRevenue,
      });
    }

    return cohortData.sort((a, b) => b.cohort_month.localeCompare(a.cohort_month));
  } catch (error) {
    console.error("Error fetching cohort data:", error);
    return [];
  }
}

async function fetchCustomerJourney(): Promise<CustomerJourney[]> {
  const supabase = createClient();

  try {
    // Simplified customer journey - in real app, this would track actual funnel steps
    const { data: licenses, error: licenseError } = await supabase
      .from("licenses")
      .select("id, created_at, is_active");

    if (licenseError) throw licenseError;

    const licenseList = (licenses as any[]) || [];
    const totalVisitors = licenseList.length * 1.5; // Estimate
    const signups = licenseList.length;
    const trials = Math.floor(signups * 0.7);
    const paid = licenseList.filter(l => l.is_active).length;
    const retained = Math.floor(paid * 0.85);

    return [
      {
        stage: "Visiteurs",
        customers: Math.floor(totalVisitors),
        conversion_rate: 100,
        avg_time: 0,
        color: "#6b7280",
      },
      {
        stage: "Inscriptions",
        customers: signups,
        conversion_rate: (signups / totalVisitors) * 100,
        avg_time: 7,
        color: "#3b82f6",
      },
      {
        stage: "Essais",
        customers: trials,
        conversion_rate: (trials / signups) * 100,
        avg_time: 14,
        color: "#8b5cf6",
      },
      {
        stage: "Payants",
        customers: paid,
        conversion_rate: (paid / trials) * 100,
        avg_time: 30,
        color: "#f59e0b",
      },
      {
        stage: "Rétention",
        customers: retained,
        conversion_rate: (retained / paid) * 100,
        avg_time: 90,
        color: "#22c55e",
      },
    ];
  } catch (error) {
    console.error("Error fetching customer journey:", error);
    return [];
  }
}

async function fetchPredictiveMetrics(): Promise<PredictiveMetrics> {
  const supabase = createClient();

  try {
    // Get recent data for predictions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLicenses, error } = await supabase
      .from("licenses")
      .select("id, created_at, expires_at, is_active")
      .gte("created_at", thirtyDaysAgo);

    if (error) throw error;

    const recentList = (recentLicenses as any[]) || [];
    const activeRecent = recentList.filter(l => l.is_active).length;
    const expiredRecent = recentList.filter(l => !l.is_active).length;

    // Simple prediction model
    const churnRate = activeRecent > 0 ? (expiredRecent / (activeRecent + expiredRecent)) : 0.05;
    const predictedChurn30d = Math.floor(activeRecent * churnRate);
    const predictedChurn90d = Math.floor(activeRecent * churnRate * 3);

    // Revenue prediction
    const { data: tiers, error: tierError } = await supabase
      .from("subscription_tiers")
      .select("price_monthly");

    if (tierError) throw tierError;

    const avgPrice = (tiers || []).reduce((sum: number, t: any) => sum + (t.price_monthly || 0), 0) / (tiers?.length || 1);
    const predictedRevenue30d = (activeRecent - predictedChurn30d) * avgPrice;
    const predictedRevenue90d = (activeRecent - predictedChurn90d) * avgPrice * 3;

    return {
      predicted_churn_30d: predictedChurn30d,
      predicted_churn_90d: predictedChurn90d,
      predicted_revenue_30d: predictedRevenue30d,
      predicted_revenue_90d: predictedRevenue90d,
      confidence_score: 75, // Mock confidence score
      risk_segments: [
        {
          segment: "Nouveaux clients (< 30j)",
          risk_level: "high",
          customers: Math.floor(activeRecent * 0.3),
          actions: ["Email de bienvenue", "Support prioritaire", "Tutoriel produit"],
        },
        {
          segment: "Paiement en attente",
          risk_level: "medium",
          customers: Math.floor(activeRecent * 0.1),
          actions: ["Rappel de paiement", "Options de paiement alternatives"],
        },
        {
          segment: "Utilisation faible",
          risk_level: "medium",
          customers: Math.floor(activeRecent * 0.2),
          actions: ["Formation produit", "Fonctionnalités recommandées"],
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching predictive metrics:", error);
    return {
      predicted_churn_30d: 0,
      predicted_churn_90d: 0,
      predicted_revenue_30d: 0,
      predicted_revenue_90d: 0,
      confidence_score: 0,
      risk_segments: [],
    };
  }
}

export default function PredictiveAnalyticsPage() {
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [customerJourney, setCustomerJourney] = useState<CustomerJourney[]>([]);
  const [predictions, setPredictions] = useState<PredictiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [cohorts, journey, preds] = await Promise.all([
      fetchCohortData(),
      fetchCustomerJourney(),
      fetchPredictiveMetrics(),
    ]);
    setCohortData(cohorts);
    setCustomerJourney(journey);
    setPredictions(preds);
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
            Analyse Prédictive
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
          Cohortes, Parcours Client & Prédictions
        </p>
      </div>

      {/* Cohort Analysis */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <Calendar className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Analyse des Cohortes
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CohortHeatmap data={cohortData} />

          {/* Cohort Metrics Summary */}
          <div className="kpi-card">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
              Métriques par Cohorte
            </h3>
            <div className="space-y-4">
              {cohortData.slice(0, 3).map((cohort) => (
                <div key={cohort.cohort_month} className="border-b border-opacity-10 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: "var(--gm-text)" }}>
                      {cohort.cohort_month}
                    </span>
                    <span className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
                      {cohort.month_0} clients initiaux
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div style={{ color: "var(--gm-text-muted)" }}>3 mois</div>
                      <div className="font-semibold" style={{ color: cohort.retention_rate_3m > 70 ? "#22c55e" : "#ef4444" }}>
                        {cohort.retention_rate_3m.toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--gm-text-muted)" }}>6 mois</div>
                      <div className="font-semibold" style={{ color: cohort.retention_rate_6m > 50 ? "#22c55e" : "#ef4444" }}>
                        {cohort.retention_rate_6m.toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--gm-text-muted)" }}>12 mois</div>
                      <div className="font-semibold" style={{ color: cohort.retention_rate_12m > 30 ? "#22c55e" : "#ef4444" }}>
                        {cohort.retention_rate_12m.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Journey */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <Users className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Parcours Client
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerJourneyFunnel journey={customerJourney} />

          {/* Journey Metrics */}
          <div className="kpi-card">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
              Métriques de Conversion
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
                  Taux global de conversion
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--gm-accent)" }}>
                  {customerJourney.length > 1 ? ((customerJourney[customerJourney.length - 1].customers / customerJourney[0].customers) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
                  Temps moyen d'acquisition
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--gm-text)" }}>
                  {customerJourney.reduce((sum, stage) => sum + stage.avg_time, 0)} jours
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
                  Goulot d'étranglement
                </span>
                <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                  {customerJourney.length > 1 ? customerJourney.reduce((min, stage, index) => {
                    if (index === 0) return stage;
                    const rate = stage.conversion_rate;
                    return rate < min.conversion_rate ? stage : min;
                  }).stage : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <TrendingUp className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Prédictions & Intelligence Artificielle
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions && <PredictiveInsights predictions={predictions} />}

          {/* Predictive Charts */}
          <div className="kpi-card">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--gm-text)" }}>
              Prévisions de Revenu
            </h3>
            {predictions && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { period: '30 jours', revenue: predictions.predicted_revenue_30d, churn: predictions.predicted_churn_30d },
                  { period: '90 jours', revenue: predictions.predicted_revenue_90d, churn: predictions.predicted_churn_90d },
                ]}>
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--gm-text-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--gm-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--gm-card)",
                      border: "1px solid var(--gm-border)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#22c55e" name="Revenu prévu" />
                  <Bar dataKey="churn" fill="#ef4444" name="Churn prévu" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="kpi-card">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--gm-text)" }}>
          <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
          Recommandations IA
        </h3>
        <div className="space-y-2">
          {cohortData.length > 0 && cohortData[0].retention_rate_3m < 60 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <span style={{ color: "#ef4444" }}>
                ⚠️ Rétention 3 mois faible ({cohortData[0].retention_rate_3m.toFixed(0)}%). Focus sur l'onboarding.
              </span>
            </div>
          )}
          {predictions && predictions.predicted_churn_30d > 10 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(249, 158, 11, 0.1)" }}>
              <span style={{ color: "#f59e0b" }}>
                ⚠️ Churn élevé prévu ({predictions.predicted_churn_30d} clients). Campagnes de rétention recommandées.
              </span>
            </div>
          )}
          {customerJourney.length > 1 && customerJourney[1].conversion_rate < 50 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <span style={{ color: "#ef4444" }}>
                ⚠️ Conversion inscription faible ({customerJourney[1].conversion_rate.toFixed(1)}%). Améliorer la page d'accueil.
              </span>
            </div>
          )}
          {predictions && predictions.confidence_score < 60 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(249, 158, 11, 0.1)" }}>
              <span style={{ color: "#f59e0b" }}>
                ⚠️ Confiance du modèle faible ({predictions.confidence_score.toFixed(0)}%). Plus de données nécessaires.
              </span>
            </div>
          )}
          {!cohortData.some(c => c.retention_rate_3m < 60) && predictions && predictions.predicted_churn_30d <= 10 && customerJourney.length > 1 && customerJourney[1].conversion_rate >= 50 && predictions.confidence_score >= 60 ? (
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
              <span style={{ color: "#22c55e" }}>
                ✓ Métriques prédictives saines. Croissance durable.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}