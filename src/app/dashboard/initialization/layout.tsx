import { AdminAccessGuard } from "@/components/admin-access-guard"

export default function InitializationLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccessGuard>{children}</AdminAccessGuard>
}
