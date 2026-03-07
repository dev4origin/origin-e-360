"use client";

import { createClient } from "@/lib/supabase/client";
import type { TicketPriority, TicketStatus } from "@/lib/types";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Filter,
  HeadphonesIcon,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  platform: string;
  org_id: string;
  org_name?: string;
  assigned_to: string | null;
  assigned_name?: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
}

const STATUS_STYLE: Record<string, { class: string; label: string }> = {
  open: { class: "badge-danger", label: "Ouvert" },
  assigned: { class: "badge-info", label: "Assigné" },
  in_progress: { class: "badge-warning", label: "En cours" },
  waiting_client: { class: "badge-info", label: "Attente client" },
  waiting_internal: { class: "badge-warning", label: "Attente interne" },
  resolved: { class: "badge-success", label: "Résolu" },
  closed: { class: "badge-success", label: "Fermé" },
  reopened: { class: "badge-danger", label: "Réouvert" },
};

const PRIORITY_STYLE: Record<string, { class: string; color: string }> = {
  critical: { class: "badge-danger", color: "#ef4444" },
  high: { class: "badge-warning", color: "#f59e0b" },
  medium: { class: "badge-info", color: "#6366f1" },
  low: { class: "badge-info", color: "#64748b" },
};

export default function SAVPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("sav_tickets")
      .select(
        `
        *,
        organisations!sav_tickets_org_id_fkey(nom)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (priorityFilter !== "all") {
      query = query.eq("priority", priorityFilter);
    }

    const { data } = await query;
    const mapped = (data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      org_name: (t.organisations as Record<string, string> | null)?.nom || "—",
    })) as Ticket[];
    setTickets(mapped);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    open: tickets.filter((t) => ["open", "reopened"].includes(t.status)).length,
    in_progress: tickets.filter((t) =>
      ["assigned", "in_progress"].includes(t.status),
    ).length,
    resolved: tickets.filter((t) => ["resolved", "closed"].includes(t.status))
      .length,
    sla_breached: tickets.filter((t) => t.sla_breached).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            SAV — Tickets
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
            Support client multi-plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5"
            style={{
              color: "var(--gm-muted)",
              borderColor: "var(--gm-border)",
            }}
          >
            <RefreshCw size={14} />
          </button>
          <button className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <Plus size={14} />
            Nouveau ticket
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Ouverts",
            value: stats.open,
            color: "#ef4444",
            icon: <AlertTriangle size={18} />,
          },
          {
            label: "En cours",
            value: stats.in_progress,
            color: "#f59e0b",
            icon: <Clock size={18} />,
          },
          {
            label: "Résolus",
            value: stats.resolved,
            color: "#22c55e",
            icon: <HeadphonesIcon size={18} />,
          },
          {
            label: "SLA dépassé",
            value: stats.sla_breached,
            color: "#ef4444",
            icon: <Clock size={18} />,
          },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${s.color}15`, color: s.color }}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--gm-muted)" }}>
                  {s.label}
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ color: "var(--gm-text)" }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-sm"
          style={{ backgroundColor: "var(--gm-surface)" }}
        >
          <Search size={16} style={{ color: "var(--gm-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher par sujet ou numéro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: "var(--gm-text)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: "var(--gm-muted)" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border outline-none"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
            }}
          >
            <option value="all">Tous statuts</option>
            <option value="open">Ouvert</option>
            <option value="assigned">Assigné</option>
            <option value="in_progress">En cours</option>
            <option value="waiting_client">Attente client</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs border outline-none"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
            }}
          >
            <option value="all">Toutes priorités</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--gm-accent)" }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <HeadphonesIcon
            size={32}
            className="mx-auto mb-2"
            style={{ color: "var(--gm-muted)" }}
          />
          <p style={{ color: "var(--gm-muted)" }}>Aucun ticket trouvé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer hover:border-[var(--gm-accent)] transition-colors"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor:
                  selectedTicket?.id === ticket.id
                    ? "var(--gm-accent)"
                    : "var(--gm-border)",
              }}
            >
              {/* Priority indicator */}
              <div
                className="w-1 h-10 rounded-full"
                style={{
                  backgroundColor:
                    PRIORITY_STYLE[ticket.priority]?.color || "#64748b",
                }}
              />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--gm-accent)" }}
                  >
                    {ticket.ticket_number}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(99,102,241,0.1)",
                      color: "var(--gm-accent)",
                    }}
                  >
                    {ticket.platform}
                  </span>
                  {ticket.sla_breached && (
                    <span className="badge-danger text-[10px]">
                      SLA dépassé
                    </span>
                  )}
                </div>
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--gm-text)" }}
                >
                  {ticket.subject}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {ticket.org_name}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    •
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {ticket.category}
                  </span>
                </div>
              </div>

              {/* Status & Meta */}
              <div className="flex flex-col items-end gap-2">
                <span
                  className={STATUS_STYLE[ticket.status]?.class || "badge-info"}
                >
                  {STATUS_STYLE[ticket.status]?.label || ticket.status}
                </span>
                <div className="flex items-center gap-2">
                  {ticket.assigned_to && (
                    <User size={12} style={{ color: "var(--gm-muted)" }} />
                  )}
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>

              <ChevronRight size={14} style={{ color: "var(--gm-muted)" }} />
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Panel */}
      {selectedTicket && (
        <div
          className="rounded-xl p-6 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-mono text-sm"
                  style={{ color: "var(--gm-accent)" }}
                >
                  {selectedTicket.ticket_number}
                </span>
                <span
                  className={
                    PRIORITY_STYLE[selectedTicket.priority]?.class ||
                    "badge-info"
                  }
                >
                  {selectedTicket.priority}
                </span>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--gm-text)" }}
              >
                {selectedTicket.subject}
              </h2>
            </div>
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs px-3 py-1 rounded-lg hover:bg-white/5"
              style={{ color: "var(--gm-muted)" }}
            >
              Fermer
            </button>
          </div>

          {selectedTicket.description && (
            <p
              className="text-sm mb-4 px-4 py-3 rounded-lg"
              style={{
                color: "var(--gm-text)",
                backgroundColor: "var(--gm-bg)",
              }}
            >
              {selectedTicket.description}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p
                className="text-[10px] mb-1"
                style={{ color: "var(--gm-muted)" }}
              >
                Plateforme
              </p>
              <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                {selectedTicket.platform}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] mb-1"
                style={{ color: "var(--gm-muted)" }}
              >
                Catégorie
              </p>
              <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                {selectedTicket.category}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] mb-1"
                style={{ color: "var(--gm-muted)" }}
              >
                SLA Deadline
              </p>
              <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                {selectedTicket.sla_deadline
                  ? new Date(selectedTicket.sla_deadline).toLocaleString(
                      "fr-FR",
                    )
                  : "—"}
              </p>
            </div>
            <div>
              <p
                className="text-[10px] mb-1"
                style={{ color: "var(--gm-muted)" }}
              >
                1ère réponse
              </p>
              <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                {selectedTicket.first_response_at
                  ? new Date(selectedTicket.first_response_at).toLocaleString(
                      "fr-FR",
                    )
                  : "Pas encore"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
              <User size={14} />
              Assigner
            </button>
            <button className="btn-ghost text-sm px-4 py-2 flex items-center gap-2">
              <MessageSquare size={14} />
              Répondre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
