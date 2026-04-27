export async function onRequestGet(context) {
  const cookie = context.request.headers.get("cookie") || "";

  const token = cookie
    .split(";")
    .find(c => c.trim().startsWith("access_token="));

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ authenticated: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
