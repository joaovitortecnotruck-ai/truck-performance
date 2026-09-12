"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Check } from "lucide-react";
import { clsx } from "clsx";
import { updateUserRole } from "./actions";

const ROLES = [
  { value: "client", label: "Cliente" },
  { value: "admin", label: "Admin" },
  { value: "technician", label: "Técnico / Tuner" },
  { value: "reseller", label: "Revendedor" },
  { value: "support", label: "Suporte" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium",
        pending ? "cursor-not-allowed bg-base-800 text-ink-500" : "bg-base-700 text-ink-100 hover:bg-base-600"
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Salvar
    </button>
  );
}

export function UserRoleForm({ userId, role }: { userId: string; role: string }) {
  return (
    <form action={updateUserRole} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        className="h-9 rounded-[8px] border border-base-700 bg-base-800 px-2.5 text-[12px] text-ink-100"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  );
}
