/* «يحدث في لبيد» – نافذة قراءة فقط. تستدعي دوال التجميع lb_* فقط ولا تكتب في أي جدول. */
async function lbeedPage(m) {
  const SYS = { core: "النواة الرقمية", saas: "التقويم المدرسي الذكي", plans: "الخطط الذكية", community: "مجتمع لبيد المهني", indibati: "انضباطي", qiyami: "قيمي", booking: "احجز مرفق" };
  const COL = { core: "#0f8a94", saas: "#2f5ea8", plans: "#b86d0c", community: "#7a4bb5", indibati: "#b8434f", qiyami: "#24895a", booking: "#0da9a6" };
  const KIND = { meeting: "اجتماع", program: "برنامج", booking: "حجز", deadline: "موعد", task: "مهمة", calendar: "تقويم", attendance: "حضور", achievement: "إنجاز" };
  const OP = { new: "جديد", update: "تعديل" };
  const ST = { upcoming: ["قادم", "b"], running: ["جارٍ الآن", "g"], ended: ["انتهى", ""], cancelled: ["ملغى", "r"], postponed: ["مؤجل", "y"] };
  const DOC = { none: ["لم يوثق", "y"], pending: ["بانتظار الاعتماد", "b"], documented: ["موثق", "g"] };
  const HUES = [["#0f8a94", "#0c4f5c"], ["#2f5ea8", "#183869"], ["#7a4bb5", "#43286d"], ["#b86d0c", "#6b3e04"], ["#24895a", "#14503a"], ["#b8434f", "#6d222c"]];
  const S = { view: "week", day: null, mon: null, kf: "all", wk: null, wkMode: "grid", feed: { sys: "", kind: "", op: "", from: "", to: "", off: 0 } };
  const base = (APP_CONFIG && APP_CONFIG.supabaseUrl) || "";
  const pub = (b, p) => `${base}/storage/v1/object/public/${b}/${String(p).split("/").map(encodeURIComponent).join("/")}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const nowRy = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const tm = (t) => (t ? new Date(t).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const tm2 = (s) => (s ? String(s).slice(0, 5) : "—");
  const dt = (t) => (t ? new Date(t).toLocaleString("ar-SA-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const dayName = (s) => new Date(s + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" });
  const num = (v) => (v == null ? "—" : Number(v).toLocaleString("ar-SA-u-nu-latn"));
  const hijri = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const greg = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(d);
  const lnk = (l, t) => (l ? `<a href="${esc(l)}">${esc(t)}</a>` : esc(t));
  const chip = (k) => `<span class="lb-chip" style="--c:${COL[k] || "#0f8a94"}">${esc(SYS[k] || k)}</span>`;
  const stB = (s) => { const x = ST[s] || [s, ""]; return `<span class="lb-st ${x[1]}">${esc(x[0])}</span>`; };
  const em = (t, a) => `<div class="lb-em">${esc(t)}${a ? ` <a href="${esc(a[0])}">${esc(a[1])}</a>` : ""}</div>`;
  const mono = (n) => { const w = String(n || "؟").trim().split(/\s+/); return (w[0][0] || "") + (w[1] ? w[1][0] : ""); };
  const hue = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
  let people = {}, last = null, ok = true;
  const av = (name, sys) => { const p = people[name]; const c = sys ? COL[sys] : hue(name)[0]; return `<span class="lb-av" style="--c:${c}">${p && p.photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", p.photo))}">` : esc(mono(name))}</span>`; };

  m.innerHTML = `<div class="lb">
    <section class="lb-hero" aria-label="نبض لبيد"><div class="lb-beat" id="lbBeat" aria-hidden="true"></div><div class="in"><div class="row"><div class="ttl"><h2>يحدث في لبيد</h2><p class="tag">لبيد تتحرك، وإنجازاتها تُرى</p></div>
      <div class="lb-mini" id="lbStats"></div>
      <div class="dt"><b id="lbH"></b><span id="lbG"></span><span class="live" id="lbLive"><i></i><span id="lbLiveT">جارٍ التحميل</span></span><span id="lbU"></span></div></div></div></section>
    <nav class="lb-tabs" aria-label="عروض النافذة"><div class="in"><button data-v="week" class="on" type="button">الأسبوع</button><button data-v="log" type="button">سجل التحديثات</button><span class="sp"></span><button class="rf" id="lbR" type="button">${ico("refresh")} تحديث</button></div></nav>
    <div class="lb-main"><div id="lbBody"></div>
    <p style="color:#6a8696;font-size:.82rem;margin:30px 0 6px">نافذة قراءة فقط تجمع ما تسجله أنظمة المدرسة السبعة من مصادرها الأصلية دون نسخ أو تعديل، وتحترم صلاحيات كل نظام. لا تُعرض فيها حالات فردية للطلاب، وتظهر الصور المنشورة فقط.</p></div></div>`;
  const body = m.querySelector("#lbBody");
  const nd = nowRy();
  m.querySelector("#lbH").textContent = hijri(nd);
  m.querySelector("#lbG").textContent = greg(nd) + " م";
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
  let heroDone = false;
  async function hero() {
    const [pl, dd] = await Promise.all([rpc("lb_pulse", { p_days: 14 }), rpc("lb_day", { p_day: null })]);
    m.querySelector("#lbBeat").innerHTML = heartbeat(pl.days);
    const tot = pl.days.reduce((a, x) => a + x.n, 0), tdy = pl.days[pl.days.length - 1].n, active = Object.values(pl.by_sys).filter((v) => v > 0).length;
    const meet = (dd.pulse.meetings || 0) + (dd.pulse.pro_meetings || 0);
    m.querySelector("#lbStats").innerHTML = [["حركة اليوم", tdy], ["آخر 14 يوماً", tot], ["أنظمة نشطة من 7", active], ["اجتماعات اليوم", meet]].map(([l, v]) => `<div><b data-n="${v}">0</b><span>${l}</span></div>`).join("");
    if (!heroDone) { m.querySelectorAll("#lbStats b").forEach((b) => countUp(b, b.dataset.n)); heroDone = true; } else m.querySelectorAll("#lbStats b").forEach((b) => (b.textContent = num(b.dataset.n)));
    return pl;
  }

  /* ---------- اليوم ---------- */
  const faceCard = (p, g) => { const [h1, h2] = hue(p.name); return `<article class="lb-face" style="--h1:${h1};--h2:${h2}">${p.photo ? `<img loading="lazy" alt="${esc(p.name)}" src="${esc(pub("public-photos", p.photo))}">` : `<div class="mono">${esc(mono(p.name))}</div>`}${g && (g.reinforcements || g.badges) ? `<span class="bd">${num(g.reinforcements)} تعزيزاً${g.badges ? " · " + num(g.badges) + " وساماً" : ""}</span>` : ""}<div class="cap"><b>${esc(p.name)}</b><span>${esc(p.specialty || "")}</span></div></article>`; };
  const REL = (t) => { if (!t) return "لا نشاط مسجل"; const s = (Date.now() - new Date(t)) / 1000; if (s < 90) return "الآن"; if (s < 3600) return "منذ " + Math.round(s / 60) + " د"; if (s < 86400) return "منذ " + Math.round(s / 3600) + " س"; return "منذ " + Math.round(s / 86400) + " يوم"; };
  const WD = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const calSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="12" width="48" height="44" rx="9"/><path d="M8 26h48M20 6v10M44 6v10M22 38h6M36 38h6M22 47h6"/></svg>`;
  const camSvg = `<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 20h10l4-6h20l4 6h10v34H8z"/><circle cx="32" cy="35" r="10"/></svg>`;

  const GRP = { meeting: "اجتماعات", program: "برامج", task: "مهام", deadline: "مهام", booking: "حجوزات", calendar: "مواعيد التقويم" };
  const FK = [["all", "الكل"], ["meeting", "اجتماعات"], ["program", "برامج"], ["task", "مهام ومواعيد"], ["booking", "حجوزات"], ["calendar", "تقويم المدرسة"]];
  const kOf = (e) => (e.kind === "deadline" ? "task" : e.kind);
  function weekGuide(host, w, dd) {
    const ev = w.events || [], td = iso(nowRy()), days = [];
    for (let i = 0; i < 7; i++) { const x = new Date(w.from + "T12:00:00"); x.setDate(x.getDate() + i); days.push(iso(x)); }
    const cnt = (k) => ev.filter((e) => k === "all" || kOf(e) === k).length;
    const list = ev.filter((e) => S.kf === "all" || kOf(e) === S.kf);
    const typeName = (e) => ({ meeting: "اجتماع", program: "برنامج", task: "مهمة", deadline: "موعد", booking: "حجز", calendar: "تقويم" }[e.kind] || e.kind);
    const row = (e) => `<a class="lb-wi" style="--c:${COL[e.sys]}" href="${esc(e.link || "#")}"><span class="tp">${typeName(e)}</span><span class="tt"><b>${esc(e.title)}</b><small>${esc(SYS[e.sys] || "")}${e.owner ? " · " + esc(e.owner) : ""}${e.starts_at ? " · " + tm(e.starts_at) : e.from ? " · " + tm2(e.from) + (e.to ? " – " + tm2(e.to) : "") : ""}${e.until && e.until !== e.day ? " · حتى " + fmt(e.until) : ""}${e.status ? " · " + esc(e.status) : ""}</small></span></a>`;
    const groups = days.map((k) => { const items = list.filter((e) => e.day === k); return `<div class="lb-wg ${k === td ? "today" : ""} ${k < td ? "past" : ""}"><div class="dh"><b>${esc(dayName(k))}</b><span>${fmt(k)}</span>${k === td ? `<i>اليوم</i>` : ""}<em>${items.length ? num(items.length) : ""}</em></div>${items.length ? `<div class="its">${items.map(row).join("")}</div>` : `<div class="no">لا شيء مجدول</div>`}</div>`; }).join("");
    const tasks = ev.filter((e) => kOf(e) === "task").sort((a, b) => (a.day < b.day ? -1 : 1));
    host.innerHTML = `<div class="lb-p c8"><h4>جدول الأسبوع <small style="font-weight:500;color:#71859a">${fmt(w.from)} – ${fmt(w.to)}</small></h4><p class="sub">اجتماعات وبرامج ومهام ومواعيد وحجوزات من الأنظمة السبعة في مكان واحد</p>
      <div class="lb-fc" role="tablist">${FK.map(([k, n]) => `<button type="button" data-k="${k}" class="${S.kf === k ? "on" : ""}">${n}<b>${num(cnt(k))}</b></button>`).join("")}</div>
      ${list.length ? `<div class="lb-wgs">${groups}</div>` : `<div class="lb-nomt">${calSvg}<b>لا يوجد ${S.kf === "all" ? "ما يُنفَّذ" : "شيء من هذا النوع"} هذا الأسبوع</b><span>سيظهر هنا فور جدولته في أي نظام.</span></div>`}</div>
      <div class="lb-p c4"><h4>المطلوب إنجازه</h4><p class="sub">${dd && dd.pulse && dd.pulse.overdue ? `<span class="lb-st r">${num(dd.pulse.overdue)} متأخر</span> ` : ""}مهام ومواعيد هذا الأسبوع</p>${tasks.length ? tasks.map((e) => `<div class="lb-it" style="--c:${COL[e.sys]}">${av(e.owner || "", e.sys)}<div class="tx">${lnk(e.link, e.title)}<div class="mt">${chip(e.sys)}<span>${esc(dayName(e.day))} ${fmt(e.day)}</span>${e.owner ? `<span>${esc(e.owner)}</span>` : ""}</div></div></div>`).join("") : em("لا مهام أو مواعيد هذا الأسبوع.")}</div>`;
    host.querySelectorAll(".lb-fc button").forEach((b) => (b.onclick = () => { S.kf = b.dataset.k; weekGuide(host, w, dd); }));
  }

  async function mainView() {
    const wkAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const [d, tk, fd, md, pl, wk, gr, nw] = await Promise.all([rpc("lb_day", { p_day: null }), rpc("lb_ticker").catch(() => []), rpc("lb_feed", { p_from: null, p_to: null, p_sys: null, p_kind: null, p_op: null, p_ach: true, p_limit: 5, p_offset: 0 }).catch(() => ({ items: [] })), rpc("lb_media").catch(() => ({ people: [], badges: [], gallery: [] })), hero(), rpc("lb_week", { p_from: S.wk }), rpc("lb_growth").catch(() => null), rpc("lb_feed", { p_from: wkAgo, p_to: null, p_sys: "plans", p_kind: null, p_op: "new", p_ach: null, p_limit: 6, p_offset: 0 }).catch(() => ({ items: [], total: 0 }))]);
    people = {}; (md.people || []).forEach((p) => (people[p.name] = p));
    const ind = d.indicators || {}, plan = d.plans || {}, co = d.community || {}, q = d.qiyami || {}, at = d.attendance || {}, fa = d.facilities || {}, items = fd.items || [];
    const givers = {}; (q.givers || []).forEach((g) => (givers[g.name] = g));
    const faces = [...(md.people || []).map((p) => faceCard(p, givers[p.name])), ...(q.givers || []).filter((g) => !people[g.name] && g.name !== "مدير النواة الرقمية").map((g) => faceCard({ name: g.name, specialty: "معلم" }, g))];
    const doms = ind.domains || [], totAct = Object.values(pl.by_sys).reduce((a, b) => a + b, 0) || 1;
    const wkIsNow = !S.wk, h = wk.harvest || {};
    const harv = [["لقاءات منفذة", h.meetings_held], ["محاضر موثقة", h.documented], ["برامج منجزة", h.programs_done == null ? null : h.programs_done + " من " + h.programs_planned], ["إنجازات موثقة", h.achievements], ["أوسمة ممنوحة", h.badges], ["تعزيزات", h.reinforcements], ["مؤشرات تغيّرت", h.indicators_changed], ["شواهد مضافة", h.evidence_added]];
    const progs = (wk.events || []).filter((e) => e.kind === "program");
    body.innerHTML = `
      ${tk && tk.length ? `<div class="lb-tick" id="lbTick"><span class="lab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>حديث لبيد</span><div class="vp"><div class="tr">${[0, 1].map(() => tk.map((x) => `<a href="${esc(x.link || "#")}">${esc(x.text)}<em>${esc(x.tag)}</em></a>`).join("")).join("")}</div></div><button class="pb" id="lbPz" type="button" aria-label="إيقاف الحركة أو تشغيلها">II</button></div>` : ""}
      <div class="lb-sec"><h3>اليوم في المدرسة</h3><small>الحضور ونبض الأنظمة</small></div>
      <div class="lb-g">
        <div class="lb-p dk c4" style="background:linear-gradient(160deg,#17414f,#0f2f3b)"><h4>حضور الطلاب اليوم</h4><p class="sub">مجاميع من الفصول المرصودة فقط</p>${at.recorded ? `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${ring(at.present_pct, "الحضور", "حضور", "#f0b34a")}<div style="font-size:.88rem;line-height:2"><div>فصول مرصودة <b>${num(at.sections_recorded)}</b> من ${num(at.sections_total)}</div><div>غياب <b>${num(at.absent)}</b> (بعذر ${num(at.absent_excused)})</div><div>تأخر <b>${num(at.late)}</b></div></div></div>` : `<div class="lb-em" style="border-color:rgba(255,255,255,.25);color:#a9d4d9">لم يُرصد الحضور في هذا اليوم بعد.</div>`}<a class="more" href="/indibati/dashboard.html" style="display:block;margin-top:10px">فتح انضباطي</a></div>
        <div class="lb-p c8"><h4>نبض الأنظمة خلال 14 يوماً</h4><p class="sub">عدد السجلات الجديدة والمعدلة كل يوم</p>${areaChart(pl.days)}</div>
      </div>
      <div class="lb-sec"><h3>${wkIsNow ? "ما سيُنفَّذ هذا الأسبوع" : "جدول أسبوع " + fmt(wk.from)}</h3><span class="lb-fl" style="margin:0"><button id="lbWP" type="button">الأسبوع السابق</button><button id="lbWT" type="button">هذا الأسبوع</button><button id="lbWN" type="button">الأسبوع التالي</button></span></div>
      <div class="lb-g" id="lbGuide"></div>
      <div class="lb-sec"><h3>حصاد الأسبوع</h3><small>${fmt(wk.from)} – ${fmt(wk.to)}</small></div>
      <div class="lb-harv">${harv.map(([a, b]) => `<div class="lb-hv"><b>${typeof b === "string" ? esc(b) : num(b)}</b><span>${a}</span></div>`).join("")}</div>
      <div class="lb-sec"><h3>النمو المهني والخطط</h3><a href="/teachers-community/#/growth">مجتمع لبيد المهني</a></div>
      <div class="lb-g">
        <div class="lb-p c5"><h4>النمو المهني للمعلمين</h4><p class="sub">${gr ? `${num(gr.plans)} خطة نمو من ${num(gr.teachers)} معلماً · هدف ${num(gr.target_hours)} ساعة` : "تعذر تحميل بيانات النمو المهني"}</p>${gr ? `<div class="lb-mini2"><div><b>${num(gr.records_30d)}</b><span>سجل نمو جديد (30 يوماً)</span></div><div><b>${num(gr.approved_hours)}</b><span>ساعة معتمدة</span></div><div><b>${num(gr.pending_review)}</b><span>بانتظار المراجعة</span></div></div>${(gr.latest || []).length ? gr.latest.map((x) => `<div class="lb-it">${av(x.who, "community")}<div class="tx">${lnk(x.link, x.title)}<div class="mt"><span>${esc(x.who)}</span>${x.hours ? `<span>${num(x.hours)} ساعة</span>` : ""}<span>${fmt(x.done_on)}</span></div></div></div>`).join("") : em("لم تُعتمد سجلات نمو مهني بعد. تظهر هنا حين يضيفها المعلمون ويعتمدها المنسق.", ["/teachers-community/#/growth", "فتح النمو المهني"])}` : ""}</div>
        <div class="lb-p c4"><h4>الاحتياجات المهنية</h4><p class="sub">${gr ? `${num(gr.needs_open)} احتياجاً مفتوحاً، مجمعة حسب المجال` : ""}</p>${gr && (gr.needs || []).length ? (() => { const mx = Math.max(...gr.needs.map((n) => n.n)); return gr.needs.map((n, i) => `<div class="lb-row"><span>${esc(n.domain)}</span><b>${num(n.n)}${n.high ? ` · ${n.high} عالٍ` : ""}</b></div><div class="lb-bar"><i style="width:${(n.n / mx) * 100}%;animation-delay:${i * .08}s;background:linear-gradient(90deg,#7a4bb5,#b99ae0)"></i></div>`).join(""); })() : em("لا احتياجات مسجلة.")}</div>
        <div class="lb-p c3"><h4>مبادرات المجتمع</h4><p class="sub">${gr ? `${num(gr.outputs_30d)} مخرجاً ومورداً في 30 يوماً` : ""}</p>${gr && (gr.initiatives || []).length ? gr.initiatives.map((x) => `<div class="lb-it"><div class="tx">${lnk(x.link, x.title)}<div class="mt"><span>${esc(x.owner || "")}</span><span class="lb-st b">${esc(x.status || "")}</span></div></div></div>`).join("") : em("لا مبادرات مسجلة بعد.")}</div>
        <div class="lb-p c6"><h4>جديد الخطط الذكية</h4><p class="sub">برامج أُضيفت خلال 7 أيام · ${num(nw.total)} إضافة</p>${(nw.items || []).length ? nw.items.map((x) => `<div class="lb-it">${av(x.actor || "", "plans")}<div class="tx">${lnk(x.link, String(x.title).replace(/^إضافة برنامج: /, ""))}<div class="mt">${chip("plans")}<span>${dt(x.at)}</span>${x.actor ? `<span>${esc(x.actor)}</span>` : ""}</div></div></div>`).join("") : em("لم تُضف برامج جديدة هذا الأسبوع.")}</div>
        <div class="lb-p c6"><h4>برامج هذا الأسبوع</h4><p class="sub">${(plan.plans || []).map((x) => `${esc(x.name)}: أُنجز ${x.done} من ${x.total}`).join(" · ") || "لا خطط"}</p>${progs.length ? progs.map((e) => `<div class="lb-it"><div class="tx">${lnk(e.link, e.title)}<div class="mt"><span>${esc(dayName(e.day))} ${fmt(e.day)}${e.until && e.until !== e.day ? " – " + fmt(e.until) : ""}</span><span>${esc(e.owner || "")}</span><span class="lb-st">${esc(e.status || "")}</span>${e.beneficiary ? `<span>${esc(e.beneficiary)}</span>` : ""}</div></div></div>`).join("") : em("لا برامج مجدولة هذا الأسبوع.")}<div class="lb-bar" style="margin-top:10px"><i style="width:${Math.max((plan.plans && plan.plans[0] && plan.plans[0].pct) || 0, 2)}%;background:linear-gradient(90deg,#b86d0c,#f0b34a)"></i></div><div style="font-size:.76rem;color:#6a8696;margin-top:4px">آخر تحديث للخطط ${plan.last_update ? dt(plan.last_update) : "—"}</div></div>
      </div>
      <div class="lb-sec"><h3>لقطات من أنشطة المدرسة</h3><small>من الخطط الذكية ومجتمع لبيد المهني</small></div>
      <div class="lb-shots">${(md.gallery || []).length ? `<div class="lb-gal">${md.gallery.map((g) => `<a href="${esc(g.link)}"><img loading="lazy" alt="نشاط مدرسي" src="${esc(pub("sp-evidence", g.path))}"></a>`).join("")}</div>` : `<div class="lb-nomt" style="padding:22px 10px"><span style="color:var(--brand)">${camSvg}</span><b>لا توجد لقطات منشورة بعد</b><span>تظهر هنا صور الأنشطة فور رفعها كشواهد في <a href="/smart-plans/" style="color:var(--brand2);font-weight:700">الخطط الذكية</a> أو <a href="/teachers-community/" style="color:var(--brand2);font-weight:700">مجتمع لبيد المهني</a>.</span></div>`}</div>
      <div class="lb-sec"><h3>مؤشرات المدرسة</h3><a href="${esc(ind.link || "#")}">التقويم الذاتي</a></div>
      <div class="lb-g">
        <div class="lb-p c7"><h4>${ind.cycle ? esc(ind.cycle) : "مؤشرات المدرسة"}</h4><p class="sub">${ind.has_cycle ? `${num(ind.approved)} معتمد من ${num(ind.total)} · تغيّر ${num(ind.changed_7d)} خلال 7 أيام` : "لا توجد دورة تقويم نشطة"}</p>
          ${doms.map((x, i) => `<div class="lb-row"><span>${esc(x.name)}</span><b>${x.approved}/${x.total}${x.with_evidence ? ` · ${x.with_evidence} بشاهد` : ""}</b></div><div class="lb-bar"><i style="width:${Math.max(x.pct || 0, x.evaluated ? 3 : 0)}%;animation-delay:${i * .12}s"></i></div><div style="font-size:.74rem;color:#6a8696;margin-top:2px">آخر تحديث: ${x.last_update ? dt(x.last_update) : "لم يحدث بعد"}</div>`).join("")}
          ${(ind.follow_up || []).length ? `<p class="sub" style="margin-top:12px">يحتاج متابعة: ${ind.follow_up.map((x) => esc(x.code)).join("، ")}</p>` : ""}</div>
        <div class="lb-p c5"><h4>من يصنع الحركة؟</h4><p class="sub">توزيع النشاط على الأنظمة</p>${donut(pl.by_sys)}</div>
      </div>
      <div class="lb-sec"><h3>وجوه تصنع الحركة</h3><small>الصور المنشورة فقط</small></div>
      ${faces.length ? `<div class="lb-faces">${faces.join("")}</div>` : em("لا معلمون منشورون بعد.")}
      <div class="lb-sec"><h3>التميز</h3><a href="${esc(q.link || "#")}">لوحة الشرف</a></div>
      <div class="lb-g">
        <div class="lb-p c4"><h4>منصة الشرف</h4><p class="sub">أعلى ثلاثة في لوحة الشرف</p>${(q.top3 || []).length ? `<div class="lb-pod">${[q.top3[1], q.top3[0], q.top3[2]].map((x, i) => x ? `<div class="p${[2, 1, 3][i]}"><span class="ph" style="--m:${["#9db4bc", "#f0b34a", "#c98a50"][i]};background:${hue(x.name)[0]}">${esc(mono(x.name))}</span><b>${esc(x.name)}</b><div class="st" style="height:${[100, 140, 76][i]}px">${x.rank}</div><small>${num(x.balance)} نقطة</small></div>` : "").join("")}</div>` : em("لا بيانات في لوحة الشرف.")}</div>
        <div class="lb-p c4"><h4>الأوسمة</h4><p class="sub">هذا الأسبوع: ${num(q.week && q.week.badges)} وساماً و${num(q.week && q.week.reinforcements)} تعزيزاً</p>${(md.badges || []).length ? `<div class="lb-badges">${md.badges.map((b) => `<div class="lb-badge"><img loading="lazy" alt="" src="${esc(pub("qm-badges", b.image))}"><b>${esc(b.name)}</b><small>${num(b.awarded_30d)} هذا الشهر</small></div>`).join("")}</div>` : ""}${(q.recent_badges || []).length ? `<div class="lb-feed" style="margin-top:8px">${q.recent_badges.slice(0, 3).map((x) => `<div class="lb-it">${av(x.by, "qiyami")}<div class="tx"><b>${esc(x.badge)}</b> لـ ${esc(x.student)}<div class="mt"><span>${dt(x.at)}</span></div></div></div>`).join("")}</div>` : ""}</div>
        <div class="lb-p c4"><h4>أحدث الإنجازات والتوثيق</h4><p class="sub">كل بند يفتح سجله الأصلي</p><div class="lb-feed">${items.length ? items.map((x) => `<div class="lb-it">${av(x.actor || "", x.sys)}<div class="tx">${lnk(x.link, x.title)}<div class="mt">${chip(x.sys)}<span>${dt(x.at)}</span></div></div></div>`).join("") : em("لا إنجازات موثقة حديثاً.")}</div></div>
      </div>
      <div class="lb-sec"><h3>المجتمع والمرافق</h3></div>
      <div class="lb-g">
        <div class="lb-p c6"><h4>مجتمع لبيد المهني</h4><p class="sub">${num(co.communities_active)} فرق نشطة · ${num(co.held_today)} لقاء منفذ اليوم</p>${(co.latest_minutes || []).concat(co.awaiting_doc || []).length || (co.active_teams || []).length ? `<div class="lb-feed">${(co.active_teams || []).map((x) => `<div class="lb-it"><div class="tx">${lnk(x.link, x.name)}<div class="mt"><span>${num(x.activity)} نشاطاً في 30 يوماً</span></div></div></div>`).join("")}${(co.awaiting_doc || []).map((x) => `<div class="lb-it"><div class="tx">${lnk(x.link, x.title)}<div class="mt"><span class="lb-st y">بانتظار التوثيق</span><span>${esc(x.community)}</span></div></div></div>`).join("")}${(co.latest_minutes || []).map((x) => `<div class="lb-it"><div class="tx">${lnk(x.link, x.title)}<div class="mt"><span class="lb-st g">محضر معتمد</span><span>${esc(x.community)}</span></div></div></div>`).join("")}</div>` : em("لا نشاط مسجل حديثاً.")}</div>
        <div class="lb-p c6"><h4>احجز مرفق</h4><p class="sub">${fa.total_bookable ? `${num(fa.available_now)} متاحة الآن من ${num(fa.total_bookable)}` : "لا مرافق قابلة للحجز"}</p>${fa.total_bookable ? `<div class="lb-fac">${Array.from({ length: fa.total_bookable }, (_, i) => `<i class="${i < (fa.busy_now || 0) ? "busy" : ""}" title="${i < (fa.busy_now || 0) ? "مشغول" : "متاح"}"></i>`).join("")}</div>` : ""}<a class="more" href="/facility-booking/bookings.html">فتح الحجوزات</a></div>
      </div>
      <div class="lb-sec"><h3>مصادر النافذة</h3><small>سبعة أنظمة، وكل نظام يبقى مصدر الحقيقة لبياناته</small></div>
      <div class="lb-srcg">${Object.keys(SYS).map((k) => { const v = d.sources && d.sources[k], age = v ? (Date.now() - new Date(v)) / 864e5 : 99, cls = age < 2 ? "" : age < 7 ? "mid" : "old", n = pl.by_sys[k] || 0; return `<a class="lb-sc ${cls}" style="--c:${COL[k]};text-decoration:none;color:inherit" href="${k === "core" ? "/digital-core/dashboard.html" : k === "saas" ? "/self-evaluation/admin.html" : k === "plans" ? "/smart-plans/" : k === "community" ? "/teachers-community/" : k === "indibati" ? "/indibati/dashboard.html" : k === "qiyami" ? "/qiyami/leaderboard.html" : "/facility-booking/bookings.html"}"><div class="ic">${esc(SYS[k][0])}</div><b>${esc(SYS[k])}</b><small>${num(n)} سجلاً في 14 يوماً</small><div class="lb-bar" style="height:6px;margin-top:8px"><i style="width:${Math.max((n / totAct) * 100, n ? 4 : 0)}%;background:${COL[k]}"></i></div><div class="fr"><i></i>${age < 2 ? "نشط" : age < 7 ? "هادئ" : "ساكن"} · ${REL(v)}</div></a>`; }).join("")}</div>`;
    const pz = body.querySelector("#lbPz"); if (pz) pz.onclick = () => body.querySelector("#lbTick").classList.toggle("pz");
    weekGuide(body.querySelector("#lbGuide"), wk, d);
    const sh = (n) => { const x = new Date(wk.from + "T12:00:00"); x.setDate(x.getDate() + n); S.wk = iso(x); load(); };
    body.querySelector("#lbWP").onclick = () => sh(-7); body.querySelector("#lbWN").onclick = () => sh(7); body.querySelector("#lbWT").onclick = () => { S.wk = null; load(); };
  }

  /* ---------- سجل التحديثات ---------- */
  async function logView() {
    const f = S.feed, LIM = 30;
    const [r] = await Promise.all([rpc("lb_feed", { p_from: f.from ? new Date(f.from + "T00:00:00+03:00").toISOString() : null, p_to: f.to ? new Date(f.to + "T23:59:59+03:00").toISOString() : null, p_sys: f.sys || null, p_kind: f.kind || null, p_op: f.op || null, p_ach: null, p_limit: LIM, p_offset: f.off }), hero(), rpc("lb_media").then((md) => { people = {}; (md.people || []).forEach((p) => (people[p.name] = p)); }).catch(() => {})]);
    const it = r.items || [], tot = Number(r.total || 0);
    const opt = (o, v) => Object.entries(o).map(([k, n]) => `<option value="${k}" ${v === k ? "selected" : ""}>${esc(n)}</option>`).join("");
    body.innerHTML = `<div class="lb-sec"><h3>سجل التحديثات الموحد</h3><small>${num(tot)} سجل</small></div><div class="lb-p">
      <div class="lb-fl"><select id="fS" aria-label="النظام"><option value="">كل الأنظمة</option>${opt(SYS, f.sys)}</select><select id="fK" aria-label="النوع"><option value="">كل الأنواع</option>${opt(KIND, f.kind)}</select><select id="fO" aria-label="العملية"><option value="">جديد ومعدل</option>${opt(OP, f.op)}</select><input type="date" id="fF" value="${esc(f.from)}" aria-label="من تاريخ"><input type="date" id="fT" value="${esc(f.to)}" aria-label="إلى تاريخ"></div>
      ${it.length ? `<div class="tw"><table><thead><tr><th>العملية</th><th>الوصف</th><th>النظام</th><th>المسؤول</th><th>التاريخ والوقت</th></tr></thead><tbody>${it.map((x) => `<tr><td><span class="lb-st ${x.op === "new" ? "g" : "b"}">${esc(OP[x.op] || x.op)}</span><div style="color:#6a8696;font-size:.76rem;margin-top:3px">${esc(KIND[x.kind] || x.kind)}</div></td><td>${lnk(x.link, x.title)}${x.detail ? `<div style="color:#6a8696;font-size:.78rem">${esc(x.detail)}</div>` : ""}</td><td>${chip(x.sys)}</td><td style="white-space:nowrap">${x.actor ? `<span style="display:inline-flex;gap:8px;align-items:center">${av(x.actor, x.sys)}${esc(x.actor)}</span>` : "—"}</td><td>${dt(x.at)}</td></tr>`).join("")}</tbody></table></div>` : em("لا سجلات مطابقة للتصفية.")}
      <div class="lb-fl" style="margin:14px 0 0;justify-content:center"><button id="fP" type="button" ${f.off === 0 ? "disabled" : ""}>السابق</button><span style="align-self:center;color:#6a8696;font-size:.84rem">${tot ? f.off + 1 : 0} – ${Math.min(f.off + LIM, tot)} من ${num(tot)}</span><button id="fN" type="button" ${f.off + LIM >= tot ? "disabled" : ""}>التالي</button></div></div>`;
    const bind = (id, k) => (body.querySelector(id).onchange = (e) => { f[k] = e.target.value; f.off = 0; load(); });
    bind("#fS", "sys"); bind("#fK", "kind"); bind("#fO", "op"); bind("#fF", "from"); bind("#fT", "to");
    body.querySelector("#fP").onclick = () => { f.off = Math.max(0, f.off - LIM); load(); }; body.querySelector("#fN").onclick = () => { f.off += LIM; load(); };
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const t = e.target; t.style.transitionDelay = (t.dataset.rd || 0) + "ms"; t.classList.add("in-v"); io.unobserve(t); } }), { threshold: 0.06 }) : null;
  let quiet = false;
  const reveal = () => { const root = m.querySelector(".lb"); if (!io) return; root.classList.add("js"); let i = 0; m.querySelectorAll(".lb-p,.lb-sc,.lb-hv,.lb-face,.lb-sec,.lb-shots,.lb-tick,.lb-wd").forEach((el) => { if (el.classList.contains("in-v")) return; if (quiet) { el.classList.add("in-v"); return; } el.dataset.rd = Math.min((i++ % 6) * 70, 350); io.observe(el); }); };
  async function load(silent) {
    if (!silent) skel();
    try { await ({ week: mainView, log: logView })[S.view](); ok = true; last = new Date(); quiet = !!silent; reveal(); }
    catch (e) { ok = false; if (!silent || body.querySelector(".lb-sk")) body.innerHTML = em(e && e.code === "42501" ? "هذه النافذة متاحة لمنسوبي المدرسة المفعّلة حساباتهم." : "تعذر تحميل البيانات حالياً. اضغط «تحديث» للمحاولة مرة أخرى."); }
    setStatus();
  }
  m.querySelectorAll(".lb-tabs [data-v]").forEach((b) => (b.onclick = () => { S.view = b.dataset.v; m.querySelectorAll(".lb-tabs [data-v]").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
  m.querySelector("#lbR").onclick = () => load();
  setInterval(() => { if (!document.hidden && S.view === "week") load(true); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.view === "week") load(true); });
  await load();
}
