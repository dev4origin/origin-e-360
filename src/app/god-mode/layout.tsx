import { RoleProvider } from "@/components/RoleProvider";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function GodModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <div
        className="flex min-h-screen"
        style={{ backgroundColor: "var(--gm-bg)" }}
      >
        <Sidebar />
        <div className="flex-1 ml-[260px] flex flex-col transition-all duration-300">
          <TopBar />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </RoleProvider>
  );
}
