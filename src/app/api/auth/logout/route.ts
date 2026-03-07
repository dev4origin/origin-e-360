import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Logout Error]", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 },
    );
  }
}
