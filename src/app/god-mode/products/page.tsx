"use client";

import { createClient } from "@/lib/supabase/client";
import type { OriginProduct, ProductReview } from "@/lib/types";
import {
  AlertTriangle,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Star,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const PLATFORM_LABELS: Record<string, string> = {
  origin_home: "Origin Home",
  origin_plots: "Origin Plots",
  origin_vault: "Origin Vault",
  origin_xport: "Origin Xport",
  god_mode: "Origin.e 360°",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Actif", color: "var(--gm-success)" },
  beta: { label: "Bêta", color: "var(--gm-warning)" },
  draft: { label: "Brouillon", color: "var(--gm-text-muted)" },
  deprecated: { label: "Déprécié", color: "var(--gm-danger)" },
  sunset: { label: "Fin de vie", color: "var(--gm-danger)" },
};

const MODERATION_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "var(--gm-warning)" },
  approved: { label: "Approuvé", color: "var(--gm-success)" },
  rejected: { label: "Rejeté", color: "var(--gm-danger)" },
  flagged: { label: "Signalé", color: "var(--gm-danger)" },
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= rating ? "#f59e0b" : "transparent"}
          style={{ color: s <= rating ? "#f59e0b" : "var(--gm-border)" }}
        />
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<OriginProduct[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"catalogue" | "reviews">(
    "catalogue",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<OriginProduct | null>(
    null,
  );
  const [moderationFilter, setModerationFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, reviewsRes] = await Promise.all([
        supabase
          .from("origin_products")
          .select("*")
          .order("platform", { ascending: true }),
        supabase
          .from("product_reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (reviewsRes.error) throw reviewsRes.error;

      setProducts(productsRes.data || []);
      setReviews(reviewsRes.data || []);
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
    const { error: updateError } = await supabase
      .from("product_reviews")
      .update({
        moderation_status: action,
        is_published: action === "approved",
      })
      .eq("id", reviewId);

    if (!updateError) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                moderation_status: action,
                is_published: action === "approved",
              }
            : r,
        ),
      );
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

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModeration =
      moderationFilter === "all" || r.moderation_status === moderationFilter;
    const matchesProduct =
      !selectedProduct || r.product_id === selectedProduct.id;
    return matchesSearch && matchesModeration && matchesProduct;
  });

  const pendingReviewsCount = reviews.filter(
    (r) => r.moderation_status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Produits & Avis
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Catalogue Origin.e et modération des avis clients
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

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <button
            onClick={() => setActiveTab("catalogue")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === "catalogue" ? "var(--gm-accent)" : "transparent",
              color:
                activeTab === "catalogue" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <Package size={14} />
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative"
            style={{
              backgroundColor:
                activeTab === "reviews" ? "var(--gm-accent)" : "transparent",
              color: activeTab === "reviews" ? "white" : "var(--gm-text-muted)",
            }}
          >
            <MessageSquare size={14} />
            Avis clients
            {pendingReviewsCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: "var(--gm-danger)" }}
              >
                {pendingReviewsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Catalogue Tab */}
      {activeTab === "catalogue" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <div
              className="col-span-full text-center py-16"
              style={{ color: "var(--gm-text-muted)" }}
            >
              Aucun produit enregistré
            </div>
          ) : (
            products.map((product) => {
              const status = STATUS_CONFIG[product.status] || {
                label: product.status,
                color: "var(--gm-text-muted)",
              };
              const productReviews = reviews.filter(
                (r) => r.product_id === product.id,
              );
              return (
                <div
                  key={product.id}
                  className="rounded-xl p-5 border transition-all hover:border-indigo-500/30"
                  style={{
                    backgroundColor: "var(--gm-surface)",
                    borderColor: "var(--gm-border)",
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{
                          backgroundColor: "rgba(99, 102, 241, 0.12)",
                          color: "var(--gm-accent)",
                        }}
                      >
                        {product.name.charAt(0)}
                      </div>
                      <div>
                        <h3
                          className="font-semibold"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {product.name}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {PLATFORM_LABELS[product.platform] ||
                            product.platform}
                        </p>
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${status.color}15`,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {product.tagline && (
                    <p
                      className="text-xs mb-4"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      {product.tagline}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <StarRating
                        rating={Math.round(product.average_rating || 0)}
                      />
                      <span
                        className="text-xs ml-1"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        ({product.total_reviews || 0})
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-3 border-t"
                    style={{ borderColor: "var(--gm-border)" }}
                  >
                    <div
                      className="flex items-center gap-4 text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      <span className="flex items-center gap-1">
                        <Eye size={12} />v{product.current_version}
                      </span>
                      <span>{product.pricing_model}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveTab("reviews");
                      }}
                      className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: "var(--gm-accent)" }}
                    >
                      <MessageSquare size={12} />
                      {productReviews.length} avis
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--gm-text-muted)" }}
              />
              <input
                type="text"
                placeholder="Rechercher un avis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
                style={{
                  borderColor: "var(--gm-border)",
                  color: "var(--gm-text)",
                }}
              />
            </div>

            <select
              value={moderationFilter}
              onChange={(e) => setModerationFilter(e.target.value)}
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

            {selectedProduct && (
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border hover:bg-white/5 transition-colors"
                style={{
                  borderColor: "var(--gm-accent)",
                  color: "var(--gm-accent)",
                }}
              >
                <Package size={12} />
                {selectedProduct.name}
                <span className="ml-1">×</span>
              </button>
            )}
          </div>

          {/* Review Cards */}
          {filteredReviews.length === 0 ? (
            <div
              className="text-center py-16 rounded-xl border"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor: "var(--gm-border)",
                color: "var(--gm-text-muted)",
              }}
            >
              Aucun avis trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => {
                const modStatus = MODERATION_CONFIG[
                  review.moderation_status
                ] || {
                  label: review.moderation_status,
                  color: "var(--gm-text-muted)",
                };
                const product = products.find(
                  (p) => p.id === review.product_id,
                );
                return (
                  <div
                    key={review.id}
                    className="rounded-xl p-4 border transition-all"
                    style={{
                      backgroundColor: "var(--gm-surface)",
                      borderColor:
                        review.moderation_status === "pending"
                          ? "var(--gm-warning)"
                          : "var(--gm-border)",
                      borderLeftWidth:
                        review.moderation_status === "pending" ? "3px" : "1px",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <StarRating rating={review.rating} />
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${modStatus.color}15`,
                              color: modStatus.color,
                            }}
                          >
                            {modStatus.label}
                          </span>
                          {product && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--gm-accent)" }}
                            >
                              {product.name}
                            </span>
                          )}
                          {review.is_verified_user && (
                            <span className="badge badge-success text-[10px]">
                              Vérifié
                            </span>
                          )}
                        </div>

                        {review.title && (
                          <h4
                            className="text-sm font-medium mb-1"
                            style={{ color: "var(--gm-text)" }}
                          >
                            {review.title}
                          </h4>
                        )}

                        {review.comment && (
                          <p
                            className="text-sm"
                            style={{ color: "var(--gm-text-muted)" }}
                          >
                            {review.comment}
                          </p>
                        )}

                        <div
                          className="flex items-center gap-4 mt-2 text-xs"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          <span>
                            {new Date(review.created_at).toLocaleDateString(
                              "fr-FR",
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={11} />
                            {review.helpful_count}
                          </span>
                        </div>
                      </div>

                      {review.moderation_status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() =>
                              handleModeration(review.id, "approved")
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: "rgba(34, 197, 94, 0.12)",
                              color: "var(--gm-success)",
                            }}
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() =>
                              handleModeration(review.id, "rejected")
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              color: "var(--gm-danger)",
                            }}
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
