import Script from "next/script";

// ponytail: travamos o botão de envio até o Turnstile confirmar, senão em
// conexão lenta o usuário consegue enviar o formulário antes do widget
// carregar, o token vem vazio e ele perde tudo que preencheu.
export function TurnstileWidget({ action }: { action: string }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!sitekey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <Script id="turnstile-gate" strategy="afterInteractive">
        {`
          document.querySelectorAll('[data-turnstile-gate]').forEach(function (b) { b.disabled = true; });
          window.tpTurnstileReady = function () {
            document.querySelectorAll('[data-turnstile-gate]').forEach(function (b) { b.disabled = false; });
          };
          window.tpTurnstileReset = function () {
            document.querySelectorAll('[data-turnstile-gate]').forEach(function (b) { b.disabled = true; });
          };
        `}
      </Script>
      <div
        className="cf-turnstile"
        data-sitekey={sitekey}
        data-action={action}
        data-callback="tpTurnstileReady"
        data-expired-callback="tpTurnstileReset"
        data-error-callback="tpTurnstileReset"
      />
    </>
  );
}
