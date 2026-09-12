import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { OrdersTable } from "./OrdersTable";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/admin/NotificationBell";

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: pedidos } = await supabase
    .from("orders")
    .select("id, order_number, requested_service, status, payment_status, total_price, created_at, vehicles(brand, model, plate, ecu_model), profiles(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Pedidos"
          subtitle="Gerencie, filtre e acompanhe todos os pedidos."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />
        <main className="px-8 py-6">
          <OrdersTable pedidos={pedidos ?? []} />
        </main>
      </div>
    </div>
  );
}
