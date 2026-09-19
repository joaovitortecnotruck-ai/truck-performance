"use server";

import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

async function sha256File(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buf).digest("hex");
}

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
  const arquivo = formData.get("arquivoOriginal");
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
  if (!(arquivo instanceof File) || arquivo.size === 0) {
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

  async function enviarArquivoOriginal() {
    if (!(arquivo instanceof File)) return;
    const path = `${user!.id}/${order!.id}/original/${arquivo.name}`;
    const { error: uploadError } = await supabase.storage
      .from("ecu-files")
      .upload(path, arquivo, { contentType: arquivo.type || "application/octet-stream" });

    if (!uploadError) {
      const sha256 = await sha256File(arquivo);
      await supabase.from("files").insert({
        order_id: order!.id,
        uploaded_by: user!.id,
        file_type: "original",
        original_name: arquivo.name,
        storage_path: path,
        size_bytes: arquivo.size,
        sha256,
      });
    }
  }

  await Promise.all([supabase.from("order_items").insert(itemsPayload), enviarArquivoOriginal()]);

  redirect("/dashboard?success=" + encodeURIComponent(`Pedido ${order!.order_number} criado com sucesso!`));
}
