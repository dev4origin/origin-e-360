import {
  createServerSupabase,
  createServiceRoleSupabase,
} from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Roles that map to a god_mode_staff entry
const GM_ROLES = [
  "god_admin",
  "coo",
  "cfo",
  "cto",
  "head_audit",
  "head_sav",
  "head_sales",
  "auditor_internal",
  "sav_agent",
  "sales_rep",
] as const;

const ACCESS_LEVELS: Record<string, number> = {
  god_admin: 0,
  coo: 1,
  cfo: 1,
  cto: 1,
  head_audit: 2,
  head_sav: 2,
  head_sales: 2,
  auditor_internal: 3,
  sav_agent: 3,
  sales_rep: 3,
};

// Platform roles for user_profile
const PLATFORM_ROLES = [
  "admin",
  "auditor",
  "agent",
  "cooperative",
  "exportateur",
  "producteur",
] as const;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an authenticated god_admin
    const serverSupabase = await createServerSupabase();
    const {
      data: { user: caller },
    } = await serverSupabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: callerStaff } = await serverSupabase
      .from("god_mode_staff")
      .select("gm_role, access_level")
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .single();

    if (!callerStaff || callerStaff.gm_role !== "god_admin") {
      return NextResponse.json(
        { error: "Accès refusé — rôle god_admin requis" },
        { status: 403 },
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      telephone,
      departement,
      role, // platform role for user_profile
      gm_role, // optional god_mode_staff role
      village,
    } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        {
          error: "Champs requis : email, password, full_name",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 },
      );
    }

    // 3. Create the auth user via service_role
    const adminSupabase = createServiceRoleSupabase();
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm the email
        user_metadata: {
          full_name,
          role: role || "agent",
        },
      });

    if (authError) {
      return NextResponse.json(
        { error: `Erreur auth : ${authError.message}` },
        { status: 400 },
      );
    }

    const newUserId = authData.user.id;

    // 4. Create user_profile entry
    const { error: profileError } = await adminSupabase
      .from("user_profile")
      .upsert({
        id: newUserId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        telephone: telephone?.trim() || null,
        departement: departement?.trim() || null,
        village: village?.trim() || null,
        role: role || "agent",
        statut_connexion: false,
      });

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Erreur profil : ${profileError.message}` },
        { status: 500 },
      );
    }

    // 5. If a GM role is specified, add to god_mode_staff
    let staffCreated = false;
    if (gm_role && GM_ROLES.includes(gm_role)) {
      const { error: staffError } = await adminSupabase
        .from("god_mode_staff")
        .insert({
          user_id: newUserId,
          gm_role,
          department: departement?.trim() || null,
          access_level: ACCESS_LEVELS[gm_role] ?? 4,
          is_active: true,
        });

      if (staffError) {
        console.error("Staff insert error (non-blocking):", staffError.message);
      } else {
        staffCreated = true;
      }
    }

    return NextResponse.json({
      success: true,
      user_id: newUserId,
      email,
      full_name,
      role: role || "agent",
      gm_role: gm_role || null,
      staff_created: staffCreated,
    });
  } catch (err: unknown) {
    console.error("create-user API error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur interne du serveur",
      },
      { status: 500 },
    );
  }
}
