document.addEventListener("DOMContentLoaded",()=>{
  if(document.querySelector(".site-header")) return;

  const header=document.createElement("header");
  header.className="site-header";
  header.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid rgba(255,255,255,0.08);background:#0b1220;position:sticky;top:0;z-index:1000">
    <a href="/nl/" style="display:flex;align-items:center;gap:12px;text-decoration:none">
      <img src="/assets/brand/weldinspect-logo.svg" style="height:42px"/>
    </a>
    <nav style="display:flex;gap:20px;font-size:14px">
      <a href="/nl/" style="color:#fff">Home</a>
      <a href="/nl/pricing" style="color:#fff">Pricing</a>
      <a href="https://app.weldinspectpro.com/login" style="color:#fff">Login</a>
    </nav>
  </div>`;

  document.body.prepend(header);
});