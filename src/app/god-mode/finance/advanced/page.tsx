"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  RefreshCw,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ProductReview {
  id: string;
  product_id: string;
  rating: number;
  created_at: string;
  organization_id: string;
}

interface TierMetrics {
  tier: string;
  customers: number;
  arr: number;
  mrr: number;
  churn_rate: number;
  avg_ltv: number;
  health_score: number;
}

interface NPSData {
  nps_score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total_reviews: number;
  avg_rating: number;
  trend: Array<{
    period: string;
    nps: number;
    avg_rating: number;
  }>;
}

interface SegmentData {
  segment: string;
  customers: number;
  arr: number;
  churn_rate: number;
  nps: number;
  health: number;
  color: string;
}

function NPSCard({
  nps_score,
  promoters,
  passives,
  detractors,
}: {
  nps_score: number;
  promoters: number;
  passives: number;
  detractors: number;
}) {
  const total = promoters + passives + detractors;
  const npsColor = nps_score >= 50 ? "#22c55e" : nps_score >= 0 ? "#f59e0b" : "#ef4444";

  return (
    <div className="kpi-card">
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: "var(--gm-text)" }}
      >
        Net Promoter Score (NPS)
      </h3>
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <div className="text-4xl font-bold mb-2" style={{ color: npsColor }}>
            {nps_score}
          </div>
          <p className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            {nps_score >= 50 && "Excellent"}
            {nps_score >= 0 && nps_score < 50 && "Good"}
            {nps_score < 0 && "Needs Improvement"}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-500">
              {promoters}
            </div>
            <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Promoters
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-amber-500">
              {passives}
            </div>
            <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Passives
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-500">
              {detractors}
            </div>
            <div className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
              Detractors
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  customers,
  arr,
  mrr,
  churn_rate,
  health_score,
}: TierMetrics) {
  const healthColor =
    health_score >= 80 ? "#22c55e" : health_score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="kpi-card">
      <h3
        className="text-sm font-semibold mb-3 uppercase tracking-wide"
        style={{ color: "var(--gm-accent)" }}
      >
        {tier}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            Customers
          </span>
          <span className="font-semibold">{customers}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            ARR
          </span>
          <span className="font-semibold">${(arr / 1000).toFixed(0)}K</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            MRR
          </span>
          <span className="font-semibold">${(mrr / 1000).toFixed(1)}K</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "var(--gm-text-muted)" }}>
            Churn Rate
          </span>
          <span
            className={
              churn_rate > 5 ? "text-red-500 font-semibold" : "font-semibold"
            }
          >
            {churn_rate.toFixed(1)}%
          </span>
        </div>
        <div
          className="border-t border-opacity-10 pt-2 mt-2"
          style={{ borderColor: "var(--gm-border)" }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Santé</span>
            <span style={{ color: healthColor }} className="font-bold">
              {health_score.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 h-1.5 rounded mt-1">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${health_score}%`,
                backgroundColor: healthColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchNPSData(): Promise<NPSData> {
  const supabase = createClient();

  try {
    // Get reviews from last 90 days
    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select("id, rating, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .eq("is_published", true)
      .eq("moderation_status", "approved");

    if (error) throw error;

    const reviewList = reviews || [];
    const total = reviewList.length;

    if (total === 0) {
      return {
        nps_score: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        total_reviews: 0,
        avg_rating: 0,
        trend: [],
      };
    }

    // Calculate NPS components
    const promoters = reviewList.filter((r) => r.rating >= 5).length;
    const detractors = reviewList.filter((r) => r.rating <= 3).length;
    const passives = total - promoters - detractors;

    const nps_score = Math.round(((promoters - detractors) / total) * 100);
    const avg_rating = parseFloat(
      (reviewList.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1),
    );

    // Calculate 90-day trend (weekly)
    const trendMap = new Map<string, { count: number; ratingSum: number }>();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    reviewList.forEach((review) => {
      const reviewDate = new Date(review.created_at);
      const weekStart = new Date(reviewDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!trendMap.has(weekKey)) {
        trendMap.set(weekKey, { count: 0, ratingSum: 0 });
      }
      const week = trendMap.get(weekKey)!;
      week.count += 1;
      week.ratingSum += review.rating;
    });

    const trend = Array.from(trendMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-12)
      .map(([period, { count, ratingSum }]) => {
        const weekReviews = reviewList.filter((r) => {
          const reviewDate = new Date(r.created_at);
          const weekStart = new Date(reviewDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          return weekStart.toISOString().split("T")[0] === period;
        });

        const weekPromoters = weekReviews.filter((r) => r.rating >= 5).length;
        const weekDetractors = weekReviews.filter((r) => r.rating <= 3).length;
        const weekNps = Math.round(
          ((weekPromoters - weekDetractors) / count) * 100,
        );

        return {
          period: period.slice(5), // MM-DD format
          nps: weekNps,
          avg_rating: parseFloat((ratingSum / count).toFixed(1)),
        };
      });

    return {
      nps_score,
      promoters,
      passives,
      detractors,
      total_reviews: total,
      avg_rating,
      trend,
    };
  } catch (error) {
    console.error("Error fetching NPS:", error);
    return {
      nps_score: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      total_reviews: 0,
      avg_rating: 0,
      trend: [],
    };
  }
}

async function fetchTierMetrics(): Promise<TierMetrics[]> {
  const supabase = createClient();

  try {
    // Get tiers
    const { data: tiers, error: tierError } = await supabase
      .from("subscription_tiers")
      .select("tier, price_monthly");

    if (tierError) throw tierError;

    const tierList = tiers || [];

    // Get licenses
    const { data: licenses, error: licenseError } = await supabase
      .from("licenses")
      .select(
        `id, tier, fournisseur_id, is_active, expires_at, starts_at, created_at,
         subscription_tiers(price_monthly, price_annual)`,
      );

    if (licenseError) throw licenseError;

    const licenseList = (licenses as any[]) || [];

    // Calculate metrics per tier
    const tierMetrics = tierList.map((tier) => {
      const tierLicenses = licenseList.filter((l) => l.tier === tier.tier);
      const activeLicenses = tierLicenses.filter(
        (l) => l.is_active && new Date(l.expires_at) > new Date(),
      );

      // Calculate MRR/ARR
      const monthlyPrice = (tier.price_monthly || 0) * activeLicenses.length;
      const arr = monthlyPrice * 12;

      // Calculate churn (licenses that expired in last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const expiredLicenses = tierLicenses.filter(
        (l) =>
          !l.is_active &&
          new Date(l.expires_at) > thirtyDaysAgo &&
          new Date(l.expires_at) <= now,
      );

      const churnRate =
        activeLicenses.length > 0
          ? (expiredLicenses.length /
              (activeLicenses.length + expiredLicenses.length)) *
            100
          : 0;

      // Calculate health score (0-100)
      // Based on: customers (30%), arr (30%), churn inverse (30%), nps would be 10% but we estimate
      const avgHealth =
        (activeLicenses.length > 0 ? 30 : 0) +
        (arr > 1000 ? 30 : 0) +
        30 * Math.max(0, 1 - churnRate / 20); // Inverse churn

      return {
        tier: tier.tier,
        customers: activeLicenses.length,
        arr: arr,
        mrr: arr / 12,
        churn_rate: churnRate,
        avg_ltv: arr > 0 ? arr / (churnRate > 0 ? churnRate / 100 : 0.1) : 0,
        health_score: Math.min(100, Math.max(0, avgHealth)),
      };
    });

    return tierMetrics;
  } catch (error) {
    console.error("Error fetching tier metrics:", error);
    return [];
  }
}

async function fetchSegmentData(): Promise<SegmentData[]> {
  const supabase = createClient();

  try {
    const { data: licenses, error } = await supabase.from("licenses").select(
      `id, tier, fournisseur_id, is_active, expires_at, created_at,
         subscription_tiers(price_monthly)`,
    );

    if (error) throw error;

    const licenseList = (licenses as any[]) || [];

    // Group by tier
    const segmentMap = new Map<string, SegmentData>();

    licenseList.forEach((license) => {
      const tier = license.tier;
      const price = license.subscription_tiers?.price_monthly || 0;
      const isActive =
        license.is_active && new Date(license.expires_at) > new Date();

      if (!segmentMap.has(tier)) {
        const tierColors: { [key: string]: string } = {
          starter: "#3b82f6",
          pro: "#8b5cf6",
          enterprise: "#ff5e00",
        };

        segmentMap.set(tier, {
          segment: tier,
          customers: 0,
          arr: 0,
          churn_rate: 0,
          nps: 70, // Default, can be calculated per-segment
          health: 75,
          color: tierColors[tier.toLowerCase()] || "#6b7280",
        });
      }

      const segment = segmentMap.get(tier)!;
      if (isActive) {
        segment.customers += 1;
        segment.arr += price * 12;
      }
    });

    return Array.from(segmentMap.values()).filter((s) => s.customers > 0);
  } catch (error) {
    console.error("Error fetching segment data:", error);
    return [];
  }
}

export default function AdvancedMetricsPage() {
  const [npsData, setNpsData] = useState<NPSData | null>(null);
  const [tierMetrics, setTierMetrics] = useState<TierMetrics[]>([]);
  const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [nps, tiers, segments] = await Promise.all([
      fetchNPSData(),
      fetchTierMetrics(),
      fetchSegmentData(),
    ]);
    setNpsData(nps);
    setTierMetrics(tiers);
    setSegmentData(segments);
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
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--gm-accent)" }}
        />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--gm-bg)" }} className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--gm-text)" }}
          >
            Analyse Avancée
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
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <p style={{ color: "var(--gm-text-muted)" }} className="text-sm">
          NPS, Segments Clients & Santé des Tiers
        </p>
      </div>

      {/* NPS Section */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <Star className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
          Satisfaction Client
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {npsData && <NPSCard {...npsData} />}

          {/* NPS Trend Chart */}
          {npsData && npsData.trend.length > 0 && (
            <div className="kpi-card">
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--gm-text)" }}
              >
                Tendance NPS (90 jours)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={npsData.trend}>
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--gm-card)",
                      border: "1px solid var(--gm-border)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    stroke="#ff5e00"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tier Health Section */}
      <div className="mb-8">
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--gm-text)" }}
        >
          <BarChart3
            className="w-5 h-5"
            style={{ color: "var(--gm-accent)" }}
          />
          Santé par Tier
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tierMetrics.map((tier) => (
            <TierCard key={tier.tier} {...tier} />
          ))}
        </div>
      </div>

      {/* Segment Distribution Chart */}
      {segmentData.length > 0 && (
        <div className="mb-8">
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--gm-text)" }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--gm-accent)" }} />
            Distribution par Segment
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Distribution */}
            <div className="kpi-card">
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--gm-text)" }}
              >
                ARR par Segment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={segmentData}>
                  <XAxis
                    dataKey="segment"
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--gm-card)",
                      border: "1px solid var(--gm-border)",
                    }}
                  />
                  <Bar dataKey="arr" radius={[8, 8, 0, 0]}>
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Customer Distribution */}
            <div className="kpi-card">
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--gm-text)" }}
              >
                Clients par Segment
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={segmentData}>
                  <XAxis
                    dataKey="segment"
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--gm-text-muted)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--gm-card)",
                      border: "1px solid var(--gm-border)",
                    }}
                  />
                  <Bar dataKey="customers" radius={[8, 8, 0, 0]}>
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <div className="kpi-card">
        <h3
          className="text-sm font-semibold flex items-center gap-2 mb-4"
          style={{ color: "var(--gm-text)" }}
        >
          <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
          Alertes
        </h3>
        <div className="space-y-2">
          {npsData && npsData.nps_score < 30 && (
            <div
              className="text-sm p-3 rounded-lg"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              <span style={{ color: "#ef4444" }}>
                ⚠️ NPS critique: {npsData.nps_score}. Plus de 30% détracteurs.
              </span>
            </div>
          )}
          {tierMetrics.some((t) => t.churn_rate > 10) && (
            <div
              className="text-sm p-3 rounded-lg"
              style={{ background: "rgba(249, 158, 11, 0.1)" }}
            >
              <span style={{ color: "#f59e0b" }}>
                ⚠️ Churn élevé sur certains tiers. Vérifier la rétention.
              </span>
            </div>
          )}
          {tierMetrics.some((t) => t.health_score < 50) && (
            <div
              className="text-sm p-3 rounded-lg"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              <span style={{ color: "#ef4444" }}>
                ⚠️ Santé dégradée sur certains segments. Action requise.
              </span>
            </div>
          )}
          {!npsData ||
          (npsData.nps_score >= 30 &&
            tierMetrics.every((t) => t.churn_rate <= 10) &&
            tierMetrics.every((t) => t.health_score >= 50)) ? (
            <div
              className="text-sm p-3 rounded-lg"
              style={{ background: "rgba(34, 197, 94, 0.1)" }}
            >
              <span style={{ color: "#22c55e" }}>
                ✓ Tous les indicateurs sont dans les normes.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
