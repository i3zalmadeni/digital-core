/* «يحدث في لبيد» – نافذة قراءة فقط. تستدعي دوال التجميع lb_* فقط ولا تكتب في أي جدول. */
async function lbeedPage(m, o = {}) {
  const SYS = { core: "النواة الرقمية", saas: "التقويم المدرسي الذكي", plans: "الخطط الذكية", community: "المجتمع المهني الذكي", indibati: "انضباطي", qiyami: "قيمي", booking: "احجز مرفق" };
  const COL = { core: "#0f8a94", saas: "#2f5ea8", plans: "#b86d0c", community: "#7a4bb5", indibati: "#b8434f", qiyami: "#24895a", booking: "#0da9a6" };
  const KIND = { meeting: "اجتماع", program: "برنامج", booking: "حجز", deadline: "موعد", task: "مهمة", calendar: "تقويم", attendance: "حضور", achievement: "إنجاز" };
  const OP = { new: "جديد", update: "تعديل" };
  const ST = { upcoming: ["قادم", "b"], running: ["جارٍ الآن", "g"], ended: ["انتهى", ""], cancelled: ["ملغى", "r"], postponed: ["مؤجل", "y"] };
  const DOC = { none: ["لم يوثق", "y"], pending: ["بانتظار الاعتماد", "b"], documented: ["موثق", "g"] };
  const HUES = [["#0f8a94", "#0c4f5c"], ["#2f5ea8", "#183869"], ["#7a4bb5", "#43286d"], ["#b86d0c", "#6b3e04"], ["#24895a", "#14503a"], ["#b8434f", "#6d222c"]];
  const S = { view: "ov", day: null, mon: null, kf: "all", wk: null, wkMode: "grid", feed: { sys: "", kind: "", op: "", from: "", to: "", off: 0 } };
  const base = (APP_CONFIG && APP_CONFIG.supabaseUrl) || "";
  const pub = (b, p) => `${base}/storage/v1/object/public/${b}/${String(p).split("/").map(encodeURIComponent).join("/")}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const nowRy = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const tm = (t) => (t ? new Date(t).toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const tm2 = (s) => (s ? String(s).slice(0, 5) : "—");
  const dt = (t) => (t ? new Date(t).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const dayName = (s) => new Date(s + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long" });
  const num = (v) => (v == null ? "—" : Number(v).toLocaleString("ar-SA-u-ca-gregory-nu-latn"));
  const hijri = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const greg = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(d);
  const chip = (k) => `<span class="lb-chip" style="--c:${COL[k] || "#0f8a94"}">${esc(SYS[k] || k)}</span>`;
  const stB = (s) => { const x = ST[s] || [s, ""]; return `<span class="lb-st ${x[1]}">${esc(x[0])}</span>`; };
  const em = (t, a) => `<div class="lb-em">${esc(t)}${a ? ` <a href="${esc(a[0])}">${esc(a[1])}</a>` : ""}</div>`;
  const mono = (n) => { const w = String(n || "؟").trim().split(/\s+/); return (w[0][0] || "") + (w[1] ? w[1][0] : ""); };
  const hue = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
  let people = {}, last = null, ok = true;
  const av = (name, sys) => { const p = people[name]; const c = sys ? COL[sys] : hue(name)[0]; return `<span class="lb-av" style="--c:${c}">${p && p.photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", p.photo))}">` : esc(mono(name))}</span>`; };

  m.innerHTML = `<div class="lb">
    <section class="lb-hero" aria-label="نبض لبيد"><div class="in"><div class="row"><div class="ttl"><h2>يحدث في لبيد</h2><p class="tag">لبيد تتحرك، وإنجازاتها تُرى</p></div>
      <div class="lb-beat" id="lbBeat" aria-hidden="true"></div>
      <div class="dtm"><b id="lbH"></b><span id="lbG"></span><span class="clk" id="lbClk"></span><span class="live" id="lbLive"><i></i><span id="lbLiveT">جارٍ التحميل</span></span><span id="lbU"></span></div></div></div></section>
    <nav class="lb-tabs" aria-label="عروض النافذة"><div class="in"><button data-v="ov" class="on" type="button">نظرة عامة</button><button data-v="log" type="button">سجل التحديثات</button><span class="sp"></span><button class="rf" id="lbR" type="button">${ico("refresh")} تحديث</button></div></nav>
    <div class="lb-main"><div id="lbBody"></div>
    <p style="color:#6a8696;font-size:.82rem;margin:30px 0 6px">نافذة قراءة فقط تجمع ما تسجله أنظمة المدرسة السبعة من مصادرها الأصلية دون نسخ أو تعديل، وتحترم صلاحيات كل نظام. لا تُعرض فيها حالات فردية للطلاب، وتظهر الصور المنشورة فقط.</p></div></div>`;
  const body = m.querySelector("#lbBody");
  /* بطاقة الترحيب الموحدة (PK.welcome) تُدمج في غلاف «يحدث في لبيد»: مربع واحد في الأعلى */
  (() => {
    const wc = document.querySelector(".pk-wc"), hero = m.querySelector(".lb-hero"); if (!wc || !hero) return;
    const av = wc.querySelector(".pk-wc-av"), t = wc.querySelector(".pk-wc-t"), y = wc.querySelector("[data-pk-year]"), ttl = hero.querySelector(".ttl"), dtm = hero.querySelector(".dtm");
    if (!t || !ttl) return;
    // «يحدث في لبيد» هو العنوان الأبرز، والترحيب سطر صغير فوقه (الصورة والاسم والصفة)
    const hi = document.createElement("div"); hi.className = "lb-hi";
    const nm = t.querySelector("h2"), rl = t.querySelector("p"), pf = t.querySelector(".pk-wc-pf");
    if (av) hi.append(av);
    hi.insertAdjacentHTML("beforeend", `<span class="nm">${esc(nm ? nm.textContent : "")}</span>${rl ? `<span class="rl">${esc(rl.textContent)}</span>` : ""}`);
    if (pf) hi.append(pf);
    ttl.prepend(hi); if (y && dtm) dtm.prepend(y);
    hero.classList.add("lb-merged"); hero.setAttribute("aria-label", "الترحيب ونبض لبيد");
    (wc.closest(".pk-wcw") || wc).remove();
  })();
  /* الإحصائيات (المؤشرات) داخل «نظرة عامة»: تُحمَّل مرة واحدة وتُنقل إلى أعلى المحتوى عند كل رسم */
  const kp = o.kpi ? Object.assign(document.createElement("div"), { className: "lb-kp" }) : null;
  if (kp) Promise.resolve(o.kpi(kp)).catch(console.error);
  const nd = nowRy();
  m.querySelector("#lbH").textContent = hijri(nd);
  m.querySelector("#lbG").textContent = greg(nd) + " م";
  const clk = () => { const e = m.querySelector("#lbClk"); if (e) e.textContent = new Date().toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Riyadh" }); }; clk(); setInterval(clk, 1000);
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args || {}); if (error) throw error; return data; };
  const setStatus = () => {
    const el = m.querySelector("#lbLive"); el.classList.toggle("off", !ok);
    m.querySelector("#lbLiveT").textContent = ok ? "متصل ويتحدث كل دقيقة" : "تعذر التحديث، المعروض آخر ما حُمّل";
    m.querySelector("#lbU").textContent = last ? "آخر تحديث " + tm(last) : "";
  };
  const skel = () => { body.innerHTML = `<div class="lb-sk" style="min-height:70px"></div><div class="lb-sk" style="min-height:300px"></div><div class="lb-sk"></div>`; };

  /* ---------- رسوم ---------- */
  const smooth = (pts) => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; } return d; };
  function heartbeat(days) {
    const W = 1000, H = 160, base = 96, mx = Math.max(1, ...days.map((x) => x.n)), step = W / days.length; let d = `M0,${base}`;
    days.forEach((x, i) => { const cx = step * i + step / 2, h = 8 + (x.n / mx) * 92, w = step * 0.16; d += ` L${cx - w * 2.2},${base} L${cx - w * 1.4},${base + 7} L${cx - w * .6},${base - h * 0.35} L${cx},${base - h} L${cx + w * .7},${base + h * 0.28} L${cx + w * 1.5},${base - 6} L${cx + w * 2.4},${base}`; });
    d += ` L${W},${base}`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="نبض النشاط خلال ${days.length} يوماً"><defs><linearGradient id="lbG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe3ee" stop-opacity=".35"/><stop offset="1" stop-color="#7fe3ee" stop-opacity="0"/></linearGradient></defs><path class="ar" d="${d} L${W},${H} L0,${H}Z"/><path class="ln" id="lbPath" d="${d}" pathLength="1" style="--len:1"/><circle r="5" fill="#fff"><animateMotion dur="9s" repeatCount="indefinite" begin="2.8s"><mpath href="#lbPath"/></animateMotion></circle></svg>`;
  }
  function areaChart(days) {
    const W = 640, H = 200, p = { l: 8, r: 8, t: 14, b: 26 }, mx = Math.max(1, ...days.map((x) => x.n)), iw = W - p.l - p.r, ih = H - p.t - p.b;
    const pts = days.map((x, i) => [p.l + (iw * i) / (days.length - 1), p.t + ih - (x.n / mx) * ih]);
    const line = smooth(pts), area = `${line} L${pts[pts.length - 1][0]},${p.t + ih} L${pts[0][0]},${p.t + ih}Z`;
    return `<svg class="lb-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="عدد سجلات الأنظمة لكل يوم"><defs><linearGradient id="lbG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f8a94" stop-opacity=".35"/><stop offset="1" stop-color="#0f8a94" stop-opacity="0"/></linearGradient></defs>
      ${[0, .5, 1].map((f) => `<line x1="${p.l}" x2="${W - p.r}" y1="${p.t + ih * f}" y2="${p.t + ih * f}" stroke="#e6f0f1"/>`).join("")}
      <path class="area" d="${area}" fill="url(#lbG2)"/><path class="stroke" d="${line}" pathLength="1" style="--len:1" fill="none" stroke="#0f8a94" stroke-width="3" stroke-linecap="round"/>
      ${pts.map((q, i) => `<circle class="pt" cx="${q[0]}" cy="${q[1]}" r="4.5" fill="#fff" stroke="#0f8a94" stroke-width="2.5"><title>${dayName(days[i].d)} ${fmt(days[i].d)}: ${days[i].n} سجلاً</title></circle>${i % 2 === 0 || i === days.length - 1 ? `<text x="${q[0]}" y="${H - 6}" text-anchor="middle">${new Date(days[i].d + "T12:00:00").getDate()}</text>` : ""}`).join("")}
      <text x="${W - p.r}" y="${p.t - 3}" text-anchor="end">الأعلى ${mx}</text></svg>`;
  }
  function donut(by) {
    const ks = Object.keys(SYS).filter((k) => by[k] > 0), tot = ks.reduce((a, k) => a + by[k], 0), R = 52, C = 2 * Math.PI * R; let off = 0;
    if (!tot) return em("لا نشاط مسجل في الفترة.");
    const arcs = ks.map((k) => { const l = (by[k] / tot) * C, el = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${COL[k]}" stroke-width="22" stroke-dasharray="${l - 2} ${C - l + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${SYS[k]}: ${by[k]}</title></circle>`; off += l; return el; }).join("");
    return `<div class="lb-donut"><svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="توزيع النشاط على الأنظمة">${arcs}<text x="70" y="68" text-anchor="middle" font-size="26" fill="#062f36">${num(tot)}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="#6a8696">سجلاً</text></svg>
      <div class="lb-leg" style="flex-direction:column">${ks.sort((a, b) => by[b] - by[a]).map((k) => `<span><i style="background:${COL[k]}"></i>${esc(SYS[k])} <b>${num(by[k])}</b></span>`).join("")}</div></div>`;
  }
  function ring(pct, label, sub, color) {
    const R = 46, C = 2 * Math.PI * R, v = Math.max(0, Math.min(100, pct || 0));
    return `<svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="${esc(label)} ${v}%"><circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * v) / 100} ${C}" transform="rotate(-90 60 60)" style="animation:lbd 1.4s ease-out"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${(C * v) / 100} ${C}" dur="1.3s" fill="freeze"/></circle><text x="60" y="64" text-anchor="middle" font-size="26" fill="#fff">${v}%</text><text x="60" y="82" text-anchor="middle" font-size="9" fill="#a9d4d9">${esc(sub)}</text></svg>`;
  }
  function countUp(el, to) { const n = Number(to) || 0; if (matchMedia("(prefers-reduced-motion:reduce)").matches || n === 0) { el.textContent = num(n); return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 1400); el.textContent = num(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); })(t0); }

  /* ---------- الغلاف ---------- */
  async function hero() {
    const pl = await rpc("lb_pulse", { p_days: 14 });
    m.querySelector("#lbBeat").innerHTML = heartbeat(pl.days);
    return pl;
  }

  /* ---------- اليوم ---------- */
  const faceCard = (p, g) => { const [h1, h2] = hue(p.name); return `<article class="lb-face" style="--h1:${h1};--h2:${h2}">${p.photo ? `<img loading="lazy" alt="${esc(p.name)}" src="${esc(pub("public-photos", p.photo))}">` : `<div class="mono">${esc(mono(p.name))}</div>`}${g && (g.reinforcements || g.badges) ? `<span class="bd">${num(g.reinforcements)} تعزيزاً${g.badges ? " · " + num(g.badges) + " وساماً" : ""}</span>` : ""}<div class="cap"><b>${esc(p.name)}</b><span>${esc(p.specialty || "")}</span></div></article>`; };
  const REL = (t) => { if (!t) return "لا نشاط مسجل"; const s = (Date.now() - new Date(t)) / 1000; if (s < 90) return "الآن"; if (s < 3600) return "منذ " + Math.round(s / 60) + " د"; if (s < 86400) return "منذ " + Math.round(s / 3600) + " س"; return "منذ " + Math.round(s / 86400) + " يوم"; };
  const camSvg = `<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20h10l4-6h20l4 6h10v34H8z"/><circle cx="32" cy="35" r="10"/></svg>`;
  const calSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="12" width="48" height="44" rx="9"/><path d="M8 26h48M20 6v10M44 6v10M22 38h6M36 38h6M22 47h6"/></svg>`;
  const TYPE = { meeting: "اجتماع", program: "برنامج", task: "مهمة", deadline: "موعد", booking: "حجز", calendar: "تقويم" };
  const FK = [["all", "الكل"], ["meeting", "اجتماعات"], ["program", "برامج"], ["booking", "حجوزات"], ["task", "مهام ومواعيد"], ["calendar", "تقويم المدرسة"]];
  const kOf = (e) => (e.kind === "deadline" ? "task" : e.kind);
  const addDays = (s, n) => { const x = new Date(s + "T12:00:00"); x.setDate(x.getDate() + n); return iso(x); };

  /* ----- أيقونات ----- */
  const I = { meeting: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5M16 5.2a3.2 3.2 0 010 5.6M18 14.6c1.6.6 2.7 2.1 3 4.4"/>', program: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', booking: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 9h2a2 2 0 012 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>', task: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>', chev: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M7 17L17 7M9 7h8v8"/>' };
  const ic = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k] || I.calendar}</svg>`;
  const KI = { meeting: "meeting", program: "program", booking: "booking", task: "task", deadline: "task", calendar: "calendar" };

  /* ----- توثيقات الخطط (شريط الصور): اختيار توثيق يعرض خبره كاملاً تحت الشريط ----- */
  let DOCS = [];
  function docsStrip(items) {
    DOCS = items;
    const head = `<div class="dh"><div><h4>آخر التوثيقات</h4><p>ما نُفِّذ ووُثِّق في الخطط الذكية، اضغط على أي بطاقة ليظهر الخبر كاملاً هنا</p></div><a href="/smart-plans/">كل التوثيقات</a></div>`;
    if (!items.length) return `<section class="lb-p lb-docs" id="lbDocs">${head}${em("لا توجد توثيقات بصور بعد. تظهر هنا فور توثيق أي برنامج.", ["/smart-plans/", "فتح الخطط الذكية"])}</section>`;
    const one = (x, i) => `<button type="button" class="dc" data-dc="${i}" aria-pressed="false"><span class="im"><img loading="lazy" alt="" src="${esc(pub("sp-evidence", x.images[0]))}">${x.images.length > 1 ? `<i>${num(x.images.length)} صور</i>` : ""}<span class="dov"><b>${esc(x.title)}</b></span></span><span class="by"><span class="lb-av" style="--c:${hue(x.executor || "؟")[0]}">${esc(mono(x.executor))}</span><span><b>${esc(x.executor || "—")}</b><small>${x.date ? esc(fmt(x.date)) : esc(dt(x.at))}</small></span></span></button>`;
    const set = items.map(one).join("");
    return `<section class="lb-p lb-docs" id="lbDocs" aria-label="آخر التوثيقات">${head}<div class="vp"><div class="tr" style="animation-duration:${Math.max(36, items.length * 8)}s">${set}${items.length > 3 ? set : ""}</div></div><div class="ixh"></div></section>`;
  }

  /* ----- التقويم التفاعلي + خط اليوم الزمني ----- */
  const CAL = { mon: null, sel: null, kf: "all", open: null, want: null }; let MC = {}, WC = {}, UPC = [];
  const ws0 = (s) => addDays(s, -new Date(s + "T12:00:00").getDay());
  const KF = [["all", "الكل"], ["meeting", "اجتماعات ولقاءات"], ["program", "برامج"], ["booking", "حجوزات"], ["task", "مهام ومواعيد"], ["calendar", "تقويم المدرسة"]];
  const kk = (e) => (e.kind === "deadline" ? "task" : e.kind);
  const minsOf = (e) => { if (e.starts_at) { const d = new Date(new Date(e.starts_at).toLocaleString("en-US", { timeZone: "Asia/Riyadh" })); return d.getHours() * 60 + d.getMinutes(); } if (e.from) { const [h, mi] = String(e.from).split(":"); return +h * 60 + +mi; } return null; };
  const dayEv = (k) => { const w = WC[ws0(k)]; return w ? (w.events || []).filter((e) => e.day === k || (e.kind === "program" && e.until && e.day <= k && k <= e.until)) : []; };
  async function ensure() { const wk = ws0(CAL.sel), ks = [wk, addDays(wk, 7), addDays(wk, 14)]; await Promise.all([MC[CAL.mon] ? 0 : rpc("lb_month", { p_month: CAL.mon }).then((r) => (MC[CAL.mon] = r)), ...ks.map((k) => (WC[k] ? 0 : rpc("lb_week", { p_from: k }).then((r) => (WC[k] = r)).catch(() => (WC[k] = { events: [] }))))]); }
  function evRows(e) { const when = e.starts_at ? `${fmt(e.day)} · ${tm(e.starts_at)}` : e.from ? `${fmt(e.day)} · ${tm2(e.from)} – ${tm2(e.to)}` : e.until && e.until !== e.day ? `من ${fmt(e.day)} إلى ${fmt(e.until)}` : fmt(e.day);
    return [["الموعد", `${dayName(e.day)} ${when}`], ["النظام", SYS[e.sys]], ["الفريق أو الجهة", e.team], ["المكان", e.place || e.location], ["المسؤول", e.owner], ["الفئة المستفيدة", e.beneficiary], ["التوثيق", e.kind === "meeting" && e.doc ? (DOC[e.doc] || [""])[0] : null]].filter((r) => r[1]); }
  const wkd = (k) => { const w = new Date(k + "T12:00:00").getDay(); return w === 5 ? addDays(k, 2) : w === 6 ? addDays(k, 1) : k; };
  function setSel(host, k) { k = wkd(k); CAL.sel = k; CAL.open = null; if (k.slice(0, 7) !== CAL.mon.slice(0, 7)) CAL.mon = k.slice(0, 8) + "01"; return paint(host, true); }
  async function paint(host, anim) {
    host.classList.add("ld"); try { await ensure(); } catch (e) { host.classList.remove("ld"); return; } host.classList.remove("ld");
    const td = iso(nowRy()), all = dayEv(CAL.sel), cnt = {}; all.forEach((e) => (cnt[kk(e)] = (cnt[kk(e)] || 0) + 1));
    if (CAL.want) CAL.kf = "all"; else if (CAL.kf !== "all" && !cnt[CAL.kf]) CAL.kf = "all";
    const ev = all.filter((e) => CAL.kf === "all" || kk(e) === CAL.kf).sort((a, b) => (minsOf(a) ?? -1) - (minsOf(b) ?? -1));
    if (CAL.want) { const w = CAL.want, j = ev.findIndex((e) => e.title === w.title && e.link === w.link && !e.cont); CAL.open = j < 0 ? null : j; CAL.want = null; }
    const dots = {}; ((MC[CAL.mon] || {}).events || []).forEach((e) => { const o = (dots[e.day] = dots[e.day] || { n: 0, s: new Set() }); o.n++; o.s.add(e.sys); });
    const first = new Date(CAL.mon + "T12:00:00"), pad = first.getDay(), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = []; for (let i = 0; i < (pad >= 5 ? 0 : pad); i++) cells.push(`<span></span>`);
    for (let d = 1; d <= dim; d++) { if (new Date(CAL.mon.slice(0, 8) + String(d).padStart(2, "0") + "T12:00:00").getDay() >= 5) continue; const k = CAL.mon.slice(0, 8) + String(d).padStart(2, "0"), o = dots[k], dw = new Date(k + "T12:00:00").getDay(); cells.push(`<button type="button" data-d="${k}" style="--h:${o ? Math.min(o.n, 6) / 6 : 0}" class="${k === td ? "today" : ""} ${k === CAL.sel ? "sel" : ""} ${dw >= 5 ? "we" : ""}" aria-label="${esc(dayName(k))} ${d}${o ? "، " + o.n + " أحداث" : ""}" ${k === CAL.sel ? 'aria-current="date"' : ""}><b>${num(d)}</b>${o ? `<i>${[...o.s].slice(0, 3).map((x) => `<u style="--c:${COL[x]}"></u>`).join("")}</i>` : ""}</button>`); }
    const wd = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"], title = first.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    const nowM = (() => { const n = nowRy(); return n.getHours() * 60 + n.getMinutes(); })(); let nowDone = CAL.sel !== td;
    const line = (e, i) => { const st = minsOf(e), mm = st == null ? "" : tm2(`${String(Math.floor(st / 60)).padStart(2, "0")}:${String(st % 60).padStart(2, "0")}`), open = CAL.open === i, rows = evRows(e), done = e.state === "ended" || (CAL.sel === td && st != null && e.kind !== "program" && !e.cont && (e.state == null) && false);
      let mark = ""; if (!nowDone && st != null && st > nowM) { nowDone = true; mark = `<div class="nowm"><span>الآن · ${tm(new Date())}</span></div>`; }
      return `${mark}<div class="ev ${esc(e.state || "")} ${open ? "open" : ""}" style="--c:${COL[e.sys]};--i:${i}"><div class="tc">${st == null ? `<b>طوال اليوم</b>` : `<b>${esc(mm)}</b>${e.to || e.ends_at ? `<small>${esc(e.to ? tm2(e.to) : tm(e.ends_at))}</small>` : ""}`}</div><div class="rl"><i></i></div>
        <article class="ec"><button type="button" class="eh" data-k="${i}" aria-expanded="${open}"><span class="ico">${ic(KI[e.kind])}</span><span class="tt"><b>${esc(e.title)}</b><small>${esc(TYPE[e.kind] || e.kind)}${e.place || e.location ? " · " + esc(e.place || e.location) : ""}${e.owner ? " · " + esc(e.owner) : ""}</small></span>${e.kind === "meeting" ? stB(e.state) : ""}<span class="chv">${ic("chev")}</span></button>
        <div class="eb"><div><dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl><a class="go" href="${esc(e.link || "#")}">فتح في ${esc(SYS[e.sys])} ${ic("up")}</a></div></div></article></div>`; };
    const wkk = ws0(CAL.sel), upAll = [wkk, addDays(wkk, 7), addDays(wkk, 14)].flatMap((k) => (WC[k] && WC[k].events) || []).filter((e) => e.day > CAL.sel && new Date(e.day + "T12:00:00").getDay() < 5 && e.kind !== "calendar" && (e.kind !== "program" || (e.day >= addDays(wkk, 7) && !(PO && PO.next && PO.next.link === e.link)))).sort((a, b) => String(a.day).localeCompare(String(b.day)) || (minsOf(a) ?? -1) - (minsOf(b) ?? -1)).slice(0, 6);
    UPC = upAll;
    const upHtml = `<div class="up ${all.length ? "" : "big"}"><h5>الأحداث القادمة</h5><div class="upl">${upAll.length ? upAll.map((e, j) => `<button type="button" class="ui" data-up="${j}" title="اعرضه في يومه" style="--c:${COL[e.sys]}"><span class="dd"><b>${num(new Date(e.day + "T12:00:00").getDate())}</b><small>${esc(dayName(e.day))}</small></span><span class="tx"><b>${esc(e.title)}</b><small>${esc(TYPE[e.kind] || e.kind)}${e.starts_at ? " · " + esc(tm(e.starts_at)) : e.from ? " · " + esc(tm2(e.from)) : ""}${e.place ? " · " + esc(e.place) : ""}</small></span>${chip(e.sys)}</button>`).join("") : `<div class="lb-em">لا أحداث مجدولة في الأسبوعين القادمين.</div>`}</div></div>`;
    const tl = ev.map(line).join("") + (!nowDone && ev.length ? `<div class="nowm"><span>الآن · ${tm(new Date())}</span></div>` : "");
    host.innerHTML = `<div class="lb-cal"><div class="lb-p lb-mcal"><div class="lb-mh"><button type="button" id="mP" aria-label="الشهر السابق">${ic("chev")}</button><b>${esc(title)}</b><button type="button" id="mN" aria-label="الشهر التالي">${ic("chev")}</button></div>
        <div class="lb-mg">${["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"].map((x) => `<span class="w">${x}</span>`).join("")}${cells.join("")}</div><button type="button" class="tdb" id="mT">العودة إلى اليوم</button>
        <div class="lg">${Object.keys(SYS).filter((k) => ["community", "saas", "plans", "booking"].includes(k)).map((k) => `<span><u style="--c:${COL[k]}"></u>${esc(SYS[k])}</span>`).join("")}</div></div>
      <div class="lb-p lb-ag ${anim ? "an" : ""}"><div class="agh"><div class="big"><b>${num(new Date(CAL.sel + "T12:00:00").getDate())}</b><span>${CAL.sel === td ? "اليوم" : esc(dayName(CAL.sel))}</span></div><div class="meta"><h4>${esc(dayName(CAL.sel))}</h4><p>${esc(hijri(new Date(CAL.sel + "T12:00:00")))}</p></div><div class="cn"><b>${num(all.length)}</b><span>حدثاً</span></div></div>
        <div class="lb-fc" role="group" aria-label="تصفية الأحداث">${KF.filter(([k]) => k === "all" || cnt[k]).map(([k, n]) => `<button type="button" data-k="${k}" class="${CAL.kf === k ? "on" : ""}">${n}<b>${num(k === "all" ? all.length : cnt[k])}</b></button>`).join("")}</div>
        <div class="agb"><div class="tl">${tl || `<div class="lb-nomt">${calSvg}<b>${all.length ? "لا أحداث من هذا النوع" : "يوم هادئ، لا لقاءات أو فعاليات مجدولة"}</b><span>ما يُجدول في أي نظام من أنظمة المدرسة يظهر هنا فوراً.</span></div>`}</div>${upHtml}</div></div></div>${progCard(WC[wkk] || { events: [] })}`;
    host.querySelectorAll(".lb-mg [data-d]").forEach((b) => (b.onclick = () => setSel(host, b.dataset.d)));
    host.querySelector("#mP").onclick = () => { const d = new Date(CAL.mon + "T12:00:00"); d.setMonth(d.getMonth() - 1); CAL.mon = iso(d); setSel(host, CAL.mon); };
    host.querySelector("#mN").onclick = () => { const d = new Date(CAL.mon + "T12:00:00"); d.setMonth(d.getMonth() + 1); CAL.mon = iso(d); setSel(host, CAL.mon); };
    host.querySelector("#mT").onclick = () => { const t = wkd(iso(nowRy())); CAL.mon = t.slice(0, 8) + "01"; setSel(host, t); };
    host.querySelectorAll(".lb-fc button").forEach((b) => (b.onclick = () => { CAL.kf = b.dataset.k; CAL.open = null; paint(host, true); }));
    host.querySelectorAll("[data-up]").forEach((b) => (b.onclick = async () => { const e = UPC[+b.dataset.up]; if (!e) return; CAL.want = e; await setSel(host, e.day); const o = host.querySelector(".ev.open") || host.querySelector(".lb-ag"); if (o) o.scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
    host.querySelectorAll(".eh").forEach((b) => (b.onclick = () => { const i = +b.dataset.k, was = CAL.open === i; CAL.open = was ? null : i; host.querySelectorAll(".ev").forEach((x, n) => { const o = x.querySelector(".eh"); const on = !was && +o.dataset.k === i; x.classList.toggle("open", on); o.setAttribute("aria-expanded", on); }); }));
  }
  function calWidget(host) { const td = wkd(iso(nowRy())); if (!CAL.sel) CAL.sel = td; if (!CAL.mon) CAL.mon = CAL.sel.slice(0, 8) + "01"; MC = {}; WC = {}; return paint(host, false); }

  /* ----- بطاقة الانضباط (داكنة، النسبة هي البارزة) ----- */
  function disCard(at) {
    const head = `<div class="dh"><span class="ico g">${ic("shield")}</span><div><h4>الانضباط اليوم</h4><p>الحضور والغياب والتأخر من نظام انضباطي</p></div><a href="/indibati/dashboard.html">فتح انضباطي</a></div>`;
    if (!at.recorded) return `<section class="lb-p dkc lb-dis">${head}<div class="lb-em">لم يُرصد الحضور اليوم بعد. تظهر النسب هنا فور رصد أول فصل.</div></section>`;
    const P = Math.round(at.present_pct || 0), A = Math.round(at.absent_pct || 0), R = 15.9155, ex = at.absent_excused || 0, un = at.absent_unexcused || 0, tot = Math.max(1, at.students_in_recorded || 1), st = at.sections_total || 0, sr = at.sections_recorded || 0;
    const cov = st ? Math.round((100 * sr) / st) : 0;
    return `<section class="lb-p dkc lb-dis">${head}<div class="ds"><div class="rg" role="img" aria-label="الحضور ${P}% والغياب ${A}%"><svg viewBox="0 0 42 42"><circle class="tk" cx="21" cy="21" r="${R}"/><circle class="pr" cx="21" cy="21" r="${R}" pathLength="100" style="--p:${P}"/><circle class="ab" cx="21" cy="21" r="${R}" pathLength="100" style="--p:${A};--o:${-P}"/></svg><div class="ct"><b class="cu" data-cu="${P}" data-sfx="%">0</b><span>نسبة الحضور اليوم</span></div></div>
      <div class="rt"><div class="ks"><div class="k g"><b class="cu" data-cu="${at.present || 0}">0</b><span>حاضر</span><small>من ${num(at.students_in_recorded)}</small></div><div class="k r"><b class="cu" data-cu="${A}" data-sfx="%">0</b><span>غياب</span><small>${num(at.absent)} طالباً</small></div><div class="k y"><b class="cu" data-cu="${ex}">0</b><span>بعذر</span><small>${num(un)} بدون</small></div><div class="k b"><b class="cu" data-cu="${at.late || 0}">0</b><span>متأخر</span><small>اليوم</small></div></div>
      <div class="cv"><span>تغطية الرصد: ${num(sr)} من ${num(st)} فصلاً (${num(cov)}%)</span><div class="dots">${Array.from({ length: st }, (_, i) => `<i class="${i < sr ? "on" : ""}"></i>`).join("")}</div></div>
      <div class="sb"><div class="stk" aria-hidden="true"><i class="g" style="width:${(100 * (at.present || 0)) / tot}%"></i><i class="y" style="width:${(100 * ex) / tot}%"></i><i class="r" style="width:${(100 * un) / tot}%"></i></div><div class="lb-leg"><span><i style="background:#3ed598"></i>حاضر</span><span><i style="background:#f0b34a"></i>بعذر</span><span><i style="background:#ff7a66"></i>بدون عذر</span></div></div></div></div></section>`;
  }

  /* ----- مؤشرات المدرسة: اختيار مجال يغيّر الحلقة والأرقام في مكانها ----- */
  let IND = {}, DSEL = null;
  const IPAL = ["#0f8a94", "#2f5ea8", "#7a4bb5", "#b86d0c", "#24895a", "#b8434f", "#0da9a6", "#c98a1b"];
  function indInner() {
    const ind = IND, doms = ind.domains || [], di = DSEL != null ? doms.findIndex((x) => x.name === DSEL) : -1, d = di >= 0 ? doms[di] : null; if (!d) DSEL = null;
    const T = d ? { total: d.total || 0, approved: d.approved || 0, ev: Math.max(d.evaluated || 0, d.approved || 0) } : { total: ind.total || 0, approved: ind.approved || 0, ev: doms.reduce((a, x) => a + Math.max(x.evaluated || 0, x.approved || 0), 0) };
    const ov = pctOf(T.approved, T.total), evp = pctOf(T.ev, T.total), rc = d ? IPAL[di % IPAL.length] : "#0f8a94";
    const head = `<div class="dh"><span class="ico b">${ic("task")}</span><div><h4>مؤشرات المدرسة${ind.cycle ? " · " + esc(ind.cycle) : ""}${d ? " · " + esc(d.name) : ""}</h4><p>${d ? "المؤشرات الآن لهذا المجال وحده · اضغط عليه مرة أخرى للعودة إلى المدرسة" : ind.has_cycle ? `اكتمال كل مجال بحسب المؤشرات المعتمدة · تغيّر ${num(ind.changed_7d)} خلال 7 أيام · اضغط على أي مجال لتتغير المؤشرات بحسبه` : "لا توجد دورة تقويم نشطة"}</p></div><a href="/self-evaluation/admin.html">فتح التقويم الذاتي</a></div>`;
    if (!doms.length) return `${head}${em("لا مجالات للعرض.")}`;
    const col = (x, i) => { const p = pctOf(x.approved, x.total), e = pctOf(Math.max(x.evaluated, x.approved), x.total), on = d === x; return `<button type="button" class="co ${on ? "on" : d ? "dim" : ""}" data-dm="${i}" aria-pressed="${on}" style="--c:${IPAL[i % IPAL.length]};--i:${i}" title="${esc(x.name)}: ${num(x.approved)} معتمد من ${num(x.total)} مؤشراً"><b class="v">${num(p)}%</b><span class="bar"><i class="ev" style="--h:${e}%"></i><i class="ap" style="--h:${p}%"></i></span><span class="nm">${esc(x.name)}</span><small>${num(x.approved)}/${num(x.total)} مؤشراً</small></button>`; };
    return `${head}<div class="ig"><div class="ovr" data-focus><div class="rg"><svg viewBox="0 0 42 42" width="150" height="150" aria-hidden="true"><circle class="tk" cx="21" cy="21" r="15.9155"/><circle class="pr" cx="21" cy="21" r="15.9155" pathLength="100" data-ring style="--p:${ov};stroke:${rc};stroke-dasharray:${ov} 100"/></svg><div class="ct"><b class="cu" data-cu="${ov}" data-sfx="%">0</b><span>${d ? "اكتمال المجال" : "اكتمال المدرسة"}</span></div></div><small>${num(T.approved)} معتمد من ${num(T.total)} مؤشراً</small>
      <div class="ikk">${tile(T.approved, "معتمد", "g")}${tile(Math.max(0, T.ev - T.approved), "مقيَّم ينتظر الاعتماد", "b")}${tile(Math.max(0, T.total - T.ev), "لم يُقيَّم", T.total - T.ev > 0 ? "y" : "")}<div class="tl2"><b>${num(evp)}%</b><span>نسبة التقييم</span></div></div>
      <div class="lg"><span><i class="s1"></i>معتمد</span><span><i class="s2"></i>مقيَّم</span></div></div>
      <div class="cols" role="group" aria-label="مجالات المؤشرات، اضغط على مجال لعرض مؤشراته"><div class="grid"><i>100%</i><i>50%</i><i>0</i></div>${doms.map(col).join("")}</div></div>`;
  }
  function indCard(ind) { IND = ind || {}; return `<section class="lb-p lb-ind" id="lbInd">${indInner()}</section>`; }
  const reInd = () => swap("lbInd", indInner(), [".cols"]);

  /* ----- آخر ما أُضيف من نمو مهني ----- */
  const GK = { course: "دورة", training: "دورة تدريبية", workshop: "ورشة عمل", visit: "زيارة", publication: "منشور", award: "جائزة", conference: "مؤتمر", certificate: "شهادة", other: "نشاط" };
  let GLD = [], ACD = [], TPD = [], TPL = "";
  function growthCard(list) {
    GLD = list;
    const head = `<div class="dh"><span class="ico y">${ic("star")}</span><div><h4>آخر ما أُضيف من نمو مهني</h4><p>الدورات والورش والأنشطة التي وثّقها المعلمون مؤخراً · اضغط على أي نشاط لتفاصيله</p></div><a href="/teachers-community/#/growth">المجتمع المهني الذكي</a></div>`;
    if (!list.length) return `<section class="lb-p lb-gr" id="lbGr">${head}${em("لم يضف المعلمون نشاطاً مهنياً بعد.", ["/teachers-community/#/growth", "فتح النمو المهني"])}</section>`;
    return `<section class="lb-p lb-gr" id="lbGr">${head}<div class="gl2">${list.map((x, i) => { const ok = x.status === "approved"; return `<button type="button" class="gc" data-gr="${i}" aria-pressed="false" style="--h:${hue(x.who)[0]}"><span class="ph">${x.photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", x.photo))}">` : esc(mono(x.who))}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x.who)}${x.provider ? " · " + esc(x.provider) : ""}</small><span class="cs"><em class="k">${esc(GK[x.kind] || x.kind || "نشاط")}</em>${x.hours ? `<em>${num(x.hours)} ساعة</em>` : ""}<em class="${ok ? "ok" : "wt"}">${ok ? "معتمد" : "بانتظار المراجعة"}</em></span></span><time>${REL(x.at)}</time></button>`; }).join("")}</div><div class="ixh"></div></section>`;
  }
  /* ----- المعلمون الأكثر إنجازاً ----- */
  function achCard(list) {
    ACD = list;
    const head = `<div class="dh"><span class="ico b">${ic("crown")}</span><div><h4>الأكثر إنجازاً في النمو المهني</h4><p>المعلمون حسب الساعات المعتمدة · اضغط على أي معلم لتفاصيل إنجازه</p></div><a href="/teachers-community/#/growth">كل السجلات</a></div>`;
    if (!list.length) return `<section class="lb-p lb-ach" id="lbAch">${head}${em("لم تُعتمد ساعات نمو مهني بعد.")}</section>`;
    const mx = Math.max(1, ...list.map((x) => x.hours));
    return `<section class="lb-p lb-ach" id="lbAch">${head}<div class="al">${list.map((x, i) => `<button type="button" class="ap r${i < 3 ? i + 1 : 0}" data-ac="${i}" aria-pressed="false" style="--h:${hue(x.name)[0]}"><span class="rk">${num(i + 1)}</span><span class="ph">${x.photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", x.photo))}">` : esc(mono(x.name))}</span><b>${esc(x.name)}</b><small>${esc(x.specialty || "معلم")}</small><span class="pt"><i style="width:${(100 * x.hours) / mx}%"></i></span><em>${num(x.hours)} ساعة · ${num(x.records)} نشاط</em></button>`).join("")}</div><div class="ixh"></div></section>`;
  }
  /* ----- برامج هذا الأسبوع ----- */
  let PO = null;
  /* ===== البطاقات التفاعلية: الضغط على عنصر داخل البطاقة يغيّر مؤشراتها في مكانها، بلا نوافذ منبثقة ===== */
  let PD = [], CD = [], WP = [];
  const PCOL = ["#0f8a94", "#2f5ea8", "#7a4bb5", "#b86d0c", "#24895a", "#b8434f", "#0da9a6", "#c98a1b"];
  const pav = (name, photo, sz) => `<span class="pav ${sz || ""}" style="--c:${hue(name || "؟")[0]}">${photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", photo))}">` : esc(mono(name))}</span>`;
  const tile = (v, l, c) => `<div class="tl2 ${c || ""}"><b>${num(v)}</b><span>${l}</span></div>`;
  const prange = (d, u) => (d ? (u && u !== d ? `${fmt(d)} – ${fmt(u)}` : fmt(d)) : "بلا موعد");
  const PST = { done: ["منفّذ", "g"], run: ["قيد التنفيذ", "b"], late: ["متعثر", "r"], new: ["لم يبدأ", ""] };
  const SYSN = [["/smart-plans", "الخطط الذكية"], ["/teachers-community", "المجتمع المهني الذكي"], ["/self-evaluation", "التقويم الذاتي"], ["/qiyami", "قيمي"], ["/facility-booking", "احجز مرفق"], ["/indibati", "انضباطي"], ["/report", "النواة الرقمية"]];
  const pctOf = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const sumOf = (xs, k) => xs.reduce((a, x) => a + (Number(x[k]) || 0), 0);
  const selBtn = (on, attr, label, sub) => `<button type="button" class="sela ${on ? "on" : ""}" ${attr} aria-pressed="${on}"><b>${label}</b><small>${sub}</small></button>`;
  /* يعيد رسم محتوى بطاقة في مكانها، ويحافظ على موضع التمرير الأفقي، ويحرّك الحلقة من قيمتها السابقة */
  function swap(id, html, keep) {
    const el = m.querySelector("#" + id); if (!el) return;
    const sc = {}; (keep || []).forEach((q) => { const x = el.querySelector(q); if (x) sc[q] = x.scrollLeft; });
    const r0 = el.querySelector("[data-ring]"), from = r0 ? r0.style.strokeDasharray : null;
    el.innerHTML = html;
    Object.entries(sc).forEach(([q, v]) => { const x = el.querySelector(q); if (x) x.scrollLeft = v; });
    const r1 = el.querySelector("[data-ring]");
    if (r1 && from && !matchMedia("(prefers-reduced-motion:reduce)").matches) { const to = r1.style.strokeDasharray; r1.style.transition = "none"; r1.style.strokeDasharray = from; r1.getBoundingClientRect(); r1.style.transition = ""; r1.style.strokeDasharray = to; }
    el.querySelectorAll(".cu").forEach((x) => countUp(x, x.dataset.cu));
    const f = el.querySelector("[data-focus]"); if (f && f.getBoundingClientRect().top < 0) f.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* ----- الخطط الذكية: اختيار خطة يغيّر الحلقة والمؤشرات والبرامج، والضغط على مؤشر يفرز البرامج ----- */
  let PSEL = { k: null, f: null, pj: null }, LWK = { events: [] };
  const PKF = [["all", "برنامجاً", ""], ["done", "منفّذ", ""], ["run", "قيد التنفيذ", ""], ["late", "متعثر", "lt"], ["doc", "موثق", ""], ["und", "ينتظر التوثيق", "lt"]];
  const PFN = { all: "كل البرامج", done: "المنفّذة", run: "قيد التنفيذ", late: "المتعثرة", doc: "الموثقة", und: "تنتظر التوثيق" };
  const pOk = (g, f) => f === "all" || (f === "doc" ? !!g.documented : f === "und" ? g.state === "done" && !g.documented : g.state === f);
  const pRow = (g) => { const st = PST[g.state] || ["", ""]; return `<li class="pgi"><span class="lb-st ${st[1]}">${st[0]}</span><div class="tx"><b>${esc(g.name)}</b><small>${esc(prange(g.day, g.until))}${g.beneficiary ? " · المستفيد: " + esc(g.beneficiary) : ""}</small>${g.plan ? `<small>الخطة: ${esc(g.plan)}</small>` : ""}${g.owner ? `<small class="ow">${pav(g.owner, g.photo, "xs")}${esc(g.owner)}</small>` : ""}</div><span class="dchip ${g.documented ? "ok" : ""}">${g.documented ? "موثق" : "غير موثق"}</span></li>`; };
  function progInner() {
    const ps = (LWK.events || []).filter((e) => e.kind === "program").sort((a, b) => String(a.day).localeCompare(String(b.day))); WP = ps;
    const pi = PSEL.k != null ? PD.findIndex((x) => x.name === PSEL.k) : -1, p = pi >= 0 ? PD[pi] : null; if (!p) PSEL.k = null;
    const o0 = PO || { total: 0, done: 0, running: 0, late: 0 };
    const o = p ? { all: p.total, done: p.done, run: p.running, late: p.late, doc: p.documented, und: p.undocumented } : { all: o0.total, done: o0.done, run: o0.running, late: o0.late, doc: sumOf(PD, "documented"), und: sumOf(PD, "undocumented") };
    const col = p ? PCOL[pi % PCOL.length] : "var(--brand)", pct = pctOf(o.done, o.all), dpc = pctOf(o.doc, o.all), C = 2 * Math.PI * 52;
    const head = `<div class="dh"><span class="ico c">${ic("program")}</span><div><h4>الخطط الذكية${p ? " · " + esc(p.name) : ""}</h4><p>${p ? "المؤشرات الآن لهذه الخطة وحدها · اضغط على أي مؤشر لفرز برامجها" : "اضغط على أي خطة لتتغير المؤشرات بحسبها، وعلى أي مؤشر لفرز البرامج"}</p></div><a href="/smart-plans/">انتقل إلى الخطط</a></div>`;
    const ring = `<div class="pgr"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="t"/><circle cx="60" cy="60" r="52" class="v" data-ring style="stroke:${col};stroke-dasharray:${((C * pct) / 100).toFixed(1)} ${C.toFixed(1)}"/></svg><div><b>${num(pct)}<small>%</small></b><span>${p ? "إنجاز الخطة" : "نسبة الإنجاز"}</span></div></div>`;
    const kp = `<div class="pgk" role="group" aria-label="فرز البرامج حسب المؤشر">${PKF.map(([k, l, c]) => `<button type="button" data-pf="${k}" class="${c && o[k] ? c : ""} ${PSEL.f === k ? "on" : ""}" aria-pressed="${PSEL.f === k}"><b>${num(o[k])}</b>${l}</button>`).join("")}</div>`;
    const focus = p ? `<div class="pfo" style="--c:${col}">${pav(p.owner, p.owner_photo, "l")}<div class="tx"><small>مسؤول الخطة${p.year ? " · " + esc(p.year) : ""}</small><b>${esc(p.owner || "لم يُحدَّد")}</b>${p.owner_job ? `<small>${esc(p.owner_job)}</small>` : ""}${p.desc ? `<p>${esc(String(p.desc).slice(0, 220))}</p>` : ""}</div><div class="bars2"><div><span>نسبة التنفيذ <b>${num(pct)}%</b></span><div class="lb-bar"><i style="width:${pct}%"></i></div></div><div><span>نسبة التوثيق <b>${num(dpc)}%</b></span><div class="lb-bar"><i style="width:${dpc}%"></i></div></div></div></div>` : "";
    const list = PD.length ? `<div class="plg">${selBtn(!p, 'data-pl="-1"', "كل الخطط", `${num(PD.length)} خطط · ${num(o0.total)} برنامجاً`)}${PD.map((x, i) => { const on = p === x, pc = pctOf(x.done, x.total); return `<button type="button" class="plc ${on ? "on" : p ? "dim" : ""}" data-pl="${i}" aria-pressed="${on}" style="--c:${PCOL[i % PCOL.length]}"><span class="top"><b>${esc(x.name)}</b>${x.late ? `<em class="bad">${num(x.late)} متعثر</em>` : ""}</span><span class="own">${pav(x.owner, x.owner_photo, "s")}<small>${esc(x.owner || "بلا مسؤول")}</small></span><span class="lb-bar"><i style="width:${pc}%"></i></span><span class="pcs"><i>${num(x.total)} برنامجاً</i><i>${num(x.done)} منفّذ</i><i>${num(x.documented)} موثق</i></span></button>`; }).join("")}</div>` : `<div class="lb-em">لا خطط مسجلة بعد.</div>`;
    let bottom;
    if (!p && PSEL.f == null) {
      const e = PSEL.pj != null ? ps[PSEL.pj] : null;
      const det = e ? `<div class="pgd" style="--c:${COL.plans}"><b>${esc(e.title)}</b><dl>${[["الموعد", `${dayName(e.day)} · ${prange(e.day, e.until)}`], ["المسؤول", e.owner], ["المستفيد", e.beneficiary], ["المكان", e.place || e.location], ["الحالة", e.status]].filter((r) => r[1]).map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl><a class="go" href="${esc(e.link || "/smart-plans/")}">${ic("up")} انتقل إلى البرنامج في الخطط الذكية</a></div>` : "";
      bottom = `<h5 class="pgh">برامج هذا الأسبوع · ${num(ps.length)}</h5>${ps.length ? `<div class="pgl">${ps.map((x, j) => `<button type="button" class="pgc ${PSEL.pj === j ? "on" : ""}" data-pj="${j}" aria-expanded="${PSEL.pj === j}"><span class="dy"><b>${num(new Date(x.day + "T12:00:00").getDate())}</b><small>${esc(dayName(x.day))}</small></span><span class="tx"><b>${esc(x.title)}</b><small>${x.until && x.until !== x.day ? `حتى ${esc(fmt(x.until))}` : "يوم واحد"}${x.owner ? " · " + esc(x.owner) : ""}</small>${x.beneficiary ? `<small>المستفيد: ${esc(x.beneficiary)}</small>` : ""}</span></button>`).join("")}</div>${det}` : `<div class="lb-em">لا برامج مجدولة هذا الأسبوع.</div>`}`;
    } else {
      const f = PSEL.f || "all", src = p ? (p.programs || []) : PD.flatMap((x) => (x.programs || []).map((g) => ({ ...g, plan: x.name }))), L = src.filter((g) => pOk(g, f));
      bottom = `<h5 class="pgh">${p ? "برامج الخطة" : "البرامج في كل الخطط"} · ${PFN[f]} · ${num(L.length)}${f !== "all" || !p ? ` <button type="button" class="pclr" data-pf="${f}">إلغاء الفرز</button>` : ""}</h5>${L.length ? `<ul class="pgl2">${L.map(pRow).join("")}</ul>` : `<div class="lb-em">لا برامج ${f === "all" ? "" : PFN[f] + " "}${p ? "في هذه الخطة" : ""}.</div>`}`;
    }
    return `${head}<div class="pgt" data-focus>${ring}<div class="pgm">${kp}</div></div>${focus}<h5 class="pgh">الخطط · ${num(PD.length)}</h5>${list}${bottom}`;
  }
  function progCard(wk) { if (wk) LWK = wk; return `<section class="lb-p lb-pg" id="lbPg">${progInner()}</section>`; }
  const rePg = () => swap("lbPg", progInner(), [".plg", ".pgl"]);
  /* ----- الحجوزات حسب الحصص ----- */
  function periodsCard(pd) {
    const ps = pd.periods || [], taken = ps.filter((p) => (p.bookings || []).length).length;
    const head = `<div class="dh"><span class="ico c">${ic("booking")}</span><div><h4>حجوزات اليوم حسب الحصص</h4><p>${num(taken)} حصص فيها حجوزات من ${num(ps.length)} · ${num(pd.total_bookable)} مرافق قابلة للحجز</p></div><a href="${esc(pd.link || "/facility-booking/bookings.html")}">احجز مرفقاً</a></div>`;
    const stl = { running: ["جارية الآن", "g"], upcoming: ["قادمة", "b"], ended: ["انتهت", ""] };
    return `<section class="lb-p lb-bk">${head}<div class="pdg">${ps.map((p) => { const bk = p.bookings || [], s = stl[p.state] || ["", ""]; return `<article class="pc ${esc(p.state)} ${bk.length ? "has" : "empty"}"><div class="ph"><b>${esc(p.name)}</b><small>${esc(tm2(p.from))} – ${esc(tm2(p.to))}</small><span class="lb-st ${s[1]}">${s[0]}</span></div>${bk.length ? bk.map((x) => `<div class="bi ${x.status === "pending" ? "pend" : ""}"><b>${esc(x.facility)}</b><small>${esc(x.who || "")}${x.purpose ? " · " + esc(x.purpose) : ""}</small>${x.status === "pending" ? `<em>بانتظار الاعتماد</em>` : ""}</div>`).join("") : `<div class="fr0"><span>فارغة</span><small>متاحة للحجز</small></div>`}</article>`; }).join("")}</div></section>`;
  }
  /* ----- المجتمعات المهنية: اختيار مجتمع يغيّر المؤشرات واللقاءات وآخر الأحداث في مكانها ----- */
  const CKIND = { plc: "مجتمع تعلم مهني", team: "فريق عمل", committee: "لجنة" };
  const AK = { meeting: ["لقاء", "b"], attendance: ["حضور", "g"], approval: ["اعتماد حضور", "g"], doc: ["توثيق", "y"], minutes: ["محضر", "p"], task: ["مهمة", ""], post: ["منشور", ""], output: ["مخرج", "p"] };
  const MST = { held: ["نُفِّذ", "g"], planned: ["مجدول", "b"], cancelled: ["ملغى", "r"], postponed: ["مؤجل", "y"] };
  let CSEL = null;
  function commInner() {
    const cs = CD, ci = CSEL != null ? cs.findIndex((x) => x.name === CSEL) : -1, c = ci >= 0 ? cs[ci] : null; if (!c) CSEL = null;
    const K = ["meetings_held", "meetings_upcoming", "docs", "minutes_approved", "att_present", "hours", "tasks_open", "tasks_late", "posts", "outputs", "members"], v = c || {}; if (!c) K.forEach((k) => (v[k] = sumOf(cs, k)));
    const head = `<div class="dh"><span class="ico y">${ic("meeting")}</span><div><h4>المجتمعات المهنية${c ? " · " + esc(c.name) : ""}</h4><p>${c ? "المؤشرات والأحداث الآن لهذا المجتمع وحده" : `${num(cs.length)} مجتمعاً نشطاً · اضغط على أي مجتمع لتتغير المؤشرات بحسبه`}</p></div><a href="${esc(c && c.link ? c.link : "/teachers-community/#/communities")}">انتقل إلى ${c ? "المجتمع" : "المجتمعات"}</a></div>`;
    const tiles = `<div class="cmk" data-focus>${tile(v.meetings_held, "لقاءات منفّذة", "g")}${tile(v.meetings_upcoming, "لقاءات قادمة", "b")}${tile(v.docs, "لقاءات موثقة", "g")}${tile(v.minutes_approved, "محاضر معتمدة", "g")}${tile(v.att_present, "حضور مسجّل")}${tile(v.hours, "ساعات حضور معتمدة")}${tile(v.tasks_open, "مهام مفتوحة", v.tasks_late ? "y" : "")}${tile(v.tasks_late, "مهام متأخرة", v.tasks_late ? "r" : "")}${tile((v.posts || 0) + (v.outputs || 0), "منشورات ومخرجات")}${c ? "" : tile(v.members, "عضوية")}</div>`;
    let focus = "";
    if (c) {
      const meet = (c.meetings || []).map((x) => { const st = MST[x.status] || [x.status, ""]; return `<li class="pgi"><span class="lb-st ${st[1]}">${esc(st[0])}</span><div class="tx"><b>${x.no ? "اللقاء " + num(x.no) + " · " : ""}${esc(x.title)}</b><small>${esc(dt(x.at))}${x.location ? " · " + esc(x.location) : ""}</small>${x.status === "held" || x.invited ? `<small>الحضور: ${num(x.present)} من ${num(x.invited)}${x.images ? " · " + num(x.images) + " صورة موثقة" : ""}</small>` : ""}${x.decisions ? `<small class="dc2">القرارات: ${esc(String(x.decisions).slice(0, 140))}</small>` : ""}</div><span class="dchip ${x.documented ? "ok" : ""}">${x.documented ? "موثق" : x.status === "held" ? "غير موثق" : "—"}</span>${x.minutes ? `<span class="dchip ${x.minutes === "approved" ? "ok" : ""}">${x.minutes === "approved" ? "محضر معتمد" : "محضر قيد الاعتماد"}</span>` : ""}</li>`; }).join("");
      const mem = (c.member_list || []).map((x) => `<span class="mchip">${pav(x.name, x.photo, "xs")}${esc(x.name)}${x.role === "leader" ? "<em>قائد</em>" : ""}</span>`).join("");
      focus = `<div class="cfo"><div class="ownr">${pav(c.leader, c.leader_photo, "l")}<div><small>قائد المجتمع · ${esc(CKIND[c.kind] || c.kind || "مجتمع مهني")}${c.domain ? " · " + esc(c.domain) : ""}</small><b>${esc(c.leader || "لم يُحدَّد")}</b><small>${num(c.members)} عضواً${c.start_on ? " · منذ " + esc(fmt(c.start_on)) : ""}</small></div></div>${c.description ? `<p class="dsc">${esc(String(c.description).slice(0, 220))}</p>` : ""}
        <h5>اللقاءات · ${num(c.meetings_total ?? (c.meetings || []).length)}</h5>${meet ? `<ul class="pgl2">${meet}</ul>` : em("لا لقاءات مسجلة بعد.")}${mem ? `<h5>الأعضاء · ${num(c.members)}</h5><div class="mem">${mem}</div>` : ""}</div>`;
    }
    const one = (x, i) => { const on = c === x; return `<button type="button" class="cm ${on ? "on" : c ? "dim" : ""}" data-cm="${i}" aria-pressed="${on}"><span class="ci">${ic("meeting")}</span><b>${esc(x.name)}</b><small>${esc(CKIND[x.kind] || x.kind || "")}${x.leader ? " · القائد: " + esc(x.leader) : ""}</small><span class="cn"><em>${num(x.members)}</em> أعضاء <em>${num(x.meetings_held)}</em> منفّذ <em>${num(x.docs)}</em> موثق</span></button>`; };
    const evs = (c ? [[c, ci]] : cs.map((x, i) => [x, i])).flatMap(([x, i]) => (x.activity || []).map((a) => ({ ...a, cn: x.name, i }))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, c ? 15 : 10);
    return `${head}${tiles}${focus}${cs.length ? `<div class="cmg">${selBtn(!c, 'data-cm="-1"', "كل المجتمعات", `${num(cs.length)} مجتمعاً`)}${cs.map(one).join("")}</div>` : em("لا مجتمعات نشطة.")}
      <div class="ce"><h5>${c ? "ماذا يحدث في المجتمع" : "آخر ما حدث داخل المجتمعات"}</h5>${evs.length ? evs.map((x) => { const k = AK[x.kind] || [x.kind, ""]; return `<button type="button" class="ei" ${c ? "" : `data-cm="${x.i}"`}><span class="kd ${x.kind === "doc" || x.kind === "minutes" ? "doc" : ""}">${esc(k[0])}</span><span class="tx"><b>${esc(x.text)}</b><small>${c ? "" : esc(x.cn)}${x.who ? (c ? "" : " · ") + esc(x.who) : ""}</small></span><time>${REL(x.at)}</time></button>`; }).join("") : em("لا أحداث حديثة.")}</div>`;
  }
  function commCard() { return `<section class="lb-p dkc lb-cm" id="lbCm">${commInner()}</section>`; }
  const reCm = () => swap("lbCm", commInner(), [".cmg"]);
  /* ----- لوحات التفاصيل داخل البطاقة (بدل النوافذ المنبثقة) ----- */
  const xsvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ixp = (k, col, kind, title, rows, href, label, extra, after) => `<div class="ixp" style="--c:${col}"><div class="ih"><div><span>${esc(kind)}</span><b>${esc(title)}</b></div><button type="button" class="icl" data-x="${k}" aria-label="إخفاء التفاصيل">${xsvg}</button></div>${extra || ""}${rows.filter((r) => r[1] != null && r[1] !== "").length ? `<dl>${rows.filter((r) => r[1] != null && r[1] !== "").map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl>` : ""}${after || ""}${href ? `<a class="go" href="${esc(href)}">${ic("up")} ${esc(label)}</a>` : ""}</div>`;
  const SEL = { dc: null, gr: null, ac: null, tp: null };
  const PANEL = {
    dc: ["lbDocs", (i) => { const x = DOCS[i]; return x && ixp("dc", "#b86d0c", "توثيق · الخطط الذكية", x.title, [["المنفذ", x.executor], ["تاريخ التنفيذ", x.date ? fmt(x.date) : dt(x.at)], ["المكان", x.location], ["المشاركون", x.participants], ["عدد المستفيدين", x.beneficiaries], ["الوصف", x.description], ["المخرجات", x.outputs]], x.link || "/smart-plans/", "انتقل إلى التوثيق في الخطط الذكية", `<div class="dg">${x.images.map((q) => `<img loading="lazy" alt="" src="${esc(pub("sp-evidence", q))}">`).join("")}</div>`); }],
    gr: ["lbGr", (i) => { const x = GLD[i]; return x && ixp("gr", hue(x.who)[0], GK[x.kind] || x.kind || "نشاط مهني", x.title, [["المعلم", x.who], ["الجهة", x.provider], ["الساعات", x.hours ? num(x.hours) + " ساعة" : ""], ["الحالة", x.status === "approved" ? "معتمد" : "بانتظار المراجعة"], ["أضيف", REL(x.at)]], x.link, "انتقل إلى النمو المهني"); }],
    ac: ["lbAch", (i) => { const x = ACD[i]; if (!x) return ""; const tot = ACD.reduce((a, y) => a + (y.hours || 0), 0), mine = GLD.filter((g) => g.who === x.name);
      return ixp("ac", hue(x.name)[0], `المركز ${num(i + 1)} في النمو المهني`, x.name, [["التخصص", x.specialty || "معلم"], ["الساعات المعتمدة", num(x.hours) + " ساعة"], ["عدد الأنشطة", num(x.records)], ["نصيبه من ساعات الأكثر إنجازاً", num(pctOf(x.hours, tot)) + "%"], ["متوسط الساعات لكل نشاط", x.records ? num(Math.round((10 * x.hours) / x.records) / 10) : ""]], x.link, "انتقل إلى سجلات المعلم", "", mine.length ? `<h6>أحدث أنشطته</h6><ul class="ixl">${mine.map((g) => `<li><b>${esc(g.title)}</b><small>${esc(GK[g.kind] || g.kind || "نشاط")}${g.hours ? " · " + num(g.hours) + " ساعة" : ""} · ${REL(g.at)}</small></li>`).join("")}</ul>` : ""); }],
    tp: ["lbTop", (i) => { const x = TPD[i]; if (!x) return ""; const f = TPD[0], nx = TPD[i - 1];
      return ixp("tp", hue(x.name)[0], `المركز ${num(x.rank)} في لوحة الصدارة`, x.name, [["الصف والفصل", [x.grade, x.section].filter(Boolean).join(" · ")], ["النقاط", num(x.balance) + " نقطة"], ["الفرق عن الأول", i > 0 && f ? num(f.balance - x.balance) + " نقطة" : "في الصدارة"], ["الفرق عن المركز الأعلى", nx ? num(nx.balance - x.balance) + " نقطة" : ""]], x.id ? "/report/profile.html?k=student&id=" + encodeURIComponent(x.id) : TPL, x.id ? "انتقل إلى ملف الطالب في مرآة" : "انتقل إلى لوحة الشرف في قيمي"); }],
  };
  function applySel(k) {
    const [id, fn] = PANEL[k], sec = m.querySelector("#" + id); if (!sec) return; const v = SEL[k];
    sec.classList.toggle("sel", v != null);
    sec.querySelectorAll(`[data-${k}]`).forEach((b) => { const on = +b.dataset[k] === v; b.classList.toggle("on", on); b.classList.toggle("dim", v != null && !on); b.setAttribute("aria-pressed", on); });
    const slot = sec.querySelector(".ixh"); if (!slot) return; slot.innerHTML = v == null ? "" : fn(v) || "";
    if (v == null && SEL[k] != null) SEL[k] = null;
    const f = slot.firstElementChild; if (f) { const r = f.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 0) f.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }
  /* كل الضغطات داخل اللوحة تُعالج في مكانها؛ الروابط الوحيدة هي أزرار الانتقال إلى الأنظمة فتفتح صفحاتها مباشرة */
  m.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-pl],[data-pf],[data-pj],[data-cm],[data-dm],[data-sq],[data-dc],[data-gr],[data-ac],[data-tp],[data-x]");
    if (!t || !m.contains(t)) return;
    const d = t.dataset;
    if (d.x != null) { SEL[d.x] = null; return applySel(d.x); }
    for (const k of ["dc", "gr", "ac", "tp"]) if (d[k] != null) { SEL[k] = SEL[k] === +d[k] ? null : +d[k]; return applySel(k); }
    if (d.pl != null) { const x = PD[+d.pl]; PSEL = x && PSEL.k !== x.name ? { k: x.name, f: "all", pj: null } : { k: null, f: null, pj: null }; return rePg(); }
    if (d.pf != null) { PSEL.f = PSEL.f === d.pf ? (PSEL.k ? "all" : null) : d.pf; PSEL.pj = null; return rePg(); }
    if (d.pj != null) { PSEL.pj = PSEL.pj === +d.pj ? null : +d.pj; return rePg(); }
    if (d.cm != null) { const x = CD[+d.cm]; CSEL = x && CSEL !== x.name ? x.name : null; return reCm(); }
    if (d.dm != null) { const x = (IND.domains || [])[+d.dm]; DSEL = x && DSEL !== x.name ? x.name : null; return reInd(); }
    if (d.sq != null) return pickSys(d.sq);
  });
  /* ----- قيمي: لوحة الصدارة، المعلمون الأكثر منحاً، آخر الأوسمة ----- */
  function topStrip(top, link) {
    TPD = top; TPL = link;
    const head = `<div class="dh"><span class="ico y">${ic("star")}</span><div><h4>لوحة الصدارة · قيمي</h4><p>أفضل ${num(top.length)} طلاب بحسب النقاط · اضغط على أي طالب لتفاصيله</p></div><a href="${esc(link)}">لوحة الشرف</a></div>`;
    if (!top.length) return `<section class="lb-p lb-top" id="lbTop">${head}${em("لا بيانات في لوحة الشرف بعد.")}</section>`;
    const mx = Math.max(1, ...top.map((x) => x.balance));
    const one = (x, i) => `<button type="button" class="tp r${x.rank <= 3 ? x.rank : 0}" data-tp="${i}" aria-pressed="false" style="--h:${hue(x.name)[0]}"><span class="rk">${num(x.rank)}</span>${x.rank === 1 ? `<span class="cr">${ic("crown")}</span>` : ""}<span class="ph">${esc(mono(x.name))}</span><b>${esc(x.name)}</b><small>${esc(x.grade || "")}${x.section ? " · " + esc(x.section) : ""}</small><span class="pt"><i style="width:${(100 * x.balance) / mx}%"></i></span><em>${num(x.balance)} نقطة</em></button>`;
    const set = top.map(one).join("");
    return `<section class="lb-p lb-top" id="lbTop" aria-label="أفضل 10 طلاب">${head}<div class="vp"><div class="tr" style="animation-duration:${Math.max(40, top.length * 7)}s">${set}${set}</div></div><div class="ixh"></div></section>`;
  }
  function qCard(givers, badges, link, wkBadges) {
    const gv = (givers || []).filter((g) => g.name !== "مدير النواة الرقمية").sort((a, b) => (b.badges || 0) - (a.badges || 0) || (b.reinforcements || 0) - (a.reinforcements || 0)).slice(0, 10);
    const head = `<div class="dh"><span class="ico g">${ic("user")}</span><div><h4>معلمون يصنعون الحركة</h4><p>الأكثر منحاً للتعزيز والأوسمة · ${num(wkBadges)} وساماً هذا الأسبوع</p></div><a href="${esc(link)}">قيمي</a></div>`;
    return `<section class="lb-p lb-q">${head}${gv.length ? `<div class="lb-faces">${gv.map((g) => faceCard({ name: g.name, specialty: g.specialty || "معلم", photo: (people[g.name] || {}).photo }, g)).join("")}</div>` : em("لم يمنح أحد تعزيزاً أو وساماً بعد.")}
      <h5 class="sh5">آخر الأوسمة الممنوحة</h5>${(badges || []).length ? `<div class="lb-bdg">${badges.map((x) => `<article class="bd2"><div class="im">${x.image ? `<img loading="lazy" alt="" src="${esc(pub("qm-badges", x.image))}">` : `<span>${esc(mono(x.badge))}</span>`}</div><b>${esc(x.badge)}</b><div class="who">${esc(x.student)}</div><small>منحه ${esc(x.by || "—")}</small><small>${REL(x.at)}</small></article>`).join("")}</div>` : em("لم تُمنح أوسمة بعد.")}</section>`;
  }

  /* ----- حالة الأنظمة: مربعات صغيرة ----- */
  const SICO = { core: "school", saas: "check", plans: "plan", community: "users", indibati: "clock", qiyami: "star", booking: "cal" };
  const SDESC = { core: "الهوية الموحدة والسجلات", saas: "المؤشرات والشواهد والتقييم", plans: "الخطط والبرامج وتوثيقها", community: "النمو المهني والمجتمعات", indibati: "الحضور والغياب والتأخر", qiyami: "النقاط والأوسمة والسلوك", booking: "حجز المرافق والقاعات" };
  const SURL = { core: "/digital-core/dashboard.html", saas: "/self-evaluation/admin.html", plans: "/smart-plans/", community: "/teachers-community/", indibati: "/indibati/dashboard.html", qiyami: "/qiyami/leaderboard.html", booking: "/facility-booking/bookings.html" };
  let SYSI = {}, SSEL = null, SYSD = null, SFD = {};
  function sysInner() {
    const [d, pl] = SYSD, tot = Object.values(pl.by_sys).reduce((a, b) => a + b, 0) || 1; SYSI = {};
    const act = Object.keys(SYS).filter((k) => d.sources && d.sources[k] && (Date.now() - new Date(d.sources[k])) / 864e5 < 2).length;
    const sq = Object.keys(SYS).map((k) => {
      const v = d.sources && d.sources[k], age = v ? (Date.now() - new Date(v)) / 864e5 : 99, st = age < 2 ? ["نشط", "ok"] : age < 7 ? ["هادئ", "mid"] : ["ساكن", "old"], n = pl.by_sys[k] || 0, on = SSEL === k; SYSI[k] = { st, n, v, share: Math.round((100 * n) / tot) };
      return `<button type="button" class="sq ${st[1]} ${on ? "on" : SSEL ? "dim" : ""}" data-sq="${k}" aria-pressed="${on}"><span class="bd"><i></i>${st[0]}</span><span class="si">${ico(SICO[k])}</span><b>${esc(SYS[k])}</b><small>${num(n)} سجلاً</small></button>`; }).join("");
    const i = SSEL ? SYSI[SSEL] : null; if (SSEL && !i) SSEL = null;
    const fd = SSEL ? SFD[SSEL] : null, feed = !SSEL ? "" : fd === undefined ? `<small>جارٍ تحميل آخر الأحداث…</small>` : fd === null ? `<small>تعذر تحميل الأحداث.</small>` : fd.length ? fd.map((x) => `<div class="sfi"><b>${esc(x.title)}</b><small>${esc(x.actor || "")}${x.actor ? " · " : ""}${REL(x.at)}</small></div>`).join("") : `<small>لا أحداث حديثة.</small>`;
    const pan = i ? `<div class="sxp" data-focus><div class="h2"><span class="lb-st ${i.st[1] === "ok" ? "g" : i.st[1] === "mid" ? "y" : ""}">${esc(i.st[0])}</span><b>${esc(SYS[SSEL])}</b><small>${esc(SDESC[SSEL])}</small></div><div class="sx2"><div><b>${num(i.n)}</b><span>سجلاً في 14 يوماً</span></div><div><b>${REL(i.v)}</b><span>آخر نشاط</span></div><div><b>${num(i.share)}%</b><span>من حركة المدرسة</span></div></div><h5>آخر الأحداث</h5><div class="sf2">${feed}</div><a class="go" href="${SURL[SSEL]}">${ic("up")} انتقل إلى ${esc(SYS[SSEL])}</a></div>` : "";
    return `<div class="dh"><span class="ico g">${ic("shield")}</span><div><h4>حالة الأنظمة${SSEL ? " · " + esc(SYS[SSEL]) : ""}</h4><p>${num(act)} أنظمة نشطة من ${num(Object.keys(SYS).length)} · اضغط على أي نظام لتظهر تفاصيله هنا</p></div></div><div class="stl">${sq}</div>${pan}`;
  }
  function sysCard(d, pl) { SYSD = [d, pl]; SFD = {}; return `<section class="lb-p lb-sys" id="lbSys">${sysInner()}</section>`; }
  const reSys = () => swap("lbSys", sysInner(), [".stl"]);
  async function pickSys(k) {
    SSEL = SSEL === k ? null : k; reSys();
    if (!SSEL || SFD[k] !== undefined) return;
    try { const r = await rpc("lb_feed", { p_from: null, p_to: null, p_sys: k, p_kind: null, p_op: null, p_ach: null, p_limit: 5, p_offset: 0 }); SFD[k] = r.items || []; } catch (e) { SFD[k] = null; }
    if (SSEL === k) reSys();
  }

  async function overview() {
    const [d, pl, docs, gl, ach, pd, cs, cev, top, hn, md] = await Promise.all([rpc("lb_day", { p_day: null }), hero(), rpc("lb_docs", { p_limit: 12 }).catch(() => []), rpc("lb_growth_latest", { p_n: 8 }).catch(() => []), rpc("lb_achievers", { p_n: 6 }).catch(() => []), rpc("lb_periods", { p_day: null }).catch(() => ({ periods: [] })), rpc("lb_communities").catch(() => []), rpc("lb_feed", { p_from: null, p_to: null, p_sys: "community", p_kind: null, p_op: null, p_ach: null, p_limit: 6, p_offset: 0 }).then((r) => r.items).catch(() => []), rpc("lb_top", { p_n: 10 }).catch(() => []), rpc("lb_honor").catch(() => ({ badges: [], link: "/qiyami/leaderboard.html" })), rpc("lb_media").catch(() => ({ people: [] }))]);
    PO = await rpc("lb_plans_overview").catch(() => null);
    [PD, CD] = await Promise.all([rpc("lb_plans_detail").catch(() => []), rpc("lb_communities_detail").catch(() => [])]);
    people = {}; (md.people || []).forEach((p) => (people[p.name] = p));
    const q = d.qiyami || {};
    body.innerHTML = `${disCard(d.attendance || {})}
      ${docsStrip(docs || [])}
      <section id="lbCal" class="lb-calw" aria-label="التقويم واللقاءات"></section>
      ${indCard(d.indicators || {})}
      ${growthCard(gl || [])}
      ${achCard(ach || [])}
      ${periodsCard(pd || { periods: [] })}
      ${commCard()}
      ${topStrip(top || [], hn.link || "/qiyami/leaderboard.html")}
      ${qCard(q.givers, hn.badges, hn.link || "/qiyami/leaderboard.html", q.week && q.week.badges)}
      ${sysCard(d, pl)}`;
    if (kp) body.prepend(kp);
    body.querySelectorAll(".cu").forEach((el) => countUp(el, el.dataset.cu));
    Object.keys(SEL).forEach((k) => SEL[k] != null && applySel(k));
    await calWidget(body.querySelector("#lbCal"));
  }

  /* ---------- سجل التحديثات ---------- */
  async function logView() {
    const f = S.feed, LIM = 30;
    const [r] = await Promise.all([rpc("lb_feed", { p_from: f.from ? new Date(f.from + "T00:00:00+03:00").toISOString() : null, p_to: f.to ? new Date(f.to + "T23:59:59+03:00").toISOString() : null, p_sys: f.sys || null, p_kind: f.kind || null, p_op: f.op || null, p_ach: null, p_limit: LIM, p_offset: f.off }), hero(), rpc("lb_media").then((md) => { people = {}; (md.people || []).forEach((p) => (people[p.name] = p)); }).catch(() => {})]);
    const it = r.items || [], tot = Number(r.total || 0);
    const opt = (o, v) => Object.entries(o).map(([k, n]) => `<option value="${k}" ${v === k ? "selected" : ""}>${esc(n)}</option>`).join("");
    body.innerHTML = `<div class="lb-sec"><h3>سجل التحديثات الموحد</h3><small>${num(tot)} سجل</small></div><div class="lb-p">
      <div class="lb-fl"><select id="fS" aria-label="النظام"><option value="">كل الأنظمة</option>${opt(SYS, f.sys)}</select><select id="fK" aria-label="النوع"><option value="">كل الأنواع</option>${opt(KIND, f.kind)}</select><select id="fO" aria-label="العملية"><option value="">جديد ومعدل</option>${opt(OP, f.op)}</select><input type="date" id="fF" value="${esc(f.from)}" aria-label="من تاريخ"><input type="date" id="fT" value="${esc(f.to)}" aria-label="إلى تاريخ"></div>
      ${it.length ? `<div class="tw"><table><thead><tr><th>العملية</th><th>الوصف</th><th>النظام</th><th>المسؤول</th><th>التاريخ والوقت</th></tr></thead><tbody>${it.map((x, i) => `<tr><td><span class="lb-st ${x.op === "new" ? "g" : "b"}">${esc(OP[x.op] || x.op)}</span><div style="color:#6a8696;font-size:.76rem;margin-top:3px">${esc(KIND[x.kind] || x.kind)}</div></td><td><button type="button" class="lgt" data-lg="${i}" aria-expanded="false">${esc(x.title)}</button>${x.detail ? `<div style="color:#6a8696;font-size:.78rem">${esc(x.detail)}</div>` : ""}</td><td>${chip(x.sys)}</td><td style="white-space:nowrap">${x.actor ? `<span style="display:inline-flex;gap:8px;align-items:center">${av(x.actor, x.sys)}${esc(x.actor)}</span>` : "—"}</td><td>${dt(x.at)}</td></tr>`).join("")}</tbody></table></div>` : em("لا سجلات مطابقة للتصفية.")}
      <div class="lb-fl" style="margin:14px 0 0;justify-content:center"><button id="fP" type="button" ${f.off === 0 ? "disabled" : ""}>السابق</button><span style="align-self:center;color:#6a8696;font-size:.84rem">${tot ? f.off + 1 : 0} – ${Math.min(f.off + LIM, tot)} من ${num(tot)}</span><button id="fN" type="button" ${f.off + LIM >= tot ? "disabled" : ""}>التالي</button></div></div>`;
    const bind = (id, k) => (body.querySelector(id).onchange = (e) => { f[k] = e.target.value; f.off = 0; load(); });
    bind("#fS", "sys"); bind("#fK", "kind"); bind("#fO", "op"); bind("#fF", "from"); bind("#fT", "to");
    body.querySelectorAll("[data-lg]").forEach((b) => (b.onclick = () => { const tr = b.closest("tr"), nx = tr.nextElementSibling; if (nx && nx.classList.contains("lgd")) { nx.remove(); b.setAttribute("aria-expanded", "false"); return; } const x = it[+b.dataset.lg]; b.setAttribute("aria-expanded", "true"); tr.insertAdjacentHTML("afterend", `<tr class="lgd"><td colspan="5">${ixp("lg", COL[x.sys] || "#0f8a94", (OP[x.op] || x.op) + " · " + (KIND[x.kind] || x.kind), x.title, [["التفاصيل", x.detail], ["النظام", SYS[x.sys]], ["المسؤول", x.actor], ["التاريخ والوقت", dt(x.at)]], x.link, "انتقل إلى " + (SYS[x.sys] || "النظام")).replace(`data-x="lg"`, `data-xl`)}</td></tr>`); tr.nextElementSibling.querySelector("[data-xl]").onclick = () => b.click(); }));
    body.querySelector("#fP").onclick = () => { f.off = Math.max(0, f.off - LIM); load(); }; body.querySelector("#fN").onclick = () => { f.off += LIM; load(); };
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const t = e.target; t.style.transitionDelay = (t.dataset.rd || 0) + "ms"; t.classList.add("in-v"); io.unobserve(t); } }), { threshold: 0.06 }) : null;
  let quiet = false;
  const reveal = () => { const root = m.querySelector(".lb"); if (!io) return; root.classList.add("js"); let i = 0; m.querySelectorAll(".lb-p,.lb-sc,.lb-hv,.lb-face,.lb-sec,.lb-shots,.lb-tick,.lb-wd").forEach((el) => { if (el.classList.contains("in-v")) return; if (quiet) { el.classList.add("in-v"); return; } el.dataset.rd = Math.min((i++ % 6) * 70, 350); io.observe(el); }); };
  async function load(silent) {
    if (!silent) skel();
    try { await ({ ov: overview, log: logView })[S.view](); ok = true; last = new Date(); quiet = !!silent; reveal(); }
    catch (e) { ok = false; if (!silent || body.querySelector(".lb-sk")) body.innerHTML = em(e && e.code === "42501" ? "هذه النافذة متاحة لمنسوبي المدرسة المفعّلة حساباتهم." : "تعذر تحميل البيانات حالياً. اضغط «تحديث» للمحاولة مرة أخرى."); }
    setStatus();
  }
  m.querySelectorAll(".lb-tabs [data-v]").forEach((b) => (b.onclick = () => { S.view = b.dataset.v; m.querySelectorAll(".lb-tabs [data-v]").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
  m.querySelector("#lbR").onclick = () => load();
  setInterval(() => { if (!document.hidden && S.view === "ov") load(true); }, 600000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.view === "ov") load(true); });
  await load();
}
