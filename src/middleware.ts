import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }[],
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If accessing /god-mode routes, verify authentication
    if (request.nextUrl.pathname.startsWith("/god-mode")) {
      if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check if user is God Mode staff
      const { data: staff } = await supabase
        .from("god_mode_staff")
        .select("id, gm_role, access_level, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!staff) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Add God Mode info to headers for downstream use
      response.headers.set("x-gm-role", staff.gm_role);
      response.headers.set("x-gm-level", String(staff.access_level));
      response.headers.set("x-gm-staff-id", staff.id);

      // ── Route-level access control based on permissions ──
      const path = request.nextUrl.pathname;
      // Pages that all staff can access
      const openPages = ["/god-mode/dashboard", "/god-mode/profile"];
      const isOpenPage = openPages.some(
        (p) => path === p || path.startsWith(p + "/"),
      );

      if (!isOpenPage && staff.gm_role !== "god_admin") {
        // Map route prefix → pillar name in god_mode_permissions
        const routeToPillar: Record<string, string> = {
          "/god-mode/finance": "finance",
          "/god-mode/operations": "operations",
          "/god-mode/audit": "audit",
          "/god-mode/sav": "sav",
          "/god-mode/products": "product",
          "/god-mode/crm": "crm",
          "/god-mode/compliance": "compliance",
          "/god-mode/system": "system",
        };

        const matchedEntry = Object.entries(routeToPillar).find(
          ([prefix]) => path === prefix || path.startsWith(prefix + "/"),
        );

        if (matchedEntry) {
          const requiredPillar = matchedEntry[1];
          // Check if user's role has can_read on this pillar (or "all")
          const { data: perm } = await supabase
            .from("god_mode_permissions")
            .select("id")
            .eq("gm_role", staff.gm_role)
            .eq("can_read", true)
            .or(`pillar.eq.${requiredPillar},pillar.eq.all`)
            .limit(1);

          if (!perm || perm.length === 0) {
            // No permission → redirect to dashboard
            return NextResponse.redirect(
              new URL("/god-mode/dashboard", request.url),
            );
          }
        }
      }
    }

    // Redirect root to god-mode dashboard
    if (request.nextUrl.pathname === "/") {
      if (user) {
        return NextResponse.redirect(
          new URL("/god-mode/dashboard", request.url),
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  } catch (e) {
    console.error("[Middleware Error]", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
