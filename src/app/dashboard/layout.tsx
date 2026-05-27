import { SidebarProvider }   from "@/src/components/providers/sidebar-provider";
import { Shell }             from "@/src/components/layout/shell";
import { AccessBootstrap }   from "@/src/components/providers/access-bootstrap";
import { AccessReadyGate }   from "@/src/components/dashboard/select-client-gate";
import { DashboardSidebar }  from "@/src/components/dashboard/side-bar/ui/sidebar";
import { DashboardTopBar }   from "@/src/components/layout/topbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AccessBootstrap />
      <Shell
        sidebar={<DashboardSidebar />}
        topbar={<DashboardTopBar />}
      >
        <AccessReadyGate>
          {children}
        </AccessReadyGate>
      </Shell>
    </SidebarProvider>
  );
}
