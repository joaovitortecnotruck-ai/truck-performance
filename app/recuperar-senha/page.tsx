import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requestPasswordReset } from "./actions";

export default function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams?: { error?: string; success?: string };
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_440px]">
      <div className="grid-texture relative hidden overflow-hidden bg-base-950 lg:flex lg:flex-col lg:justify-end lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/60 to-transparent" />
        <div className="relative">
          <Logo />
          <p className="mt-8 max-w-md font-display text-4xl font-semibold leading-tight text-ink-100">
            Envie, acompanhe e receba seus arquivos de remapeamento em um só lugar.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-base-900 px-8 py-12 sm:px-14">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink-100">Recuperar senha</h1>
        <p className="mt-1 text-sm text-ink-500">
          Informe seu e-mail para receber um link de redefinição de senha.
        </p>

        {searchParams?.success && (
          <p className="mt-4 rounded-[8px] border border-ok/30 bg-ok/10 px-3.5 py-2.5 text-[13px] text-ok">
            {searchParams.success}
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-4 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
            {searchParams.error}
          </p>
        )}

        <form action={requestPasswordReset} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
            E-mail
            <input
              type="email"
              name="email"
              required
              placeholder="voce@empresa.com"
              className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100 placeholder:text-ink-500"
            />
          </label>

          <button
            type="submit"
            className="mt-2 flex h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            Enviar link de redefinição
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-ink-500">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-ink-100 hover:text-accent">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
