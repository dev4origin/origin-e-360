// ═══════════════════════════════════════════════════════════
// God Mode 360° — TypeScript Types
// ═══════════════════════════════════════════════════════════

// ── God Mode Roles ──
export type GmRole =
  | "god_admin"
  | "coo"
  | "cfo"
  | "cto"
  | "head_audit"
  | "head_sav"
  | "head_sales"
  | "auditor_internal"
  | "sav_agent"
  | "sales_rep";

export type Platform =
  | "origin_home"
  | "origin_plots"
  | "origin_vault"
  | "origin_xport"
  | "god_mode";

export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "waiting_client"
  | "waiting_internal"
  | "resolved"
  | "closed"
  | "reopened";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketCategory =
  | "bug"
  | "feature_request"
  | "billing"
  | "onboarding"
  | "data_issue"
  | "account_access"
  | "general";

// ── God Mode Staff ──
export interface GodModeStaff {
  id: string;
  user_id: string;
  gm_role: GmRole;
  department: string | null;
  access_level: number;
  is_active: boolean;
  hired_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── God Mode Permission ──
export interface GodModePermission {
  id: string;
  gm_role: GmRole;
  pillar: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
}

// ── SAV Ticket ──
export interface SavTicket {
  id: string;
  ticket_number: string;
  reporter_id: string;
  reporter_org_id: string | null;
  assigned_to: string | null;
  platform: Platform;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  tags: string[];
  sla_first_response_deadline: string | null;
  sla_resolution_deadline: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  satisfaction_score: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reporter_name?: string;
  org_name?: string;
  assignee_name?: string;
}

// ── Ticket Message ──
export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  is_internal_note: boolean;
  content: string;
  created_at: string;
  author_name?: string;
  author_role?: string;
}

// ── Product Review ──
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  organization_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_user: boolean;
  is_published: boolean;
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  helpful_count: number;
  created_at: string;
  product_name?: string;
  user_name?: string;
  org_name?: string;
}

// ── Origin Product ──
export interface OriginProduct {
  id: string;
  platform: Platform;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  current_version: string;
  status: "draft" | "beta" | "active" | "deprecated" | "sunset";
  pricing_model: "free" | "freemium" | "subscription" | "one_time";
  average_rating: number;
  total_reviews: number;
  total_users: number;
}

// ── Dashboard Overview Response ──
export interface GodModeOverview {
  generated_at: string;
  finance: {
    active_licenses: number;
    mrr: number;
    pending_payments: number;
    trial_count: number;
    paid_count: number;
  };
  operations: {
    deliveries_today: number;
    deliveries_this_week: number;
    total_volume_campaign_kg: number;
    active_partnerships: number;
    batches_in_transit: number;
    processing_sessions_open: number;
  };
  audit: {
    pending_validations: number;
    validations_this_week: number;
    approval_rate: number | null;
    unresolved_alerts: number;
    critical_alerts: number;
    active_missions: number;
  };
  sav: {
    open_tickets: number;
    unassigned_tickets: number;
    avg_resolution_hours: number | null;
    sla_breach_count: number;
    avg_satisfaction: number | null;
  };
  clients: {
    total_organizations: number;
    cooperatives: number;
    exportateurs: number;
    total_producers: number;
    total_parcelles: number;
    new_orgs_this_week: number;
    kyc_pending: number;
  };
  compliance: {
    eudr_compliance_rate: number | null;
    non_compliant_parcelles: number;
    compliance_reports_total: number;
  };
}

// ── Finance Dashboard ──
export interface FinanceDashboard {
  generated_at: string;
  revenue: {
    by_tier: Array<{
      tier: string;
      count: number;
      mrr_contribution: number;
    }>;
    total_mrr: number;
    arr: number;
  };
  subscriptions: {
    active: number;
    trial: number;
    expired: number;
    cancelled: number;
    expiring_soon: number;
  };
  payments: {
    pending: Array<{
      id: string;
      org_name: string;
      tier: string;
      amount: number;
      method: string;
      created_at: string;
    }>;
    recent_approved: Array<{
      id: string;
      org_name: string;
      amount: number;
      reviewed_at: string;
    }>;
  };
}

// ── Client 360 ──
export interface Client360 {
  organization: {
    id: string;
    nom: string;
    type: string;
    departement: string;
    region: string | null;
    raison_sociale: string | null;
    statut_kyc: string;
    subscription_status: string;
    numero_registre_commerce: string | null;
    email_professionnel: string | null;
    nom_representant_legal: string | null;
    telephone_representant_legal: string | null;
    created_at: string;
    staff: Array<{
      user_id: string;
      role: string;
      full_name: string;
      email: string;
    }> | null;
  };
  license: {
    license_key?: string;
    tier?: string;
    is_active?: boolean;
    starts_at?: string;
    expires_at?: string;
    auto_renew?: boolean;
    payment_period?: string;
    days_remaining?: number;
  };
  activity: {
    total_producers: number;
    total_parcelles: number;
    total_deliveries_campaign: number;
    total_volume_kg: number;
    batches_count: number;
  };
  documents: Array<{
    id: string;
    title: string;
    status: string;
    expiration_date: string | null;
    is_legal_document: boolean;
    category: string;
  }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    platform: string;
    created_at: string;
    resolved_at: string | null;
  }>;
  reviews: Array<{
    product: string;
    rating: number;
    title: string | null;
    comment: string | null;
    created_at: string;
  }>;
  license_history: Array<{
    event_type: string;
    old_tier: string | null;
    new_tier: string | null;
    notes: string | null;
    created_at: string;
  }>;
}

// ── Navigation ──
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  pillar: string;
  badge?: number;
  children?: NavItem[];
}

// ── KPI Snapshot ──
export interface KpiSnapshot {
  id: string;
  snapshot_date: string;
  pillar: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  dimensions: Record<string, unknown>;
}
