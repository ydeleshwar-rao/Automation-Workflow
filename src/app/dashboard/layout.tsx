import { SidebarProvider }    from "@/src/components/providers/sidebar-provider";
import { Shell }              from "@/src/components/layout/shell";
import { AccessBootstrap }    from "@/src/components/providers/access-bootstrap";
import { AccessReadyGate }    from "@/src/components/dashboard/select-client-gate";
import { DashboardSidebar }   from "@/src/components/dashboard/side-bar/ui/sidebar";
import { DashboardHeader }    from "@/src/components/dashboard/header/ui/header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AccessBootstrap />
      <Shell sidebar={<DashboardSidebar />} header={<DashboardHeader />}>
        <AccessReadyGate>
          {children}
        </AccessReadyGate>
      </Shell>
    </SidebarProvider>
  );
}
