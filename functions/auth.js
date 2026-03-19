export async function onRequestPost(context) {
  const { request } = context;

  const body = await request.json();

  const API_URL = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

  const apiResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await apiResponse.json();

  if (!apiResponse.ok) {
    return new Response(JSON.stringify(data), {
      status: apiResponse.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (data.access_token) {
    headers.append(
      "Set-Cookie",
      `access_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
}
