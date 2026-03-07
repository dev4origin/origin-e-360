"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PaymentProof {
  id: string;
  fournisseur_id: string;
  tier: string;
  amount: number;
  payment_method: string;
  proof_url: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  org_name?: string;
  org_type?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "En attente",
    color: "var(--gm-warning)",
    icon: <Clock size={14} />,
  },
  approved: {
    label: "Approuvé",
    color: "var(--gm-success)",
    icon: <Check size={14} />,
  },
  rejected: {
    label: "Rejeté",
    color: "var(--gm-danger)",
    icon: <XCircle size={14} />,
  },
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentProof[]>([]);
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
      const [paymentsRes, orgsRes] = await Promise.all([
        supabase
          .from("payment_proofs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("fournisseurs").select("id, nom, type"),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;

      const orgsMap = new Map(
        (orgsRes.data || []).map(
          (o: { id: string; nom: string; type: string }) => [
            o.id,
            { name: o.nom, type: o.type },
          ],
        ),
      );

      const enriched = (paymentsRes.data || []).map((p: PaymentProof) => {
        const org = orgsMap.get(p.fournisseur_id) as
          | { name: string; type: string }
          | undefined;
        return {
          ...p,
          org_name: org?.name || "Organisation inconnue",
          org_type: org?.type || "",
        };
      });

      setPayments(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (paymentId: string, approve: boolean) => {
    setProcessing(paymentId);
    try {
      const { error: updateError } = await supabase
        .from("payment_proofs")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: approve ? "approved" : "rejected",
                reviewed_at: new Date().toISOString(),
              }
            : p,
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

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.org_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payment_method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const approvedCount = payments.filter((p) => p.status === "approved").length;
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalApproved = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Paiements
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Validation des preuves de paiement
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="En attente"
          value={pendingCount}
          icon={<Clock size={20} />}
          color="#f59e0b"
          subtitle={`${totalPending.toLocaleString("fr-FR")} FCFA`}
        />
        <KpiCard
          label="Approuvés"
          value={approvedCount}
          icon={<Check size={20} />}
          color="#22c55e"
          subtitle={`${totalApproved.toLocaleString("fr-FR")} FCFA`}
        />
        <KpiCard
          label="Rejetés"
          value={payments.filter((p) => p.status === "rejected").length}
          icon={<XCircle size={20} />}
          color="#ef4444"
        />
        <KpiCard
          label="Total paiements"
          value={payments.length}
          icon={<CreditCard size={20} />}
          color="#6366f1"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--gm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Rechercher une organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm border bg-transparent outline-none"
            style={{
              borderColor: "var(--gm-border)",
              color: "var(--gm-text)",
              width: "280px",
            }}
          />
        </div>
      </div>

      {/* Payments Table */}
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
              <th>Plan</th>
              <th>
                <div className="flex items-center gap-1">
                  Montant <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Méthode</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Aucun paiement trouvé
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const statusCfg =
                  STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={payment.id}>
                    <td>
                      <div>
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--gm-text)" }}
                        >
                          {payment.org_name}
                        </span>
                        <p
                          className="text-[11px]"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {payment.org_type}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span
                        className="text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {payment.tier || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "var(--gm-text)" }}
                      >
                        {(payment.amount || 0).toLocaleString("fr-FR")}{" "}
                        <span
                          className="text-xs font-normal"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          FCFA
                        </span>
                      </span>
                    </td>
                    <td>
                      <span
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        <DollarSign size={12} />
                        {payment.payment_method || "—"}
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
                      {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      {payment.status === "pending" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproval(payment.id, true)}
                            disabled={processing === payment.id}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: "rgba(34, 197, 94, 0.12)",
                            }}
                            title="Approuver"
                          >
                            <Check
                              size={14}
                              style={{ color: "var(--gm-success)" }}
                            />
                          </button>
                          <button
                            onClick={() => handleApproval(payment.id, false)}
                            disabled={processing === payment.id}
                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: "rgba(239, 68, 68, 0.06)",
                            }}
                            title="Rejeter"
                          >
                            <X
                              size={14}
                              style={{ color: "var(--gm-danger)" }}
                            />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--gm-text-muted)" }}
                        >
                          {payment.reviewed_at
                            ? new Date(payment.reviewed_at).toLocaleDateString(
                                "fr-FR",
                              )
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
