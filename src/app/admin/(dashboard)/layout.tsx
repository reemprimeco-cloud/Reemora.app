import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ToastProvider } from "@/components/toast-provider";
import { ConfirmProvider } from "@/components/confirm-dialog";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="grid min-h-screen grid-cols-1 bg-surface-alt md:grid-cols-[250px_1fr]">
          <AdminSidebar />
          <main className="p-5 md:p-9">{children}</main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
