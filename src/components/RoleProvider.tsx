"use client";

import { createClient } from "@/lib/supabase/client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface RoleContextType {
  gmRole: string | null;
  accessLevel: number;
  allowedPillars: string[];
  loading: boolean;
  userName: string;
  canAccessPillar: (pillar: string) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  gmRole: null,
  accessLevel: 99,
  allowedPillars: [],
  loading: true,
  userName: "",
  canAccessPillar: () => false,
});

export function useRole() {
  return useContext(RoleContext);
}

// Map pillar from navigation to route prefix
const PILLAR_ROUTE_MAP: Record<string, string> = {
  overview: "dashboard",
  finance: "finance",
  operations: "operations",
  audit: "audit",
  sav: "sav",
  product: "products",
  crm: "crm",
  compliance: "compliance",
  system: "system",
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const [gmRole, setGmRole] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState(99);
  const [allowedPillars, setAllowedPillars] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch staff info + profile name in parallel
        const [staffRes, profileRes] = await Promise.all([
          supabase
            .from("god_mode_staff")
            .select("gm_role, access_level")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single(),
          supabase
            .from("user_profile")
            .select("full_name")
            .eq("id", user.id)
            .single(),
        ]);

        if (profileRes.data?.full_name) {
          setUserName(profileRes.data.full_name);
        }

        if (!staffRes.data) {
          setLoading(false);
          return;
        }

        const role = staffRes.data.gm_role as string;
        const level = staffRes.data.access_level as number;
        setGmRole(role);
        setAccessLevel(level);

        // Fetch permissions for this role
        const { data: perms } = await supabase
          .from("god_mode_permissions")
          .select("pillar, can_read")
          .eq("gm_role", role)
          .eq("can_read", true);

        if (perms && perms.length > 0) {
          const pillars = perms.map((p: { pillar: string }) => p.pillar);
          // "all" means access to everything
          if (pillars.includes("all")) {
            setAllowedPillars([
              "overview",
              "finance",
              "operations",
              "audit",
              "sav",
              "product",
              "crm",
              "compliance",
              "system",
            ]);
          } else {
            // Always include overview (dashboard) for all staff
            const uniquePillars = ["overview", ...new Set(pillars)];
            setAllowedPillars(uniquePillars);
          }
        } else {
          // No permissions = dashboard only
          setAllowedPillars(["overview"]);
        }
      } catch (err) {
        console.error("[RoleProvider Error]", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoleData();
  }, [supabase]);

  const canAccessPillar = (pillar: string): boolean => {
    if (allowedPillars.includes("all")) return true;
    // Check both pillar name and route name
    if (allowedPillars.includes(pillar)) return true;
    // Check reverse mapping (route → pillar)
    const entry = Object.entries(PILLAR_ROUTE_MAP).find(
      ([, route]) => route === pillar,
    );
    if (entry && allowedPillars.includes(entry[0])) return true;
    return false;
  };

  return (
    <RoleContext.Provider
      value={{
        gmRole,
        accessLevel,
        allowedPillars,
        loading,
        userName,
        canAccessPillar,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
