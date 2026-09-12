import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { PricingTable } from "./PricingTable";

export const dynamic = "force-dynamic";

export default async function PrecificacaoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, code, name, description, category, price, active")
    .order("sort_order");

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Precificação"
          subtitle="Gerencie os valores de Stages e opcionais."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />
        <main className="px-8 py-6">
          <PricingTable services={services ?? []} />
        </main>
      </div>
    </div>
  );
}
