// Renders the screenshot-judge benchmark images with headless Chrome.
// Run: node scripts/render-screens.mjs   (writes public/bench/ui/*.png)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = resolve("public/bench/ui");

const base = `
  * { box-sizing: border-box; }
  body { margin: 0; width: 480px; height: 360px; display: grid; place-items: center;
         font: 15px/1.4 -apple-system, Helvetica, Arial, sans-serif; background: #eef1f5; color: #1c2430; }
  .card { width: 320px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 10px #0002; }
  h2 { margin: 0 0 12px; font-size: 20px; }
  input { width: 100%; padding: 10px; margin: 6px 0; border: 1px solid #c8d0da; border-radius: 6px; font: inherit; }
  button { width: 100%; padding: 10px; margin-top: 10px; border: 0; border-radius: 6px; background: #2f6fed; color: #fff; font: inherit; font-weight: 600; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e9ef; }
  .avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #7aa7ff, #2f6fed); }
  .price { font-size: 34px; font-weight: 700; }
  .muted { color: #5b6675; }
`;

const login = (extra = "", buttonStyle = "") => `
  <div class="card" style="${extra}">
    <h2>Sign in</h2>
    <input placeholder="Email" />
    <input placeholder="Password" type="password" />
    <button style="${buttonStyle}">Continue</button>
  </div>`;

const pricing = (priceStyle = "", cardStyle = "") => `
  <div class="card" style="${cardStyle}">
    <h2>Pro plan</h2>
    <div class="price" style="${priceStyle}">€12<span class="muted" style="font-size:15px">/month</span></div>
    <p class="muted" style="${cardStyle ? "color:#e4e7eb" : ""}">Unlimited projects and priority support.</p>
    <button>Upgrade</button>
  </div>`;

const profile = (name = "Ada Novak", img = '<div class="avatar"></div>', nameStyle = "") => `
  <div class="card" style="display:flex; gap:16px; align-items:center">
    ${img}
    <div style="min-width:0">
      <h2 style="margin:0; ${nameStyle}">${name}</h2>
      <div class="muted">Product designer · Prague</div>
    </div>
  </div>`;

const settings = (labelStyle = "", cardStyle = "") => `
  <div class="card" style="${cardStyle}">
    <h2>Settings</h2>
    <div class="row"><span style="${labelStyle}">Email notifications for every new comment on your projects</span><span>On</span></div>
    <div class="row"><span>Dark mode</span><span>Auto</span></div>
    <div class="row"><span>Language</span><span>English</span></div>
  </div>`;

const SCREENS = {
  "login-ok": login(),
  "pricing-ok": pricing(),
  "profile-ok": profile(),
  "settings-ok": settings("display:block; max-width:200px"),
  "login-overlap": login("", "margin-top:-58px; position:relative"),
  "pricing-overlap": pricing("margin-top:-34px"),
  "profile-overflow": profile(
    "Alexandra Konstantinopoulou-Wiśniewska",
    '<div class="avatar" style="flex:none"></div>',
    "white-space:nowrap; overflow:visible; width:150px",
  ),
  "settings-overflow": settings("display:block; max-width:200px", "height:130px; overflow:visible"),
  "profile-missing-image": profile(
    "Ada Novak",
    '<img src="https://invalid.example/avatar.png" alt="avatar" width="64" height="64" style="border:1px solid #c8d0da">',
  ),
  "product-missing-image": `
    <div class="card">
      <img src="https://invalid.example/shoe.jpg" alt="Running shoe" width="272" height="150" style="display:block; border:1px solid #c8d0da; background:#f4f6f8">
      <h2 style="margin-top:12px">Trail runner 3</h2>
      <div class="muted">€89 · free returns</div>
    </div>`,
  "pricing-low-contrast": pricing("color:#d9dde2", "color:#dfe3e8"),
  "login-low-contrast": `
    <div class="card" style="background:#141414; color:#2a2a2a">
      <h2>Sign in</h2>
      <input placeholder="Email" style="background:#1b1b1b; border-color:#222" />
      <input placeholder="Password" type="password" style="background:#1b1b1b; border-color:#222" />
      <button style="background:#1e1e1e; color:#303030">Continue</button>
    </div>`,
};

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "screens-"));
for (const [id, body] of Object.entries(SCREENS)) {
  const html = join(work, `${id}.html`);
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${base}</style>${body}`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=480,360",
    `--screenshot=${join(OUT, `${id}.png`)}`,
    `file://${html}`,
  ], { stdio: "ignore" });
  console.log("rendered", id);
}
