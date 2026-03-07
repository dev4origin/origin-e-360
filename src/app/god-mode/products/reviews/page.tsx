"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  is_approved: boolean | null;
  moderation_status: string;
  helpful_count: number;
  created_at: string;
  product_name?: string;
  user_name?: string;
}

const MODERATION_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "#f59e0b" },
  approved: { label: "Approuvé", color: "#22c55e" },
  rejected: { label: "Rejeté", color: "#ef4444" },
  flagged: { label: "Signalé", color: "#f97316" },
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (err) throw err;

      // Fetch product names
      const productIds = [
        ...new Set(
          (data || []).map((r: Review) => r.product_id).filter(Boolean),
        ),
      ];
      let productMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("origin_products")
          .select("id, name")
          .in("id", productIds.slice(0, 100));
        productMap = new Map(
          (products || []).map((p: { id: string; name: string }) => [
            p.id,
            p.name,
          ]),
        );
      }

      // Fetch user names
      const userIds = [
        ...new Set((data || []).map((r: Review) => r.user_id).filter(Boolean)),
      ];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds.slice(0, 100));
        userMap = new Map(
          (profiles || []).map((p: { id: string; full_name: string }) => [
            p.id,
            p.full_name,
          ]),
        );
      }

      setReviews(
        (data || []).map((r: Review) => ({
          ...r,
          product_name: productMap.get(r.product_id) || "Produit supprimé",
          user_name: userMap.get(r.user_id) || "Utilisateur",
        })),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async (
    reviewId: string,
    action: "approved" | "rejected",
  ) => {
    setProcessing(reviewId);
    try {
      const { error: err } = await supabase
        .from("product_reviews")
        .update({
          moderation_status: action,
          is_approved: action === "approved",
        })
        .eq("id", reviewId);
      if (err) throw err;
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                moderation_status: action,
                is_approved: action === "approved",
              }
            : r,
        ),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setProcessing(null);
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

  const filtered = reviews.filter((r) => {
    const matchesStatus =
      statusFilter === "all" || r.moderation_status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = reviews.filter(
    (r) => r.moderation_status === "pending",
  ).length;
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Avis Clients
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Modération des avis produits
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
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Total avis
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {reviews.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#6366f115", color: "#6366f1" }}
            >
              <MessageSquare size={20} />
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                En modération
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {pendingCount}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#f59e0b15", color: "#f59e0b" }}
            >
              <Eye size={20} />
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Note moyenne
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {avgRating}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#22c55e15", color: "#22c55e" }}
            >
              <Star size={20} />
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs mb-1"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Achats vérifiés
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: "var(--gm-text)" }}
              >
                {reviews.filter((r) => r.is_verified_purchase).length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#3b82f615", color: "#3b82f6" }}
            >
              <Check size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
          <option value="flagged">Signalés</option>
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
              width: "260px",
            }}
          />
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
              color: "var(--gm-text-muted)",
            }}
          >
            Aucun avis trouvé
          </div>
        ) : (
          filtered.map((review) => {
            const modCfg =
              MODERATION_CONFIG[review.moderation_status] ||
              MODERATION_CONFIG.pending;
            return (
              <div
                key={review.id}
                className="rounded-xl border p-4 space-y-3"
                style={{
                  backgroundColor: "var(--gm-surface)",
                  borderColor:
                    review.moderation_status === "pending"
                      ? `${modCfg.color}30`
                      : "var(--gm-border)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            style={{
                              color:
                                s <= (review.rating || 0)
                                  ? "#f59e0b"
                                  : "var(--gm-border)",
                              fill:
                                s <= (review.rating || 0)
                                  ? "#f59e0b"
                                  : "transparent",
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="badge text-[10px]"
                        style={{
                          backgroundColor: `${modCfg.color}15`,
                          color: modCfg.color,
                        }}
                      >
                        {modCfg.label}
                      </span>
                      {review.is_verified_purchase && (
                        <span
                          className="badge text-[10px]"
                          style={{
                            backgroundColor: "rgba(34,197,94,0.1)",
                            color: "#22c55e",
                          }}
                        >
                          Achat vérifié
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-medium text-sm"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {review.title || "Sans titre"}
                    </h3>
                    <p
                      className="text-xs mt-1 line-clamp-3"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {review.content || "Aucun contenu"}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      par{" "}
                      <span style={{ color: "var(--gm-text)" }}>
                        {review.user_name}
                      </span>
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      sur{" "}
                      <span style={{ color: "var(--gm-accent)" }}>
                        {review.product_name}
                      </span>
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {new Date(review.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {review.helpful_count > 0 && (
                      <span
                        className="text-[11px] flex items-center gap-1"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        <ThumbsUp size={10} /> {review.helpful_count}
                      </span>
                    )}
                  </div>

                  {review.moderation_status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleModeration(review.id, "approved")}
                        disabled={processing === review.id}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors"
                        style={{
                          backgroundColor: "rgba(34,197,94,0.1)",
                          color: "#22c55e",
                        }}
                      >
                        <ThumbsUp size={12} /> Approuver
                      </button>
                      <button
                        onClick={() => handleModeration(review.id, "rejected")}
                        disabled={processing === review.id}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors"
                        style={{
                          backgroundColor: "rgba(239,68,68,0.06)",
                          color: "#ef4444",
                        }}
                      >
                        <ThumbsDown size={12} /> Rejeter
                      </button>
                    </div>
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
