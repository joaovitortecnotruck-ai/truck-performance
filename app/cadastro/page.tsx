import Link from "next/link";
import { Logo } from "@/components/Logo";
import { signup } from "./actions";

export default function CadastroPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <div className="min-h-screen bg-base-900 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Logo />

        <div className="mt-8 rounded-card border border-base-800 bg-base-850 p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink-100">Criar conta</h1>
          <p className="mt-1 text-sm text-ink-500">
            Cadastre-se para enviar arquivos e acompanhar seus pedidos de remapeamento.
          </p>

          {searchParams?.error && (
            <p className="mt-4 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
              {searchParams.error}
            </p>
          )}

          <form action={signup} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo" name="nome" placeholder="Seu nome" className="sm:col-span-2" required />
            <Field label="Empresa (opcional)" name="empresa" placeholder="Nome da empresa" className="sm:col-span-2" />
            <Field label="CPF ou CNPJ" name="documento" placeholder="000.000.000-00" required />
            <Field label="E-mail" name="email" type="email" placeholder="voce@empresa.com" required />
            <Field label="Telefone" name="telefone" placeholder="(00) 00000-0000" required />
            <Field label="WhatsApp" name="whatsapp" placeholder="(00) 00000-0000" required />
            <Field label="Cidade" name="cidade" placeholder="Sua cidade" required />
            <Field label="Estado" name="estado" placeholder="UF" required />
            <Field label="Senha" name="senha" type="password" placeholder="••••••••" required minLength={6} />
            <Field label="Confirmar senha" name="senha2" type="password" placeholder="••••••••" required minLength={6} />

            <label className="flex items-start gap-2 text-[12.5px] text-ink-500 sm:col-span-2">
              <input
                type="checkbox"
                name="termos"
                required
                className="mt-0.5 h-3.5 w-3.5 rounded border-base-600 bg-base-800 accent-accent"
              />
              Li e aceito os termos de uso e a política de privacidade da Truck Performance.
            </label>

            <button
              type="submit"
              className="mt-2 flex h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-600 sm:col-span-2"
            >
              Criar conta
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-500">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-ink-100 hover:text-accent">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] text-ink-300 ${className ?? ""}`}>
      {label}
      <input
        {...props}
        className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100 placeholder:text-ink-500"
      />
    </label>
  );
}
