import Link from "next/link";
import { Logo } from "@/components/Logo";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
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
          <p className="mt-4 max-w-sm text-sm text-ink-500">
            Plataforma oficial Truck Performance para gerenciamento de arquivos
            de ECU e TCU.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-base-900 px-8 py-12 sm:px-14">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink-100">Entrar</h1>
        <p className="mt-1 text-sm text-ink-500">Acesse sua conta para gerenciar seus pedidos.</p>

        {searchParams?.message && (
          <p className="mt-4 rounded-[8px] border border-ok/30 bg-ok/10 px-3.5 py-2.5 text-[13px] text-ok">
            {searchParams.message}
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-4 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-400">
            {searchParams.error}
          </p>
        )}

        <form action={login} className="mt-8 flex flex-col gap-4">
          <Field label="E-mail" type="email" name="email" placeholder="voce@empresa.com" required />
          <Field label="Senha" type="password" name="password" placeholder="••••••••" required />

          <div className="flex items-center justify-between text-[13px]">
            <label className="flex items-center gap-2 text-ink-500">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-base-600 bg-base-800 accent-accent" />
              Manter conectado
            </label>
            <Link href="/recuperar-senha" className="text-ink-500 hover:text-ink-300">
              Esqueci minha senha
            </Link>
          </div>

          <button
            type="submit"
            className="mt-2 flex h-11 items-center justify-center rounded-[8px] bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            Entrar
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-ink-500">
          Ainda não tem uma conta?{" "}
          <Link href="/cadastro" className="font-medium text-ink-100 hover:text-accent">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-ink-300">
      {label}
      <input
        {...props}
        className="h-11 rounded-[8px] border border-base-700 bg-base-800 px-3.5 text-sm text-ink-100 placeholder:text-ink-500"
      />
    </label>
  );
}
