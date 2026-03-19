export async function onRequestPost() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    }
  });
}
