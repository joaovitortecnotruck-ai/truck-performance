import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { NovoPedidoForm } from "./NovoPedidoForm";
import { createClient } from "@/lib/supabase/server";

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = user?.email ?? "Cliente";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: services } = await supabase
    .from("services")
    .select("code, name, category, description, price")
    .eq("active", true)
    .order("sort_order");

  const { data: veiculosSalvos } = await supabase
    .from("vehicles")
    .select("id, brand, model, engine, year, mileage, plate, ecu_model, tcu_model")
    .eq("client_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="cliente" />
      <div className="flex-1">
        <Topbar
          title="Novo pedido"
          subtitle="Preencha os dados do veículo, selecione o serviço e opcionais desejados."
          userName={nomeExibido}
        />
        <main className="px-8 py-6">
          {searchParams?.error && (
            <p className="mb-6 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
              {searchParams.error}
            </p>
          )}
          <NovoPedidoForm services={services ?? []} veiculosSalvos={veiculosSalvos ?? []} />
        </main>
      </div>
    </div>
  );
}
