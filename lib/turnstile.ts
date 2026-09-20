export async function verifyTurnstile(token: FormDataEntryValue | null, expectedAction: string) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  if (!process.env.TURNSTILE_SECRET) return true; // ponytail: widget not configured yet, don't lock everyone out

  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token }),
    });
    if (!r.ok) return false;
    const result = await r.json();
    return result.success === true && result.action === expectedAction;
  } catch {
    return false;
  }
}
