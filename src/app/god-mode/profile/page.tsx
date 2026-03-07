"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Key,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  telephone: string | null;
  departement: string | null;
  village: string | null;
  role: string;
  statut_connexion: string;
  created_at: string;
  updated_at: string;
}

interface StaffInfo {
  id: string;
  gm_role: string;
  department: string | null;
  access_level: number;
  is_active: boolean;
  hired_at: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Edit fields
  const [editFullName, setEditFullName] = useState("");
  const [editTelephone, setEditTelephone] = useState("");
  const [editDepartement, setEditDepartement] = useState("");
  const [editVillage, setEditVillage] = useState("");

  const supabase = createClient();
  const router = useRouter();

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const [profileRes, staffRes] = await Promise.all([
        supabase.from("user_profile").select("*").eq("id", user.id).single(),
        supabase
          .from("god_mode_staff")
          .select("id, gm_role, department, access_level, is_active, hired_at")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (profileRes.error) throw profileRes.error;

      const p = profileRes.data as UserProfile;
      setProfile(p);
      setEditFullName(p.full_name || "");
      setEditTelephone(p.telephone || "");
      setEditDepartement(p.departement || "");
      setEditVillage(p.village || "");

      if (!staffRes.error && staffRes.data) {
        setStaffInfo(staffRes.data as StaffInfo);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error: err } = await supabase
        .from("user_profile")
        .update({
          full_name: editFullName,
          telephone: editTelephone || null,
          departement: editDepartement || null,
          village: editVillage || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (err) throw err;

      setProfile({
        ...profile,
        full_name: editFullName,
        telephone: editTelephone || null,
        departement: editDepartement || null,
        village: editVillage || null,
      });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setChangingPassword(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (err) throw err;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Erreur de changement",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      alert("Erreur lors de la déconnexion");
    }
  };

  useEffect(() => {
    fetchProfile();
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
        <button
          onClick={fetchProfile}
          className="px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--gm-accent)",
            color: "#fff",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const accessLabels: Record<number, string> = {
    0: "Niveau 0 — Super Admin",
    1: "Niveau 1 — Admin",
    2: "Niveau 2 — Manager",
    3: "Niveau 3 — Opérateur",
    4: "Niveau 4 — Lecture seule",
  };

  const roleColors: Record<string, string> = {
    god_admin: "#ef4444",
    god_operator: "#f59e0b",
    god_analyst: "#3b82f6",
    god_auditor: "#22c55e",
    god_support: "#8b5cf6",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--gm-text)" }}>
            Mon Profil
          </h1>
          <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
            Gérez vos informations personnelles et paramètres de sécurité
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "var(--gm-danger)",
          }}
        >
          {loggingOut ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          {loggingOut ? "Déconnexion..." : "Se déconnecter"}
        </button>
      </div>

      {/* Success banner */}
      {(saveSuccess || passwordSuccess) && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: "var(--gm-success)",
          }}
        >
          <Check size={16} />
          {saveSuccess
            ? "Profil mis à jour avec succès"
            : "Mot de passe modifié avec succès"}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Role Card */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div
            className="rounded-xl border p-6 text-center"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div className="relative inline-block mb-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: "var(--gm-accent)" }}
              >
                {profile.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "??"}
              </div>
              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2"
                style={{
                  backgroundColor: "var(--gm-surface-2)",
                  borderColor: "var(--gm-surface)",
                  color: "var(--gm-text-muted)",
                }}
              >
                <Camera size={14} />
              </div>
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--gm-text)" }}
            >
              {profile.full_name}
            </h2>
            <p className="text-sm" style={{ color: "var(--gm-text-muted)" }}>
              {profile.email}
            </p>
            {staffInfo && (
              <div className="mt-3">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${roleColors[staffInfo.gm_role] || "#6366f1"}20`,
                    color: roleColors[staffInfo.gm_role] || "#6366f1",
                  }}
                >
                  {staffInfo.gm_role.replace("god_", "").replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Staff Info Card */}
          {staffInfo && (
            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor: "var(--gm-surface)",
                borderColor: "var(--gm-border)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--gm-text)" }}
              >
                <Shield size={16} style={{ color: "var(--gm-accent)" }} />
                Rôle Origin.e
              </h3>
              <div className="space-y-3">
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Niveau d&apos;accès
                  </p>
                  <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                    {accessLabels[staffInfo.access_level] ||
                      `Niveau ${staffInfo.access_level}`}
                  </p>
                </div>
                {staffInfo.department && (
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider mb-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Département GM
                    </p>
                    <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                      {staffInfo.department}
                    </p>
                  </div>
                )}
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Statut
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{
                      color: staffInfo.is_active
                        ? "var(--gm-success)"
                        : "var(--gm-danger)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: staffInfo.is_active
                          ? "var(--gm-success)"
                          : "var(--gm-danger)",
                      }}
                    />
                    {staffInfo.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
                {staffInfo.hired_at && (
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-wider mb-1"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Membre depuis
                    </p>
                    <p
                      className="text-sm flex items-center gap-1.5"
                      style={{ color: "var(--gm-text)" }}
                    >
                      <Calendar
                        size={12}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                      {new Date(staffInfo.hired_at).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Edit Form & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info Card */}
          <div
            className="rounded-xl border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--gm-border)" }}
            >
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--gm-text)" }}
              >
                <User size={16} style={{ color: "var(--gm-accent)" }} />
                Informations personnelles
              </h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--gm-accent)" }}
                >
                  <Edit3 size={12} />
                  Modifier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditFullName(profile.full_name || "");
                      setEditTelephone(profile.telephone || "");
                      setEditDepartement(profile.departement || "");
                      setEditVillage(profile.village || "");
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    <X size={12} />
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: "var(--gm-accent)" }}
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Full Name */}
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Nom complet
                </label>
                {editing ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--gm-border)",
                      backgroundColor: "var(--gm-bg)",
                    }}
                  >
                    <User size={14} style={{ color: "var(--gm-text-muted)" }} />
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="bg-transparent text-sm outline-none flex-1"
                      style={{ color: "var(--gm-text)" }}
                    />
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                    {profile.full_name || "—"}
                  </p>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Adresse email
                </label>
                <p
                  className="text-sm flex items-center gap-2"
                  style={{ color: "var(--gm-text)" }}
                >
                  <Mail size={14} style={{ color: "var(--gm-text-muted)" }} />
                  {profile.email}
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      color: "var(--gm-success)",
                    }}
                  >
                    Vérifié
                  </span>
                </p>
              </div>

              {/* Phone */}
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Téléphone
                </label>
                {editing ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--gm-border)",
                      backgroundColor: "var(--gm-bg)",
                    }}
                  >
                    <Phone
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <input
                      type="tel"
                      value={editTelephone}
                      onChange={(e) => setEditTelephone(e.target.value)}
                      placeholder="+225 XX XX XX XX"
                      className="bg-transparent text-sm outline-none flex-1"
                      style={{ color: "var(--gm-text)" }}
                    />
                  </div>
                ) : (
                  <p
                    className="text-sm flex items-center gap-2"
                    style={{ color: "var(--gm-text)" }}
                  >
                    <Phone
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    {profile.telephone || "—"}
                  </p>
                )}
              </div>

              {/* Department */}
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Département
                </label>
                {editing ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--gm-border)",
                      backgroundColor: "var(--gm-bg)",
                    }}
                  >
                    <MapPin
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <input
                      type="text"
                      value={editDepartement}
                      onChange={(e) => setEditDepartement(e.target.value)}
                      placeholder="Ex: Abidjan, San-Pédro..."
                      className="bg-transparent text-sm outline-none flex-1"
                      style={{ color: "var(--gm-text)" }}
                    />
                  </div>
                ) : (
                  <p
                    className="text-sm flex items-center gap-2"
                    style={{ color: "var(--gm-text)" }}
                  >
                    <MapPin
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    {profile.departement || "—"}
                  </p>
                )}
              </div>

              {/* Village */}
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--gm-text-muted)" }}
                >
                  Village / Localité
                </label>
                {editing ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--gm-border)",
                      backgroundColor: "var(--gm-bg)",
                    }}
                  >
                    <MapPin
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    <input
                      type="text"
                      value={editVillage}
                      onChange={(e) => setEditVillage(e.target.value)}
                      placeholder="Ex: Méagui, Soubré..."
                      className="bg-transparent text-sm outline-none flex-1"
                      style={{ color: "var(--gm-text)" }}
                    />
                  </div>
                ) : (
                  <p
                    className="text-sm flex items-center gap-2"
                    style={{ color: "var(--gm-text)" }}
                  >
                    <MapPin
                      size={14}
                      style={{ color: "var(--gm-text-muted)" }}
                    />
                    {profile.village || "—"}
                  </p>
                )}
              </div>

              {/* Timestamps */}
              <div
                className="grid grid-cols-2 gap-4 pt-3 border-t"
                style={{ borderColor: "var(--gm-border)" }}
              >
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Rôle plateforme
                  </p>
                  <p className="text-sm" style={{ color: "var(--gm-text)" }}>
                    {profile.role || "—"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider mb-1"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Connexion
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{
                      color:
                        profile.statut_connexion === "en_ligne"
                          ? "var(--gm-success)"
                          : "var(--gm-text-muted)",
                    }}
                  >
                    <Clock size={12} />
                    {profile.statut_connexion === "en_ligne"
                      ? "En ligne"
                      : profile.statut_connexion === "hors_ligne"
                        ? "Hors ligne"
                        : profile.statut_connexion || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div
            className="rounded-xl border"
            style={{
              backgroundColor: "var(--gm-surface)",
              borderColor: "var(--gm-border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--gm-border)" }}
            >
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "var(--gm-text)" }}
              >
                <Key size={16} style={{ color: "var(--gm-warning)" }} />
                Sécurité
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {/* Password change */}
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--gm-text)" }}
                  >
                    Mot de passe
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--gm-text-muted)" }}
                  >
                    Changez votre mot de passe régulièrement
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordSection(!showPasswordSection);
                    setPasswordError(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--gm-accent)" }}
                >
                  {showPasswordSection ? "Annuler" : "Modifier"}
                </button>
              </div>

              {showPasswordSection && (
                <div
                  className="p-4 rounded-lg space-y-3"
                  style={{ backgroundColor: "var(--gm-bg)" }}
                >
                  {passwordError && (
                    <div
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        color: "var(--gm-danger)",
                      }}
                    >
                      <AlertTriangle size={12} />
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label
                      className="text-[10px] uppercase tracking-wider block mb-1.5"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Nouveau mot de passe
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: "var(--gm-border)",
                        backgroundColor: "var(--gm-surface)",
                      }}
                    >
                      <Key
                        size={14}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 caractères"
                        className="bg-transparent text-sm outline-none flex-1"
                        style={{ color: "var(--gm-text)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ color: "var(--gm-text-muted)" }}
                      >
                        {showNewPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      className="text-[10px] uppercase tracking-wider block mb-1.5"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Confirmer le mot de passe
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: "var(--gm-border)",
                        backgroundColor: "var(--gm-surface)",
                      }}
                    >
                      <Key
                        size={14}
                        style={{ color: "var(--gm-text-muted)" }}
                      />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez le mot de passe"
                        className="bg-transparent text-sm outline-none flex-1"
                        style={{ color: "var(--gm-text)" }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-colors w-full justify-center"
                    style={{ backgroundColor: "var(--gm-accent)" }}
                  >
                    {changingPassword ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Key size={14} />
                    )}
                    {changingPassword
                      ? "Modification..."
                      : "Changer le mot de passe"}
                  </button>
                </div>
              )}

              {/* Session info */}
              <div
                className="pt-3 border-t"
                style={{ borderColor: "var(--gm-border)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--gm-text)" }}
                    >
                      Session active
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--gm-text-muted)" }}
                    >
                      Connecté depuis ce navigateur
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--gm-success)" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--gm-success)" }}
                    />
                    Active
                  </span>
                </div>
              </div>

              {/* Logout */}
              <div
                className="pt-3 border-t"
                style={{ borderColor: "var(--gm-border)" }}
              >
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center hover:opacity-90"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "var(--gm-danger)",
                  }}
                >
                  {loggingOut ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  {loggingOut ? "Déconnexion en cours..." : "Se déconnecter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
