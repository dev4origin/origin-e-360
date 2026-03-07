"use client";

import { createClient } from "@/lib/supabase/client";
import type { Client360 } from "@/lib/types";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  HeadphonesIcon,
  Key,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  TreePine,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span style={{ color: "var(--gm-muted)" }}>{icon}</span>
      <span className="text-xs w-32" style={{ color: "var(--gm-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--gm-text)" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        backgroundColor: "var(--gm-surface)",
        borderColor: "var(--gm-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: "var(--gm-accent)" }}>{icon}</span>
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--gm-text)" }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function Client360Page() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Client360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: client, error: rpcError } = await supabase.rpc(
          "get_client_360",
          { p_org_id: id },
        );
        if (rpcError) throw rpcError;
        setData(client as unknown as Client360);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        <p style={{ color: "var(--gm-text)" }}>{error}</p>
        <Link
          href="/god-mode/crm"
          className="text-sm"
          style={{ color: "var(--gm-accent)" }}
        >
          Retour au CRM
        </Link>
      </div>
    );
  }

  const org = data.organization;
  const license = data.license;
  const activity = data.activity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/god-mode/crm"
          className="p-2 rounded-lg hover:bg-white/5"
          style={{ color: "var(--gm-muted)" }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            {org.nom}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="badge-info text-xs">{org.type}</span>
            <span
              className={
                org.statut_kyc === "verified"
                  ? "badge-success"
                  : org.statut_kyc === "pending"
                    ? "badge-warning"
                    : "badge-danger"
              }
            >
              KYC: {org.statut_kyc}
            </span>
            <span
              className={
                org.subscription_status === "active"
                  ? "badge-success"
                  : "badge-warning"
              }
            >
              {org.subscription_status}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Producteurs",
            value: activity.total_producers,
            icon: <Users size={18} />,
            color: "#6366f1",
          },
          {
            label: "Parcelles",
            value: activity.total_parcelles,
            icon: <TreePine size={18} />,
            color: "#22c55e",
          },
          {
            label: "Livraisons",
            value: activity.total_deliveries_campaign,
            icon: <Truck size={18} />,
            color: "#f59e0b",
          },
          {
            label: "Volume (kg)",
            value: activity.total_volume_kg?.toLocaleString("fr-FR"),
            icon: <Package size={18} />,
            color: "#8b5cf6",
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
                  {s.value ?? 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <SectionCard title="Informations" icon={<Building2 size={16} />}>
          <div className="space-y-0">
            <InfoRow
              icon={<Building2 size={14} />}
              label="Raison sociale"
              value={org.raison_sociale}
            />
            <InfoRow
              icon={<MapPin size={14} />}
              label="Département"
              value={org.departement}
            />
            <InfoRow
              icon={<MapPin size={14} />}
              label="Région"
              value={org.region}
            />
            <InfoRow
              icon={<Mail size={14} />}
              label="Email"
              value={org.email_professionnel}
            />
            <InfoRow
              icon={<Phone size={14} />}
              label="Téléphone"
              value={org.telephone_representant_legal}
            />
            <InfoRow
              icon={<Shield size={14} />}
              label="N° Registre"
              value={org.numero_registre_commerce}
            />
            <InfoRow
              icon={<Calendar size={14} />}
              label="Membre depuis"
              value={new Date(org.created_at).toLocaleDateString("fr-FR")}
            />
          </div>
        </SectionCard>

        {/* License */}
        <SectionCard title="Licence" icon={<Key size={16} />}>
          {license?.license_key ? (
            <div className="space-y-0">
              <InfoRow
                icon={<Key size={14} />}
                label="Clé"
                value={license.license_key}
              />
              <InfoRow
                icon={<Star size={14} />}
                label="Tier"
                value={license.tier}
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="Début"
                value={
                  license.starts_at
                    ? new Date(license.starts_at).toLocaleDateString("fr-FR")
                    : null
                }
              />
              <InfoRow
                icon={<Calendar size={14} />}
                label="Expiration"
                value={
                  license.expires_at
                    ? new Date(license.expires_at).toLocaleDateString("fr-FR")
                    : null
                }
              />
              <InfoRow
                icon={<Shield size={14} />}
                label="Renouvellement auto"
                value={license.auto_renew ? "Oui" : "Non"}
              />
              {license.days_remaining !== undefined && (
                <div
                  className="mt-3 pt-3 border-t"
                  style={{ borderColor: "var(--gm-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{ color: "var(--gm-muted)" }}
                    >
                      Jours restants
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color:
                          license.days_remaining > 30
                            ? "var(--gm-success)"
                            : license.days_remaining > 7
                              ? "var(--gm-warning)"
                              : "var(--gm-danger)",
                      }}
                    >
                      {license.days_remaining}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
              Aucune licence active
            </p>
          )}
        </SectionCard>

        {/* Staff Members */}
        <SectionCard title="Membres" icon={<Users size={16} />}>
          {org.staff && org.staff.length > 0 ? (
            <div className="space-y-2">
              {org.staff.map((s) => (
                <div
                  key={s.user_id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--gm-bg)" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--gm-accent)" }}
                  >
                    {s.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {s.full_name}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--gm-muted)" }}
                    >
                      {s.email}
                    </p>
                  </div>
                  <span className="badge-info text-[10px]">{s.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
              Aucun membre trouvé
            </p>
          )}
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Documents" icon={<FileText size={16} />}>
          {data.documents.length > 0 ? (
            <div className="space-y-2">
              {data.documents.slice(0, 8).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--gm-bg)" }}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} style={{ color: "var(--gm-muted)" }} />
                    <span
                      className="text-sm"
                      style={{ color: "var(--gm-text)" }}
                    >
                      {doc.title}
                    </span>
                  </div>
                  <span
                    className={
                      doc.status === "approved"
                        ? "badge-success"
                        : doc.status === "pending"
                          ? "badge-warning"
                          : "badge-info"
                    }
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
              Aucun document
            </p>
          )}
        </SectionCard>
      </div>

      {/* Tickets */}
      <SectionCard title="Tickets SAV" icon={<HeadphonesIcon size={16} />}>
        {data.tickets.length > 0 ? (
          <table className="gm-table w-full">
            <thead>
              <tr>
                <th>N°</th>
                <th>Sujet</th>
                <th>Statut</th>
                <th>Priorité</th>
                <th>Plateforme</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map((t) => (
                <tr key={t.id}>
                  <td
                    className="font-mono text-xs"
                    style={{ color: "var(--gm-accent)" }}
                  >
                    {t.ticket_number}
                  </td>
                  <td style={{ color: "var(--gm-text)" }}>{t.subject}</td>
                  <td>
                    <span
                      className={
                        t.status === "resolved" || t.status === "closed"
                          ? "badge-success"
                          : t.status === "open"
                            ? "badge-danger"
                            : "badge-warning"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        t.priority === "critical"
                          ? "badge-danger"
                          : t.priority === "high"
                            ? "badge-warning"
                            : "badge-info"
                      }
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ color: "var(--gm-muted)" }}>{t.platform}</td>
                  <td style={{ color: "var(--gm-muted)" }}>
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm" style={{ color: "var(--gm-muted)" }}>
            Aucun ticket
          </p>
        )}
      </SectionCard>

      {/* Reviews */}
      {data.reviews.length > 0 && (
        <SectionCard title="Avis produits" icon={<Star size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.reviews.map((r, i) => (
              <div
                key={i}
                className="px-4 py-3 rounded-lg"
                style={{ backgroundColor: "var(--gm-bg)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--gm-text)" }}
                  >
                    {r.product}
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        size={12}
                        fill={si < r.rating ? "#f59e0b" : "transparent"}
                        style={{
                          color: si < r.rating ? "#f59e0b" : "var(--gm-muted)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--gm-muted)" }}
                  >
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
