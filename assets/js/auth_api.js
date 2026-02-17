// Real auth helper (optional)
// If an API base URL is configured, login.html can use this to authenticate
// against the FastAPI backend and obtain a JWT.

(function(){
  function join(base, path){
    const b = (base || '').replace(/\/$/, '');
    const p = (path || '').startsWith('/') ? path : '/' + path;
    return b + p;
  }

  async function apiLogin(email, password, tenant){
    const base = window.NEN1090Config?.getApiBase?.() || '/api/v1';

    // Endpoint via Pages proxy
    const url = join(base, '/auth/login');

    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password, tenant })
    });

    if (!res.ok){
      const txt = await res.text().catch(()=>"");
      throw new Error(`LOGIN_FAILED:${res.status}:${txt.slice(0,120)}`);
    }

    const data = await res.json().catch(()=> ({}));
    // Accept common shapes:
    // {access_token, token_type}
    // {token}
    // In cookie-mode is a token not needed client-side; still accept common shapes.
    const token = data.access_token || data.token || data.jwt || "";
    return { token, data };
  }

  window.NEN1090ApiAuth = { apiLogin };
})();
