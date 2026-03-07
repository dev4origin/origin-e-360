"use client";

import { createClient } from "@/lib/supabase/client";
import type { GodModeOverview } from "@/lib/types";
import {
  AlertTriangle,
  Building2,
  DollarSign,
  FileCheck,
  HeadphonesIcon,
  Loader2,
  RefreshCw,
  TreePine,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

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
          <p className="text-xs mb-1" style={{ color: "var(--gm-muted)" }}>
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

function AlertRow({
  type,
  message,
  time,
}: {
  type: "danger" | "warning" | "info";
  message: string;
  time: string;
}) {
  const colors = {
    danger: "var(--gm-danger)",
    warning: "var(--gm-warning)",
    info: "var(--gm-accent)",
  };
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border-l-2"
      style={{
        backgroundColor: "var(--gm-bg)",
        borderLeftColor: colors[type],
      }}
    >
      <AlertTriangle size={14} style={{ color: colors[type] }} />
      <span className="text-sm flex-1" style={{ color: "var(--gm-text)" }}>
        {message}
      </span>
      <span className="text-[10px]" style={{ color: "var(--gm-muted)" }}>
        {time}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<GodModeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: overview, error: rpcError } = await supabase.rpc(
        "get_god_mode_overview",
      );
      if (rpcError) throw rpcError;
      setData(overview as unknown as GodModeOverview);
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

  const { finance, operations, audit, sav, clients, compliance } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Vue d&apos;ensemble 360°
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
            Tableau de bord en temps réel de l&apos;écosystème Origin.e
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
          style={{
            color: "var(--gm-muted)",
            borderColor: "var(--gm-border)",
          }}
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* KPI Grid — Clients & Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Organisations"
          value={clients.total_organizations}
          icon={<Building2 size={20} />}
          color="#6366f1"
          subtitle={`${clients.kyc_pending} KYC en attente`}
        />
        <KpiCard
          label="Producteurs"
          value={clients.total_producers?.toLocaleString("fr-FR") ?? 0}
          icon={<Users size={20} />}
          color="#22c55e"
          subtitle={`${clients.new_orgs_this_week} nouveaux cette semaine`}
        />
        <KpiCard
          label="Parcelles"
          value={clients.total_parcelles?.toLocaleString("fr-FR") ?? 0}
          icon={<TreePine size={20} />}
          color="#f59e0b"
        />
        <KpiCard
          label="Validations en attente"
          value={audit.pending_validations}
          icon={<FileCheck size={20} />}
          color="#ef4444"
          subtitle={`${audit.validations_this_week} cette semaine`}
        />
      </div>

      {/* KPI Grid — Finance & SAV */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Licences actives"
          value={finance.active_licenses}
          icon={<DollarSign size={20} />}
          color="#6366f1"
          subtitle={`${finance.trial_count} en essai`}
        />
        <KpiCard
          label="MRR"
          value={`${(finance.mrr ?? 0).toLocaleString("fr-FR")} FCFA`}
          icon={<TrendingUp size={20} />}
          color="#22c55e"
        />
        <KpiCard
          label="Tickets SAV ouverts"
          value={sav.open_tickets}
          icon={<HeadphonesIcon size={20} />}
          color="#f59e0b"
          subtitle={`${sav.unassigned_tickets} non assignés`}
        />
        <KpiCard
          label="Volume campagne"
          value={`${(operations.total_volume_campaign_kg ?? 0).toLocaleString("fr-FR")} kg`}
          icon={<FileCheck size={20} />}
          color="#8b5cf6"
          subtitle={`${operations.deliveries_this_week} livraisons/sem`}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div
          className="lg:col-span-2 rounded-xl p-5 border"
          style={{
            backgroundColor: "var(--gm-surface)",
            borderColor: "var(--gm-border)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--gm-text)" }}
          >
            Alertes & Notifications
          </h2>
          <div className="space-y-2">
            {clients.kyc_pending > 0 && (
              <AlertRow
                type="warning"
                message={`${clients.kyc_pending} organisations en attente de vérification KYC`}
                time="Maintenant"
              />
            )}
            {sav.sla_breach_count > 0 && (
              <AlertRow
                type="danger"
                message={`${sav.sla_breach_count} tickets SAV ont dépassé le SLA`}
                time="Maintenant"
              />
            )}
            {audit.pending_validations > 0 && (
              <AlertRow
                type="info"
                message={`${audit.pending_validations} validations de terrain en attente d'audit`}
                time="Maintenant"
              />
            )}
            {audit.critical_alerts > 0 && (
              <AlertRow
                type="danger"
                message={`${audit.critical_alerts} alertes critiques non résolues`}
                time="Maintenant"
              />
            )}
            {finance.pending_payments > 0 && (
              <AlertRow
                type="info"
                message={`${finance.pending_payments} paiements en attente de validation`}
                time="Maintenant"
              />
            )}
            {sav.open_tickets > 0 && (
              <AlertRow
                type="warning"
                message={`${sav.open_tickets} tickets SAV ouverts`}
                time="Maintenant"
              />
            )}
          </div>
        </div>

        {/* Quick Stats */}
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
            Répartition Organisations
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Coopératives",
                value: clients.cooperatives ?? 0,
                color: "#6366f1",
              },
              {
                label: "Exportateurs",
                value: clients.exportateurs ?? 0,
                color: "#22c55e",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm" style={{ color: "var(--gm-text)" }}>
                    {item.label}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: item.color }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-6 pt-4 border-t"
            style={{ borderColor: "var(--gm-border)" }}
          >
            <h3
              className="text-xs font-medium mb-3"
              style={{ color: "var(--gm-muted)" }}
            >
              Conformité EUDR
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Taux conformité",
                  value: compliance.eudr_compliance_rate
                    ? `${(compliance.eudr_compliance_rate * 100).toFixed(1)}%`
                    : "—",
                  color: "#22c55e",
                },
                {
                  label: "Non-compliant",
                  value: compliance.non_compliant_parcelles ?? 0,
                  color: "#ef4444",
                },
                {
                  label: "Rapports",
                  value: compliance.compliance_reports_total ?? 0,
                  color: "#f59e0b",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="mt-6 pt-4 border-t"
            style={{ borderColor: "var(--gm-border)" }}
          >
            <h3
              className="text-xs font-medium mb-3"
              style={{ color: "var(--gm-muted)" }}
            >
              Opérations
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Livraisons aujourd'hui",
                  value: operations.deliveries_today,
                  color: "#6366f1",
                },
                {
                  label: "Partenariats actifs",
                  value: operations.active_partnerships,
                  color: "#22c55e",
                },
                {
                  label: "Lots en transit",
                  value: operations.batches_in_transit,
                  color: "#f59e0b",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
