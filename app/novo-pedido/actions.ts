"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrder(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const marca = String(formData.get("marca") ?? "").trim();
  const modelo = String(formData.get("modelo") ?? "").trim();
  const motorizacao = String(formData.get("motorizacao") ?? "").trim();
  const ano = String(formData.get("ano") ?? "").trim();
  const km = String(formData.get("km") ?? "").trim();
  const placa = String(formData.get("placa") ?? "").trim();
  const ecu = String(formData.get("ecu") ?? "").trim();
  const tcu = String(formData.get("tcu") ?? "").trim();
  const equipamento = String(formData.get("equipamento") ?? "").trim();
  const metodo = String(formData.get("metodo") ?? "").trim();
  const stageCode = String(formData.get("stageCode") ?? "").trim();
  const opcionaisCodes = formData.getAll("opcionais").map(String).filter(Boolean);
  const descricaoServico = String(formData.get("descricaoServico") ?? "").trim();
  const declaracao = formData.get("declaracao");
  // O arquivo já foi enviado direto do navegador para o Storage (ver lib/upload.ts).
  const arquivoPath = String(formData.get("arquivoPath") ?? "");
  const arquivoNome = String(formData.get("arquivoNome") ?? "");
  const arquivoTamanho = Number(formData.get("arquivoTamanho") ?? 0);
  const arquivoSha256 = String(formData.get("arquivoSha256") ?? "");
  const vehicleId = String(formData.get("vehicleId") ?? "").trim();

  if (!marca || !modelo || !placa || !stageCode) {
    redirect(
      "/novo-pedido?error=" +
        encodeURIComponent("Preencha os dados obrigatórios do veículo e escolha um serviço.")
    );
  }
  if (!declaracao) {
    redirect("/novo-pedido?error=" + encodeURIComponent("Confirme a declaração antes de enviar."));
  }
  if (!arquivoPath.startsWith(`${user!.id}/`) || !arquivoNome || arquivoTamanho <= 0) {
    redirect("/novo-pedido?error=" + encodeURIComponent("Anexe o arquivo original."));
  }

  const codigosServico = [stageCode, ...opcionaisCodes];
  const { data: servicos, error: servicosError } = await supabase
    .from("services")
    .select("code, name, category, price")
    .in("code", codigosServico)
    .eq("active", true);

  if (servicosError || !servicos || servicos.length === 0) {
    redirect("/novo-pedido?error=" + encodeURIComponent("Não foi possível validar os serviços selecionados."));
  }

  const stageServico = servicos!.find((s) => s.code === stageCode);
  if (!stageServico) {
    redirect("/novo-pedido?error=" + encodeURIComponent("Serviço principal inválido."));
  }

  const emissionsRelated = servicos!.some((s) => s.category === "emissions");

  let vehicle: { id: string } | null = vehicleId ? { id: vehicleId } : null;

  if (!vehicle) {
    const { data: novoVeiculo, error: vehicleError } = await supabase
      .from("vehicles")
      .insert({
        client_id: user!.id,
        brand: marca,
        model: modelo,
        engine: motorizacao || null,
        year: ano ? Number(ano) : null,
        mileage: km ? Number(km.replace(/\D/g, "")) || null : null,
        plate: placa,
        ecu_model: ecu || null,
        tcu_model: tcu || null,
      })
      .select("id")
      .single();

    if (vehicleError || !novoVeiculo) {
      redirect("/novo-pedido?error=" + encodeURIComponent("Não foi possível salvar os dados do veículo."));
    }
    vehicle = novoVeiculo!;
  }

  const outrosServicos = servicos!.filter((s) => s.code !== stageCode).map((s) => s.name);
  const requestedService =
    [stageServico!.name, ...outrosServicos].join(" + ") + (descricaoServico ? ` — ${descricaoServico}` : "");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      client_id: user!.id,
      vehicle_id: vehicle!.id,
      requested_service: requestedService,
      status: "received",
      total_price: 0,
      emissions_related: emissionsRelated,
      read_method: metodo || null,
      tool: equipamento && equipamento !== "Selecione" ? equipamento : null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    redirect("/novo-pedido?error=" + encodeURIComponent("Não foi possível criar o pedido."));
  }

  const itemsPayload = servicos!.map((s) => ({
    order_id: order!.id,
    service_code: s.code,
    service_name: s.name,
    category: s.category,
    unit_price: s.price,
  }));

  const [, { error: fileError }] = await Promise.all([
    supabase.from("order_items").insert(itemsPayload),
    supabase.from("files").insert({
      order_id: order!.id,
      uploaded_by: user!.id,
      file_type: "original",
      original_name: arquivoNome,
      storage_path: arquivoPath,
      size_bytes: arquivoTamanho,
      sha256: arquivoSha256 || null,
    }),
  ]);

  if (fileError) {
    redirect(
      "/dashboard?error=" +
        encodeURIComponent(`Pedido ${order!.order_number} criado, mas o arquivo não foi vinculado. Envie pelo chat.`)
    );
  }

  redirect("/dashboard?success=" + encodeURIComponent(`Pedido ${order!.order_number} criado com sucesso!`));
}
