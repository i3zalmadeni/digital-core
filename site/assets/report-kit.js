/* النواة الرقمية · أداة الطباعة الموحدة لكل الأنظمة (ReportKit)
   هوية A4 واحدة: ترويسة (كليشة الوزارة يمينًا، شعارا النواة الرقمية ووزارة التعليم في الوسط، بيانات الإصدار يسارًا)
   وتذييل (النظام المُصدِر، رقم الصفحة، النواة الرقمية، رمز QR للتحقق) في كل صفحة، وعنوان بارز في إطار.
   الصفحات تُقسَّم مسبقًا بالقياس فتظهر كما هي في كروم وسفاري وصفحة التحقق، ويُسجَّل كل تقرير في core_report_issues.

   الاستخدام (يُستدعى مباشرة من ضغطة الزر حتى لا تُحجب النافذة):
     ReportKit.print({ sb, system: "mirat", systemName: "مرآة | الملف الشامل", title, sub, body, issuer, year })
     ReportKit.printElement(el, { ...نفس الخيارات })   // يطبع محتوى عنصر قائم بأنماط صفحته
   خيارات أخرى: systemLogo (رابط شعار النظام، الافتراضي favicon.svg للنظام)، styles (CSS إضافي)، fname،
   flow (تدفق متصل: القسم يكمل في الصفحة نفسها ويُقسَّم عند نهايتها، ولا ينتقل لصفحة جديدة إلا إذا لم يتسع شيء بعد عنوانه)،
   publicFull (عرض النسخة الكاملة للعامة في صفحة التحقق؛ الافتراضي لا)، inheritCss (تضمين أنماط الصفحة). */
