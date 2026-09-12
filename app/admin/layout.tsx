import { NotificationProvider } from "@/components/admin/NotificationProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
