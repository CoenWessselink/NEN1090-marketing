const DEFAULT_BACKEND_API_BASE = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

export async function onRequest(context) {
  const { env } = context;
  return new Response(
    JSON.stringify(
      {
        TURNSTILE_SITEKEY: env.TURNSTILE_SITEKEY || "",
        REQUIRE_TURNSTILE: env.REQUIRE_TURNSTILE ?? "1",
        BACKEND_API_BASE: env.BACKEND_API_BASE || DEFAULT_BACKEND_API_BASE,
        CHECKOUT_RETURN_BASE: env.CHECKOUT_RETURN_BASE || "",
      },
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}