(() => {
  if (window.ReportKit) return;
  const SRC = (document.currentScript && document.currentScript.src) || "https://i3zalmadeni.github.io/digital-core/assets/report-kit.js";
  const CORE = SRC.replace(/assets\/report-kit\.js.*$/, "");               // .../digital-core/
  const VERIFY = CORE + "verify/";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dstr = (d) => new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" });
  const fmtCode = (c) => c.replace(/(.{4})(?=.)/g, "$1-");
  const UA = navigator.userAgent;
  // سفاري (وكل متصفحات iOS) يطبع بهوامشه الخاصة ويصغّر المحتوى: صفحة أقصر حتى لا يُقص التذييل
  const WEBKIT = (/AppleWebKit/.test(UA) && !/Chrome|Chromium|CriOS|Edg|Android/.test(UA)) || /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const PAGE_H = WEBKIT ? 274 : 286, PAGE_W = 200;   // مم داخل هوامش 5 مم (A4 = 210×297)

  /* ---------- رمز QR (وضع البايت، تصحيح M، الإصدارات 1–20) ---------- */
  const QR = (() => {
    const CW = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26], NB = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
    const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
    const dataCw = (v) => Math.floor(rawModules(v) / 8) - CW[v - 1] * NB[v - 1];
    const alignPos = (v) => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6]; for (let p = v * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p); return r; };
    const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; };
    const rsDiv = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
    const rsRem = (data, div) => { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; };
    function encode(text) {
      const bytes = [...new TextEncoder().encode(text)];
      let v = 1; for (; v <= 20; v++) if (4 + (v <= 9 ? 8 : 16) + bytes.length * 8 <= dataCw(v) * 8) break;
      if (v > 20) throw new Error("QR too long");
      const cap = dataCw(v) * 8, bits = [], put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
      put(4, 4); put(bytes.length, v <= 9 ? 8 : 16); bytes.forEach((b) => put(b, 8)); put(0, Math.min(4, cap - bits.length)); put(0, (8 - (bits.length % 8)) % 8);
      for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
      const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
      const nb = NB[v - 1], ecl = CW[v - 1], raw = Math.floor(rawModules(v) / 8), nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = rsDiv(ecl), blocks = [];
      for (let i = 0, k = 0; i < nb; i++) { const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1)); k += dat.length; const ecc = rsRem(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
      const all = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) all.push(b[i]); });
      const size = v * 4 + 17, M = Array.from({ length: size }, () => new Array(size).fill(false)), F = Array.from({ length: size }, () => new Array(size).fill(false));
      const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
      for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
      const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      const ap = alignPos(v), na = ap.length;
      for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) { if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
      const drawFormat = (mask) => { const d = mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
        for (let i = 0; i <= 5; i++) set(8, i, bit(i)); set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
        for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i)); set(8, size - 8, true); };
      drawFormat(0);
      if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (v << 12) | r; for (let i = 0; i < 18; i++) { const bt = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, bt); set(c, a, bt); } }
      let i = 0;
      for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert; if (!F[y][x] && i < all.length * 8) { M[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
      const mf = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
      const apply = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && mf[m](x, y)) M[y][x] = !M[y][x]; };
      const penalty = () => { let p = 0; const line = (g) => { for (let a = 0; a < size; a++) { let run = 1; for (let b = 1; b < size; b++) { if (g(a, b) === g(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } } };
        line((a, b) => M[a][b]); line((a, b) => M[b][a]);
        for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
        const pat = [true, false, true, true, true, false, true], fl = (g) => { for (let a = 0; a < size; a++) for (let b = 0; b + 7 <= size; b++) { if (!pat.every((t, k) => g(a, b + k) === t)) continue; if ((b >= 4 && [1, 2, 3, 4].every((k) => !g(a, b - k))) || (b + 11 <= size && [7, 8, 9, 10].every((k) => !g(a, b + k)))) p += 40; } };
        fl((a, b) => M[a][b]); fl((a, b) => M[b][a]);
        let dark = 0; M.forEach((r) => r.forEach((c) => { if (c) dark++; })); const t = size * size; p += Math.max(0, Math.ceil(Math.abs(dark * 20 - t * 10) / t) - 1) * 10; return p; };
      let best = 0, bp = Infinity; for (let m = 0; m < 8; m++) { apply(m); drawFormat(m); const pv = penalty(); if (pv < bp) { bp = pv; best = m; } apply(m); }
      apply(best); drawFormat(best); return M;
    }
    const svg = (text, size = 57) => { const M = encode(text), n = M.length, q = 4, s = n + q * 2; let d = ""; M.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + q} ${y + q}h1v1h-1z`; }));
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#0d2b45"/></svg>`; };
    return { encode, svg };
  })();

  /* ---------- الأنماط: كل شيء تحت #rkRoot وبادئة rk- حتى لا يتعارض مع أنماط الأنظمة ---------- */
  const css = () => `@page{size:A4 portrait;margin:5mm}
html,body{margin:0!important;padding:0!important;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{display:block!important;min-height:0!important}
#rkRoot{direction:rtl;font:13px/1.8 Tajawal,"Segoe UI",Tahoma,sans-serif;color:#0d2b45}#rkRoot *{box-sizing:border-box}
#rkRoot .rk-page{position:relative;width:${PAGE_W}mm;height:${PAGE_H}mm;overflow:hidden;background:#fff;display:flex;flex-direction:column;break-after:page;page-break-after:always;margin:0}
#rkRoot .rk-page:last-child{break-after:auto;page-break-after:auto}
#rkRoot .rk-body{flex:1;min-height:0;padding:0 1mm}
#rkRoot .rk-u{display:flow-root}
#rkRoot .rk-ph{display:flex;align-items:center;gap:8px;padding:0 0 5px}
#rkRoot .rk-ph-r,#rkRoot .rk-ph-l{flex:1;display:flex}#rkRoot .rk-ph-l{justify-content:flex-end}
#rkRoot .rk-k{text-align:center;line-height:1.6}#rkRoot .rk-k b{display:block;font-size:12.5px;color:#0d2b45}#rkRoot .rk-k span{display:block;font-size:11px;color:#3d566b}
#rkRoot .rk-ph-c{flex:1.3;display:flex;align-items:center;justify-content:center;gap:9px}
#rkRoot .rk-core{display:flex;align-items:center;gap:6px;line-height:1.25}#rkRoot .rk-core img{width:13mm;height:13mm}#rkRoot .rk-core b{display:block;font-size:13px;color:#0c6f82;white-space:nowrap}#rkRoot .rk-core small{display:block;font-size:9.5px;color:#71859a;white-space:nowrap}
#rkRoot .rk-sep{width:1.5px;height:15mm;background:#f0b34a;border-radius:2px}
#rkRoot .rk-moe{height:19mm;max-width:28mm;object-fit:contain}
#rkRoot .rk-meta{font-size:10px;line-height:1.75;color:#3d566b}#rkRoot .rk-meta div{display:flex;gap:4px}#rkRoot .rk-meta span{color:#71859a;min-width:16mm}#rkRoot .rk-meta b{color:#0d2b45}
#rkRoot .rk-bar{display:flex;height:4px;border-radius:4px;overflow:hidden;flex:none}#rkRoot .rk-bar i{display:block}#rkRoot .rk-bar i:nth-child(1){flex:2.2;background:#0d2b45}#rkRoot .rk-bar i:nth-child(2){flex:1.2;background:#f0b34a}#rkRoot .rk-bar i:nth-child(3){flex:6;background:#0f8a94}
#rkRoot .rk-ph+.rk-bar{margin-bottom:10px}
#rkRoot .rk-foot{flex:none;padding-top:2mm}
#rkRoot .rk-pf{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:4px;font-size:9.5px;color:#3d566b}
#rkRoot .rk-pfs{display:flex;align-items:center;gap:6px;line-height:1.3}#rkRoot .rk-pfs img{width:24px;height:24px;object-fit:contain}#rkRoot .rk-pfs small{display:block;font-size:8.5px;color:#71859a}#rkRoot .rk-pfs b{color:#0c6f82;font-size:10.5px}
#rkRoot .rk-pfm{text-align:center;line-height:1.5;color:#71859a}#rkRoot .rk-pfm b{display:block;color:#0d2b45;font-size:10px}
#rkRoot .rk-pfq{display:flex;align-items:center;gap:6px;line-height:1.3}#rkRoot .rk-pfq svg{width:15mm;height:15mm;flex:none}#rkRoot .rk-pfq small{display:block;font-size:8px;color:#71859a;max-width:28mm}#rkRoot .rk-pfq b{font-size:9.5px;color:#0d2b45;letter-spacing:.5px}
#rkRoot .rk-part{position:relative;text-align:center;margin:4px 0 16px;padding:16px 22px 18px;border-radius:16px;background:linear-gradient(160deg,#fff7f6 0%,#ffffff 45%,#f1f9fa 100%);border:1px solid #ecd9d6}
#rkRoot .rk-part::before,#rkRoot .rk-part::after{content:"";position:absolute;width:16mm;height:16mm;border:3px solid #f0b34a}
#rkRoot .rk-part::before{top:-2px;right:-2px;border-left:0;border-bottom:0;border-top-right-radius:16px}
#rkRoot .rk-part::after{bottom:-2px;left:-2px;border-right:0;border-top:0;border-bottom-left-radius:16px}
#rkRoot .rk-kick{display:block;font-size:11.5px;font-weight:700;color:#0c6f82;margin-bottom:2px}
#rkRoot .rk-ttl{display:block;margin:0 auto;font-size:27px;font-weight:800;color:#8f1d1d;line-height:1.45;text-align:center}
#rkRoot .rk-evt{display:inline-flex;align-items:center;gap:8px;margin:10px auto 0;padding:6px 24px;border-radius:999px;background:#8f1d1d;color:#fff;font-weight:800;font-size:16px}
#rkRoot .rk-evt::before{content:"";width:8px;height:8px;border-radius:50%;background:#f0b34a}
#rkRoot .rk-body h2{font-size:15.5px;color:#0d2b45;border-right:5px solid #f0b34a;padding:3px 10px 3px 0;margin:12px 0 6px;background:linear-gradient(270deg,#e8f6f7,rgba(232,246,247,0))}
#rkRoot .rk-body h2.rk-cont::after,#rkRoot .rk-body h3.rk-cont::after{content:" (تابع)";font-size:12px;color:#71859a;font-weight:500}
#rkRoot .rk-body h3{font-size:14px;color:#0c6f82;margin:10px 0 4px}
#rkRoot .rk-body table{width:100%;border-collapse:collapse;margin:6px 0 10px}#rkRoot .rk-body th,#rkRoot .rk-body td{border:1px solid #b9cdd5;padding:5px 8px;text-align:right;vertical-align:top}#rkRoot .rk-body th{background:#e3f6f7;font-weight:700}
#rkRoot .rk-body img{max-width:100%}
#rkRoot .rk-body .kv{display:grid;grid-template-columns:150px 1fr;border-radius:8px;overflow:hidden}#rkRoot .rk-body .kv>div{border:1px solid #b9cdd5;padding:5px 8px;margin:-1px 0 0 -1px}#rkRoot .rk-body .kv>div:nth-child(odd){background:#eef8fa;font-weight:700}
#rkRoot .rk-body .box{border:1px solid #c9dbe1;border-radius:8px;padding:8px 12px;margin:6px 0;white-space:pre-wrap;background:#fbfdfd;box-shadow:inset -3px 0 0 #0f8a94}
#rkRoot .rk-body .gal{display:block;font-size:0;line-height:0}
#rkRoot .rk-body .gal figure{display:inline-block;vertical-align:top;width:calc(50% - 4px);margin:0 0 8px;font-size:11px;line-height:1.6}
#rkRoot .rk-body .gal figure:nth-child(even){margin-inline-start:8px}
#rkRoot .rk-body .gal img{display:block;width:100%;height:62mm;object-fit:cover;border-radius:8px;border:2px solid #fff;box-shadow:0 0 0 1px #c9dbe1}
#rkRoot .rk-body .noprint,#rkRoot .rk-body .np,#rkRoot .rk-body button,#rkRoot .rk-body .btn{display:none!important}
.rk-bar-np{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;align-items:center;padding:10px;background:#0c6f82;color:#fff;font:14px Tajawal,sans-serif}
.rk-bar-np button{font:inherit;font-weight:800;border:0;border-radius:10px;padding:8px 18px;background:#f0b34a;color:#0d2b45;cursor:pointer}
@media screen{body{background:#e9eff2}#rkRoot{padding:10px 0}#rkRoot .rk-page{margin:0 auto 12px;box-shadow:0 2px 12px rgba(13,43,69,.15);outline:5mm solid #fff}}
@media print{.rk-bar-np{display:none}body{background:#fff}}`;

  const head = (o, issue) => `<div class="rk-ph"><div class="rk-ph-r"><div class="rk-k"><b>المملكة العربية السعودية</b><b>وزارة التعليم</b><span>الإدارة العامة للتعليم بمحافظة الأحساء</span><span>مدرسة لبيد بن ربيعة المتوسطة</span></div></div>
    <div class="rk-ph-c"><div class="rk-core"><img src="${CORE}assets/core-logo.svg" alt=""><span><b>النواة الرقمية</b><small>الهوية الموحدة</small></span></div><span class="rk-sep"></span><img class="rk-moe" src="${CORE}assets/moe-logo.png" alt="وزارة التعليم"></div>
    <div class="rk-ph-l"><div class="rk-meta"><div><span>التاريخ:</span><b>${esc(dstr(issue ? issue.at : new Date()))}</b></div><div><span>العام الدراسي:</span><b>${esc(o.year || "")}</b></div><div><span>رقم التقرير:</span><b dir="ltr">${issue ? fmtCode(issue.code) : "يُصدر عند الطباعة"}</b></div></div></div></div><div class="rk-bar"><i></i><i></i><i></i></div>`;
  const foot = (o, issue, n, N) => `<div class="rk-bar"><i></i><i></i><i></i></div><div class="rk-pf"><div class="rk-pfs"><img src="${esc(o.systemLogo)}" alt=""><span><small>صدر هذا التقرير من</small><b>${esc(o.systemName)}</b></span></div>
    <div class="rk-pfm"><b>صفحة ${n} من ${N}</b>${esc(dstr(issue ? issue.at : new Date()))}${o.issuer ? " · بواسطة " + esc(o.issuer) : ""}<br>مدرسة لبيد بن ربيعة المتوسطة</div>
    <div class="rk-pfs"><span style="text-align:left"><small>أحد أنظمة</small><b>النواة الرقمية</b></span><img src="${CORE}assets/core-logo.svg" alt=""></div>
    ${issue ? `<div class="rk-pfq">${QR.svg(issue.url)}<span><small>للتحقق من صحة التقرير امسح الرمز</small><b dir="ltr">${fmtCode(issue.code)}</b></span></div>` : ""}</div>`;

  /* ---------- وحدات المحتوى: العنوان، الأقسام (h2/h3 وما يليه)، العناصر المستقلة ---------- */
  function units(o) {
    const tpl = document.createElement("div"); tpl.innerHTML = o.body || "";
    tpl.querySelectorAll("script,.noprint,.np,button,.btn").forEach((x) => x.remove());
    const kick = esc(o.kicker || `${o.systemName} · مدرسة لبيد بن ربيعة المتوسطة`);
    const list = [{ t: "part", html: `<div class="rk-part"><span class="rk-kick">${kick}</span><h1 class="rk-ttl">${esc(o.title)}</h1>${o.sub ? `<p class="rk-evt">${esc(o.sub)}</p>` : ""}</div>` }];
    let cur = null, styles = "";
    const flush = () => { if (cur) { list.push(cur); cur = null; } };
    const sec = (n) => /^H[23]$/.test(n.tagName) || n.classList.contains("rk-sec");
    [...tpl.childNodes].forEach((n) => {
      if (n.nodeType === 3) { if (n.textContent.trim()) { const h = `<p>${esc(n.textContent)}</p>`; cur ? cur.kids.push(h) : list.push({ t: "atom", html: h }); } return; }
      if (n.nodeType !== 1) return;
      if (n.tagName === "STYLE" || n.tagName === "LINK") { styles += n.outerHTML; return; }
      if (n.classList.contains("html2pdf__page-break") || n.classList.contains("rk-break")) { flush(); list.push({ t: "brk" }); return; }
      if (n.tagName === "H1") { flush(); list.push({ t: "part", brk: true, html: `<div class="rk-part"><span class="rk-kick">${kick}</span><h1 class="rk-ttl">${n.innerHTML}</h1></div>` }); return; }
      if (n.classList.contains("sub") && !cur && list[list.length - 1].t === "part") { const u = list[list.length - 1]; u.html = u.html.replace(/<\/div>$/, `<p class="rk-evt">${n.innerHTML}</p></div>`); return; }
      if (sec(n)) { flush(); cur = { t: "sec", h2: n.outerHTML, kids: [], gal: false }; return; }
      if (cur) { cur.kids.push(n.outerHTML); if (n.classList.contains("gal")) cur.gal = true; } else list.push({ t: "atom", html: n.outerHTML });
    });
    flush();
    return { list, styles };
  }
  /* تقسيم العنصر الطويل: صور، أزواج بيانات، صفوف جدول، أسطر نص، أو أبناء حاوية */
  function splitter(html) {
    const d = document.createElement("div"); d.innerHTML = html; const el = d.firstElementChild; if (!el) return null;
    const shell = (inner) => { const c = el.cloneNode(false); c.innerHTML = inner; return c.outerHTML; };
    if (el.classList.contains("gal")) return { items: [...el.children].map((f) => f.outerHTML), wrap: (a) => shell(a.join("")), step: 2 };
    if (el.classList.contains("kv")) { const ch = [...el.children], rows = []; for (let i = 0; i < ch.length; i += 2) rows.push(ch[i].outerHTML + (ch[i + 1] ? ch[i + 1].outerHTML : "")); return { items: rows, wrap: (a) => shell(a.join("")), step: 1 }; }
    if (el.tagName === "TABLE") { const th = el.tHead ? el.tHead.outerHTML : "", rows = [...(el.tBodies[0] ? el.tBodies[0].rows : el.rows)].filter((r) => !el.tHead || r.parentNode !== el.tHead).map((r) => r.outerHTML); return { items: rows, wrap: (a) => shell(th + "<tbody>" + a.join("") + "</tbody>"), step: 1 }; }
    if (/^(UL|OL)$/.test(el.tagName) || (el.children.length >= 2 && [...el.childNodes].every((c) => c.nodeType === 1 || !c.textContent.trim()))) return { items: [...el.children].map((c) => c.outerHTML), wrap: (a) => shell(a.join("")), step: 1 };
    if (el.textContent.trim().length > 40) { const toks = el.innerHTML.split(/(<br\s*\/?>|\s+)/i).filter((t) => t !== ""); return { items: toks, wrap: (a) => shell(a.join("").replace(/^(\s|<br\s*\/?>)+/i, "")), step: 1, text: true }; }
    return null;
  }

  async function paginate(o, issue) {
    const { list, styles } = units(o);
    const fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:-10000px;top:0;width:230mm;height:400mm;border:0;visibility:hidden";
    document.body.appendChild(fr);
    try {
      const dd = fr.contentDocument;
      dd.open(); dd.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">${o.inherit || ""}${styles}<style>${o.styles || ""}</style><style>${css()}</style></head><body><div id="rkRoot"><section class="rk-page" id="pg"><div class="rk-body" id="col"></div></section></div></body></html>`); dd.close();
      await new Promise((r) => { if (dd.readyState === "complete") r(); else { fr.onload = r; setTimeout(r, 4000); } });
      try { await Promise.race([dd.fonts.ready, new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* خط احتياطي */ }
      const col = dd.getElementById("col"), pg = dd.getElementById("pg");
      pg.insertAdjacentHTML("afterbegin", head(o, issue)); pg.insertAdjacentHTML("beforeend", `<div class="rk-foot">${foot(o, issue, 99, 99)}</div>`);
      const waitImgs = (root) => Promise.all([...root.querySelectorAll("img")].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
      await waitImgs(dd);
      const AV = col.getBoundingClientRect().height - 2;
      const meas = async (html) => { col.innerHTML = `<div class="rk-u">${html}</div>`; await waitImgs(col); return col.firstElementChild.getBoundingClientRect().height; };
      const pages = [[]]; let used = 0;
      const newPage = () => { if (pages[pages.length - 1].length) { pages.push([]); used = 0; } };
      const place = (html, h) => { pages[pages.length - 1].push(html); used += h; };
      const fits = (h) => used + h <= AV;
      const cont = (h2) => h2.replace(/^<(h[23])(\s[^>]*)?>/i, (m, t, a) => `<${t}${a || ""} class="rk-cont">`);
      const putPieces = async (pieces, h2, flow) => {
        let headH = h2;
        for (const piece of pieces) {
          const withHead = (hh, x) => (hh ? hh + x : x);
          let h = await meas(withHead(headH, piece));
          const big = (flow || (h > AV && AV - used > AV * 0.25)) && splitter(piece);
          if (!fits(h) && used > 0 && !big) { newPage(); if (!headH && h2) headH = cont(h2); h = await meas(withHead(headH, piece)); }
          if (fits(h)) { place(withHead(headH, piece), h); headH = ""; continue; }
          const sp = splitter(piece);
          if (!sp || sp.items.length < 2) { place(withHead(headH, piece), h); headH = ""; newPage(); continue; }
          let i = 0;
          while (i < sp.items.length) {
            let lo = 1, hi = sp.items.length - i, best = 0;
            while (lo <= hi) { const mid = (lo + hi) >> 1, n = Math.min(sp.items.length - i, sp.step > 1 ? Math.ceil(mid / sp.step) * sp.step : mid); if (fits(await meas(withHead(headH, sp.wrap(sp.items.slice(i, i + n)))))) { best = n; lo = mid + 1; } else hi = mid - 1; }
            if (!best) { if (used > 0) { newPage(); if (!headH && h2) headH = cont(h2); continue; } best = sp.step; }
            if (sp.text && i + best < sp.items.length) { let j = i + best; while (j > i + 1 && !/^(\s+|<br\s*\/?>)$/i.test(sp.items[j - 1])) j--; if (j > i + 1) best = j - i; }
            const html = withHead(headH, sp.wrap(sp.items.slice(i, i + best))); place(html, await meas(html)); headH = ""; i += best;
            if (i < sp.items.length) { newPage(); if (h2) headH = cont(h2); }
          }
        }
      };
      for (const u of list) {
        if (u.t === "brk") { newPage(); continue; }
        if (u.t === "part") { if (u.brk) newPage(); const h = await meas(u.html); if (!fits(h)) newPage(); place(u.html, h); continue; }
        if (u.t === "atom") { await putPieces([u.html], "", false); continue; }
        const whole = u.h2 + u.kids.join(""), h = await meas(whole);
        if (fits(h)) { place(whole, h); continue; }
        if (h <= AV && used > 0 && !u.gal && !o.flow) { newPage(); place(whole, h); continue; }
        await putPieces(u.kids.length ? u.kids : [""], u.h2, u.gal || !!o.flow);
      }
      if (!pages[pages.length - 1].length && pages.length > 1) pages.pop();
      return { pages, styles };
    } finally { fr.remove(); }
  }

  const pagesHtml = (o, paged, issue) => { const N = paged.pages.length; return paged.pages.map((p, i) => `<section class="rk-page">${head(o, issue)}<div class="rk-body">${p.map((x) => `<div class="rk-u">${x}</div>`).join("")}</div><div class="rk-foot">${foot(o, issue, i + 1, N)}</div></section>`).join(""); };
  function doc(o, paged, issue, forPrint) {
    const body = pagesHtml(o, paged, issue);
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.fname || o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">${o.inherit || ""}${paged.styles}<style>${o.styles || ""}</style><style>${css()}</style></head><body>
${forPrint ? `<div class="rk-bar-np"><span>لحفظ الملف اختر «حفظ بصيغة PDF» من نافذة الطباعة.</span><button type="button" onclick="print()">طباعة / حفظ PDF</button></div>` : ""}
<div id="rkRoot">${body}</div>
${forPrint ? `<script>(function(){var go=function(){var im=[].slice.call(document.images).filter(function(i){return !i.complete});var t=setTimeout(function(){print()},6000),n=im.length;if(!n){clearTimeout(t);setTimeout(print,300);return}im.forEach(function(i){var d=function(){if(--n<=0){clearTimeout(t);setTimeout(print,200)}};i.onload=d;i.onerror=d})};document.fonts&&document.fonts.ready?document.fonts.ready.then(go):setTimeout(go,900)})()<\/script>` : ""}</body></html>`;
  }

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
  const NATIVE_PRINT = window.print.bind(window);
  /* عميل القاعدة: من إعداد النظام (الجلسة مشتركة بين الأنظمة على الأصل نفسه) */
  const defaultClient = () => {
    if (window.__rkSb) return window.__rkSb;
    const A = window.APP_CONFIG, B = window.SMART_PLANS_CONFIG, url = (A && A.supabaseUrl) || (B && B.supabaseUrl), key = (A && A.supabaseKey) || (B && B.supabaseAnonKey);
    if (!url || !key || !window.supabase) return null;
    return (window.__rkSb = window.supabase.createClient(url, key));
  };
  const norm = (o) => Object.assign({ systemLogo: new URL("favicon.svg", location.href).href, systemName: "النواة الرقمية", system: "core", year: "", issuer: "" }, o);
  /* أنماط الصفحة الحالية دون قواعد @page (حتى لا تتكرر رؤوس الأنظمة القديمة) */
  const pageCss = () => {
    let out = "";
    for (const sh of [...document.styleSheets]) {
      if (sh.ownerNode && sh.ownerNode.id === "rkHostCss") continue;
      try { out += "<style>" + [...sh.cssRules].filter((r) => !(window.CSSPageRule && r instanceof CSSPageRule)).map((r) => r.cssText).join("\n") + "</style>"; }
      catch (e) { if (sh.href) out += `<link rel="stylesheet" href="${esc(sh.href)}">`; }
    }
    return out;
  };

  /* اسم المُصدِر والعام الدراسي من النواة إن لم يُمرَّرا */
  async function fill(o, sb) {
    if (!sb || (o.issuer && o.year)) return;
    try { const [me, yr] = await Promise.all([o.issuer ? null : sb.rpc("current_staff_id").then((r) => r.data ? sb.from("staff_members").select("full_name").eq("id", r.data).maybeSingle() : null), o.year ? null : sb.from("academic_years").select("name").eq("status", "current").maybeSingle()]); if (me && me.data) o.issuer = me.data.full_name; if (yr && yr.data) o.year = yr.data.name; } catch (e) { /* بيانات اختيارية */ }
  }
  async function issueDoc(o) {
    const sb = o.sb || defaultClient();
    if (!sb) throw new Error("no client");
    await fill(o, sb);
    const id = uuid(), code = id.replace(/-/g, "").slice(0, 16).toUpperCase(), issue = { code, url: VERIFY + "?c=" + code, at: new Date() };
    const paged = await paginate(o, issue);
    const { error } = await sb.from("core_report_issues").insert({ id, code, system: o.system, system_name: String(o.systemName).slice(0, 120), title: String(o.title).slice(0, 500), subtitle: o.sub ? String(o.sub).slice(0, 500) : null, pages: paged.pages.length, public_full: !!o.publicFull, doc_html: doc(o, paged, issue, false) });
    if (error) throw error;
    return { paged, issue };
  }

  /* الطباعة في الصفحة نفسها حين تُحجب النافذة المنبثقة (سفاري بعد عملية غير متزامنة) */
  function inPlace(o, paged, issue) {
    document.getElementById("rkHost")?.remove(); document.getElementById("rkHostCss")?.remove();
    const st = document.createElement("style"); st.id = "rkHostCss";
    st.textContent = css().replace(/html,body\{[^}]*\}body\{[^}]*\}/, "") + `
@media screen{#rkHost{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#e9eff2}}
@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}body>*:not(#rkHost){display:none!important}#rkHost{position:static!important;display:block!important;overflow:visible!important}}`;
    const removed = [];
    for (const sh of [...document.styleSheets]) { try { const rs = sh.cssRules; for (let i = rs.length - 1; i >= 0; i--) if (window.CSSPageRule && rs[i] instanceof CSSPageRule) { removed.push([sh, rs[i].cssText, i]); sh.deleteRule(i); } } catch (e) { /* ورقة من أصل آخر */ } }
    document.head.appendChild(st);
    const host = document.createElement("div"); host.id = "rkHost";
    host.innerHTML = `<div class="rk-bar-np"><span>لحفظ الملف اختر «حفظ بصيغة PDF» من نافذة الطباعة.</span><button type="button" data-p>طباعة / حفظ PDF</button><button type="button" data-x style="background:#fff">إغلاق</button></div><div id="rkRoot">${pagesHtml(o, paged, issue)}</div>`;
    document.body.appendChild(host);
    const close = () => { host.remove(); st.remove(); removed.reverse().forEach(([sh, t, i]) => { try { sh.insertRule(t, Math.min(i, sh.cssRules.length)); } catch (e) { /* */ } }); };
    host.querySelector("[data-x]").onclick = close;
    host.querySelector("[data-p]").onclick = () => NATIVE_PRINT();
    const imgs = [...host.querySelectorAll("img")].filter((i) => !i.complete);
    Promise.race([Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))), new Promise((r) => setTimeout(r, 5000))]).then(() => setTimeout(() => { try { NATIVE_PRINT(); } catch (e) { /* يبقى زر الطباعة */ } }, 250));
  }

  /* الإصدار: نافذة جديدة إن أمكن، وإلا في الصفحة نفسها. بلا اتصال بالقاعدة يصدر دون رمز تحقق */
  function print(opts) {
    const o = norm(opts);
    let w = null; try { w = window.open("", "_blank"); } catch (e) { w = null; }
    if (w) w.document.write(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>جارٍ إصدار التقرير…</title><body style="font:16px Tajawal,Tahoma,sans-serif;display:grid;place-items:center;height:90vh;color:#0c6f82;margin:0">جارٍ إصدار التقرير وتسجيل رمز التحقق…</body></html>`);
    const show = (paged, issue) => { if (w && !w.closed) { w.document.open(); w.document.write(doc(o, paged, issue, true)); w.document.close(); } else inPlace(o, paged, issue); };
    return issueDoc(o).then(({ paged, issue }) => { show(paged, issue); return true; }).catch(async (e) => {
      console.error("ReportKit:", e);
      try { show(await paginate(o, null), null); return true; } catch (e2) { console.error(e2); if (w) w.close(); alert("تعذّر إنشاء التقرير"); return false; }
    });
  }
  /* معاينة على الشاشة بنفس الهوية والتقسيم (دون رقم تحقق؛ يُصدر الرقم والرمز عند الطباعة): تعيد مستند HTML كاملًا */
  async function preview(opts) { const o = norm(opts); await fill(o, o.sb || defaultClient()); return doc(o, await paginate(o, null), null, false); }
  const STRIP = ".no-print,.noprint,.np,.rp-bar,.rp-pick,.rp-tip,button,.btn,.acts,nav,.tabs,input,select,textarea,script,#ub,.ub";
  /* طباعة عنصر قائم: محتواه (دون عناصر التحكم) مع أنماط صفحته */
  function printElement(el, opts) {
    const c = el.cloneNode(true); c.querySelectorAll(STRIP).forEach((x) => x.remove());
    return print(Object.assign({ body: c.innerHTML, inherit: opts && opts.inheritCss === false ? "" : pageCss() }, opts));
  }
  /* تركيب على نظام كامل: أي استدعاء لـ window.print() يصدر بالهوية الموحدة ورمز التحقق.
     root: محدد (أو قائمة) للعنصر المطبوع، والعنوان من عنوان الصفحة أو أول عنوان فيه */
  function install(cfg) {
    const pick = () => { for (const sel of [].concat(cfg.root || ["#main", "#app", "main"])) { const el = document.querySelector(sel); if (el && el.textContent.trim()) return el; } return document.body; };
    window.print = () => {
      const el = pick(), names = [cfg.systemName, cfg.short].filter(Boolean);
      const parts = document.title.split(/\s+[–—-]\s+/).map((x) => x.trim()).filter((x) => x && !names.some((n) => n.includes(x) || x.includes(n)));
      const h = el.querySelector("h1,h2,h3");
      const title = (cfg.title && cfg.title(el)) || parts[0] || (h && h.textContent.trim()) || cfg.systemName;
      const sub = cfg.sub ? cfg.sub(el) : parts[1] || "";
      return printElement(el, { system: cfg.system, systemName: cfg.systemName, systemLogo: cfg.systemLogo, publicFull: cfg.publicFull, title, sub });
    };
  }
  window.ReportKit = { print, preview, printElement, install, nativePrint: NATIVE_PRINT, QR, VERIFY };
})();
