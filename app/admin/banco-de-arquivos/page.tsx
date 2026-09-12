import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { FilesTable } from "./FilesTable";

export const dynamic = "force-dynamic";

export default async function BancoDeArquivosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeExibido = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile?.name) nomeExibido = profile.name;
  }

  const { data: arquivos } = await supabase
    .from("files")
    .select(
      "id, file_type, original_name, hw, sw, sha256, size_bytes, storage_path, created_at, orders(order_number, profiles(name), vehicles(brand, model, engine, ecu_model))"
    )
    .order("created_at", { ascending: false });

  const linhas = await Promise.all(
    (arquivos ?? []).map(async (f) => {
      const { data } = await supabase.storage.from("ecu-files").createSignedUrl(f.storage_path, 600);
      return { ...f, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex min-h-screen bg-base-950">
      <Sidebar variant="admin" />
      <div className="flex-1">
        <Topbar
          title="Banco de arquivos"
          subtitle="Busca por arquivo, cliente, veículo, ECU, HW e SW."
          userName={nomeExibido}
          notificationSlot={<NotificationBell />}
        />
        <main className="px-8 py-6">
          <FilesTable arquivos={linhas} />
        </main>
      </div>
    </div>
  );
}
