import { SidebarProvider } from "@/src/components/providers/sidebar-provider";
import { Shell } from "@/src/components/layout/shell";
import { AccessBootstrap } from "@/src/components/providers/access-bootstrap";
import { AdminGuard } from "@/src/components/providers/admin-guard";
import { DashboardSidebar } from "@/src/components/dashboard/side-bar/ui/sidebar";
import { DashboardHeader } from "@/src/components/dashboard/header/ui/header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AccessBootstrap />
      <Shell sidebar={<DashboardSidebar />} header={<DashboardHeader />}>
        <AdminGuard>{children}</AdminGuard>
      </Shell>
    </SidebarProvider>
  );
}
