import { CreditsAdminDashboard } from "@/components/admin/credits-admin-dashboard";
import { requireAdminPageAccess } from "@/lib/admin/auth";

export default async function AdminPage() {
  const admin = await requireAdminPageAccess();

  return <CreditsAdminDashboard adminEmail={admin.email} />;
}
