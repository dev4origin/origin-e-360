"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Clock,
  FileText,
  Loader2,
  Search,
  Ticket,
  TreePine,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ResultCategory =
  | "fournisseurs"
  | "producteurs"
  | "tickets"
  | "livraisons"
  | "staff";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: ResultCategory;
  url: string;
}

const CATEGORY_CONFIG: Record<
  ResultCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  fournisseurs: {
    label: "Organisations",
    icon: <Building2 size={14} />,
    color: "var(--gm-accent)",
  },
  producteurs: {
    label: "Producteurs",
    icon: <Users size={14} />,
    color: "var(--gm-success)",
  },
  tickets: {
    label: "Tickets SAV",
    icon: <Ticket size={14} />,
    color: "var(--gm-warning)",
  },
  livraisons: {
    label: "Livraisons",
    icon: <TreePine size={14} />,
    color: "var(--gm-info)",
  },
  staff: {
    label: "Staff Origin.e",
    icon: <User size={14} />,
    color: "var(--gm-danger)",
  },
};

const QUICK_LINKS = [
  { label: "Dashboard", url: "/god-mode", icon: "📊" },
  { label: "Finance", url: "/god-mode/finance", icon: "💰" },
  { label: "CRM", url: "/god-mode/crm", icon: "🏢" },
  { label: "Opérations", url: "/god-mode/operations", icon: "📦" },
  { label: "Audit", url: "/god-mode/audit", icon: "🔍" },
  { label: "SAV / Tickets", url: "/god-mode/sav", icon: "🎫" },
  { label: "Compliance EUDR", url: "/god-mode/compliance/eudr", icon: "🌱" },
  { label: "Système", url: "/god-mode/system", icon: "⚙️" },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("gm_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored));
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Save to recent searches
  const saveRecent = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(
      0,
      5,
    );
    setRecentSearches(updated);
    localStorage.setItem("gm_recent_searches", JSON.stringify(updated));
  };

  // Search function
  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const pattern = `%${searchTerm}%`;

      try {
        const [fournisseurs, producteurs, tickets, livraisons, staff] =
          await Promise.all([
            // Fournisseurs (organisations)
            supabase
              .from("fournisseurs")
              .select("id, nom, type, departement, subscription_status")
              .or(
                `nom.ilike.${pattern},type.ilike.${pattern},departement.ilike.${pattern}`,
              )
              .limit(5),

            // Producteurs
            supabase
              .from("producteurs")
              .select("id, nom, prenoms, code_producteur, telephone")
              .or(
                `nom.ilike.${pattern},prenoms.ilike.${pattern},code_producteur.ilike.${pattern},telephone.ilike.${pattern}`,
              )
              .limit(5),

            // SAV Tickets
            supabase
              .from("sav_tickets")
              .select("id, ticket_number, subject, status, priority")
              .or(`ticket_number.ilike.${pattern},subject.ilike.${pattern}`)
              .limit(5),

            // Livraisons
            supabase
              .from("livraisons")
              .select("id, bordereau, statut, poids_net_kg")
              .or(`bordereau.ilike.${pattern}`)
              .limit(5),

            // God Mode Staff
            supabase
              .from("god_mode_staff")
              .select("id, display_name, email, access_level")
              .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
              .limit(3),
          ]);

        const allResults: SearchResult[] = [];

        // Map fournisseurs
        fournisseurs.data?.forEach((f) =>
          allResults.push({
            id: f.id,
            title: f.nom,
            subtitle: `${f.type} · ${f.departement || "—"} · ${f.subscription_status}`,
            category: "fournisseurs",
            url: `/god-mode/crm/organizations/${f.id}`,
          }),
        );

        // Map producteurs
        producteurs.data?.forEach((p) =>
          allResults.push({
            id: p.id,
            title: `${p.prenoms || ""} ${p.nom}`.trim(),
            subtitle: `${p.code_producteur || "—"} · ${p.telephone || "—"}`,
            category: "producteurs",
            url: `/god-mode/crm`, // no detail page yet
          }),
        );

        // Map tickets
        tickets.data?.forEach((t) =>
          allResults.push({
            id: t.id,
            title: `${t.ticket_number} — ${t.subject}`,
            subtitle: `${t.status} · ${t.priority}`,
            category: "tickets",
            url: `/god-mode/sav`,
          }),
        );

        // Map livraisons
        livraisons.data?.forEach((l) =>
          allResults.push({
            id: l.id,
            title: l.bordereau || "Livraison",
            subtitle: `${l.statut} · ${l.poids_net_kg ? l.poids_net_kg + " kg" : "—"}`,
            category: "livraisons",
            url: `/god-mode/operations/deliveries`,
          }),
        );

        // Map staff
        staff.data?.forEach((s) =>
          allResults.push({
            id: s.id,
            title: s.display_name || s.email,
            subtitle: `Niveau ${s.access_level}`,
            category: "staff",
            url: `/god-mode/system`,
          }),
        );

        setResults(allResults);
        setSelectedIndex(0);
      } catch {
        console.error("Search error");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  // Navigate to result
  const navigateTo = (url: string, term?: string) => {
    if (term) saveRecent(term);
    onClose();
    router.push(url);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items =
      results.length > 0
        ? results
        : query.length === 0
          ? QUICK_LINKS.map((l, i) => ({ ...l, id: String(i) }))
          : [];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && items.length > 0) {
      e.preventDefault();
      if (results.length > 0) {
        navigateTo(results[selectedIndex]?.url || "/god-mode", query);
      } else if (query.length === 0) {
        navigateTo(QUICK_LINKS[selectedIndex]?.url || "/god-mode");
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group results by category
  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<ResultCategory, SearchResult[]>,
  );

  let globalIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-[640px] rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--gm-surface)",
          borderColor: "var(--gm-border)",
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--gm-border)" }}
        >
          <Search size={20} style={{ color: "var(--gm-accent)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher fournisseurs, producteurs, tickets, livraisons..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--gm-text)" }}
          />
          {loading && (
            <Loader2
              size={16}
              className="animate-spin"
              style={{ color: "var(--gm-accent)" }}
            />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: "var(--gm-text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results / Quick Links */}
        <div
          className="max-h-[400px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {query.length < 2 ? (
            // Quick links + Recent searches
            <div className="p-3">
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-[10px] uppercase font-semibold tracking-wider px-2 mb-2"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Recherches récentes
                  </p>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm hover:bg-white/5 text-left"
                      style={{ color: "var(--gm-text)" }}
                    >
                      <Clock
                        size={12}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                      {term}
                    </button>
                  ))}
                </div>
              )}

              <p
                className="text-[10px] uppercase font-semibold tracking-wider px-2 mb-2"
                style={{ color: "var(--gm-text-muted)" }}
              >
                Navigation rapide
              </p>
              {QUICK_LINKS.map((link, i) => (
                <button
                  key={link.url}
                  onClick={() => navigateTo(link.url)}
                  className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm transition-colors ${
                    selectedIndex === i && query.length === 0
                      ? "bg-white/5"
                      : "hover:bg-white/5"
                  }`}
                  style={{ color: "var(--gm-text)" }}
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </button>
              ))}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center">
              <FileText
                size={32}
                className="mx-auto mb-2"
                style={{ color: "var(--gm-text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
                Aucun résultat pour &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <div className="p-2">
              {(
                Object.entries(grouped) as [ResultCategory, SearchResult[]][]
              ).map(([cat, items]) => {
                const config = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat} className="mb-3">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span style={{ color: config.color }}>{config.icon}</span>
                      <span
                        className="text-[10px] uppercase font-semibold tracking-wider"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {config.label}
                      </span>
                      <span
                        className="text-[10px] px-1.5 rounded-full"
                        style={{
                          backgroundColor: "var(--gm-surface-2)",
                          color: "var(--gm-text-muted)",
                        }}
                      >
                        {items.length}
                      </span>
                    </div>
                    {items.map((item) => {
                      globalIndex++;
                      const idx = globalIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.url, query)}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                            selectedIndex === idx
                              ? "bg-white/5"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                            }}
                          >
                            <span style={{ color: config.color }}>
                              {config.icon}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "var(--gm-text)" }}
                            >
                              {item.title}
                            </p>
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--gm-text-muted)" }}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t"
          style={{
            borderColor: "var(--gm-border)",
            backgroundColor: "var(--gm-bg)",
          }}
        >
          <div
            className="flex items-center gap-3 text-[10px]"
            style={{ color: "var(--gm-text-muted)" }}
          >
            <span>
              <kbd
                className="px-1 py-0.5 rounded border"
                style={{ borderColor: "var(--gm-border)" }}
              >
                ↑↓
              </kbd>{" "}
              naviguer
            </span>
            <span>
              <kbd
                className="px-1 py-0.5 rounded border"
                style={{ borderColor: "var(--gm-border)" }}
              >
                ↵
              </kbd>{" "}
              sélectionner
            </span>
            <span>
              <kbd
                className="px-1 py-0.5 rounded border"
                style={{ borderColor: "var(--gm-border)" }}
              >
                esc
              </kbd>{" "}
              fermer
            </span>
          </div>
          <span
            className="text-[10px]"
            style={{ color: "var(--gm-text-muted)" }}
          >
            {results.length} résultat{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </>
  );
}
