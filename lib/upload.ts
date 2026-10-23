import { createClient } from "@/lib/supabase/client";

// Upload direto do navegador para o Supabase Storage.
// Passar pelo servidor (Server Action) esbarra no limite de 4,5 MB de corpo da Vercel,
// e arquivos de ECU (.bin, .xcal, sem extensão...) passam disso com frequência.

// O Storage recusa acentos e alguns símbolos na chave; o nome original continua salvo na tabela files.
export function safeFileName(name: string) {
  const limpo = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-() ]+/g, "_")
    .trim();
  return limpo || "arquivo";
}

async function sha256Hex(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function uploadEcuFile(file: File, folder: string) {
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const supabase = createClient();
  const [{ error }, sha256] = await Promise.all([
    supabase.storage.from("ecu-files").upload(path, file, { contentType: "application/octet-stream" }),
    sha256Hex(file),
  ]);
  if (error) throw new Error(error.message);
  return { path, sha256, name: file.name, size: file.size };
}
