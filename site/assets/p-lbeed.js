/* «يحدث في لبيد» – نافذة قراءة فقط. تستدعي دوال التجميع lb_* فقط ولا تكتب في أي جدول. */
async function lbeedPage(m) {
  const SYS = { core: "النواة الرقمية", saas: "التقويم المدرسي الذكي", plans: "الخطط الذكية", community: "مجتمع لبيد المهني", indibati: "انضباطي", qiyami: "قيمي", booking: "احجز مرفق" };
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
      <div class="dt"><b id="lbH"></b><span id="lbG"></span><span class="clk" id="lbClk"></span><span class="live" id="lbLive"><i></i><span id="lbLiveT">جارٍ التحميل</span></span><span id="lbU"></span></div></div></div></section>
    <nav class="lb-tabs" aria-label="عروض النافذة"><div class="in"><button data-v="ov" class="on" type="button">نظرة عامة</button><button data-v="log" type="button">سجل التحديثات</button><span class="sp"></span><button class="rf" id="lbR" type="button">${ico("refresh")} تحديث</button></div></nav>
    <div class="lb-main"><div id="lbBody"></div>
    <p style="color:#6a8696;font-size:.82rem;margin:30px 0 6px">نافذة قراءة فقط تجمع ما تسجله أنظمة المدرسة السبعة من مصادرها الأصلية دون نسخ أو تعديل، وتحترم صلاحيات كل نظام. لا تُعرض فيها حالات فردية للطلاب، وتظهر الصور المنشورة فقط.</p></div></div>`;
  const body = m.querySelector("#lbBody");
  const nd = nowRy();
  m.querySelector("#lbH").textContent = hijri(nd);
  m.querySelector("#lbG").textContent = greg(nd) + " م";
  const clk = () => { const e = m.querySelector("#lbClk"); if (e) e.textContent = new Date().toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Riyadh" }); }; clk(); setInterval(clk, 1000);
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

  /* ----- التقويم الأسبوعي ----- */
  function calendar(host, w) {
    const td = iso(nowRy()), days = Array.from({ length: 7 }, (_, i) => addDays(w.from, i));
    const raw = w.events || [], ev = [];
    raw.forEach((e) => { ev.push(e); if (e.kind === "program" && e.until && e.until > e.day) days.forEach((k) => { if (k > e.day && k <= e.until) ev.push({ ...e, day: k, cont: true }); }); });
    const list = ev.filter((e) => S.kf === "all" || kOf(e) === S.kf);
    const cnt = (k) => ev.filter((e) => !e.cont && (k === "all" || kOf(e) === k)).length;
    const timeOf = (e) => (e.starts_at ? tm(e.starts_at) : e.from ? tm2(e.from) : "");
    const card = (e, i) => { const t = timeOf(e), timed = e.kind === "meeting" || e.kind === "booking"; return `<button type="button" class="cv ${timed ? "tm" : "ad"} ${e.cont ? "cont" : ""} ${esc(e.state || "")}" data-i="${i}" style="--c:${COL[e.sys]}"><span class="ty">${TYPE[e.kind] || e.kind}${e.cont ? " · يستمر" : ""}</span><b>${esc(e.title)}</b>${t ? `<span class="t">${esc(t)}${e.to ? " – " + tm2(e.to) : ""}</span>` : ""}${e.place ? `<span class="m">${esc(e.place)}</span>` : ""}${e.owner ? `<span class="m">${esc(e.owner)}</span>` : ""}</button>`; };
    const col = (k) => { const items = list.map((e, i) => [e, i]).filter(([e]) => e.day === k); const tmd = items.filter(([e]) => e.kind === "meeting" || e.kind === "booking").sort((a, b) => timeOf(a[0]).localeCompare(timeOf(b[0]))), ad = items.filter(([e]) => !(e.kind === "meeting" || e.kind === "booking")); const dd = new Date(k + "T12:00:00"); const wk = dd.getDay() >= 5; return `<div class="cc ${k === td ? "today" : ""} ${wk ? "wknd" : ""} ${k < td ? "past" : ""}"><div class="ch"><span>${esc(dayName(k))}</span><b>${num(dd.getDate())}</b>${k === td ? "<i>اليوم</i>" : ""}${items.length ? `<em>${num(items.length)}</em>` : ""}</div>${ad.length ? `<div class="ad-l">${ad.map(([e, i]) => card(e, i)).join("")}</div>` : ""}${tmd.map(([e, i]) => card(e, i)).join("")}${items.length ? "" : `<div class="no">${wk ? "عطلة" : "لا شيء مجدول"}</div>`}</div>`; };
    host.innerHTML = `<div class="lb-calh"><div><h3>${S.wk ? "جدول الأسبوع" : "ما لدينا هذا الأسبوع"}</h3><p>${fmt(w.from)} – ${fmt(w.to)} · ${num(ev.filter((e) => !e.cont).length)} حدثاً</p></div>
      <span class="nv"><button id="cP" type="button" aria-label="الأسبوع السابق">›</button><button id="cT" type="button">هذا الأسبوع</button><button id="cN" type="button" aria-label="الأسبوع التالي">‹</button></span></div>
      <div class="lb-fc" role="group" aria-label="تصفية الأحداث">${FK.map(([k, n]) => `<button type="button" data-k="${k}" class="${S.kf === k ? "on" : ""}">${n}<b>${num(cnt(k))}</b></button>`).join("")}</div>
      ${list.length ? `<div class="lb-cgrid">${days.map(col).join("")}</div>` : `<div class="lb-nomt">${calSvg}<b>لا يوجد ${S.kf === "all" ? "ما يُنفَّذ" : "شيء من هذا النوع"} في هذا الأسبوع</b><span>سيظهر هنا فور جدولته في أي نظام.</span></div>`}`;
    host.querySelectorAll(".lb-fc button").forEach((b) => (b.onclick = () => { S.kf = b.dataset.k; calendar(host, w); reveal(); }));
    const sh = (n) => { S.wk = n === 0 ? null : addDays(w.from, n); load(); };
    host.querySelector("#cP").onclick = () => sh(-7); host.querySelector("#cN").onclick = () => sh(7); host.querySelector("#cT").onclick = () => sh(0);
    host.querySelectorAll(".cv").forEach((b) => (b.onclick = () => detail(list[+b.dataset.i])));
  }
  function detail(e) {
    let dlg = m.querySelector("#lbDlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "lbDlg"; dlg.className = "lb-dlg"; m.querySelector(".lb").appendChild(dlg); dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); }); }
    const when = e.starts_at ? `${fmt(e.day)} · ${tm(e.starts_at)}` : e.from ? `${fmt(e.day)} · ${tm2(e.from)} – ${tm2(e.to)}` : e.until && e.until !== e.day ? `من ${fmt(e.day)} إلى ${fmt(e.until)}` : fmt(e.day);
    const rows = [["الموعد", `${dayName(e.day)} ${when}`], ["النظام", SYS[e.sys]], ["الفريق أو الجهة", e.team], ["المكان", e.place], ["المسؤول", e.owner], ["الفئة المستفيدة", e.beneficiary], ["الحالة", e.kind === "meeting" ? (ST[e.state] || [""])[0] : e.kind === "booking" ? (e.state === "pending" ? "بانتظار الاعتماد" : "معتمد") : e.status], ["التوثيق", e.kind === "meeting" && e.doc ? (DOC[e.doc] || [""])[0] : null]].filter((r) => r[1]);
    dlg.innerHTML = `<div class="hd" style="--c:${COL[e.sys]}"><span class="ty">${TYPE[e.kind] || e.kind}</span><h3>${esc(e.title)}</h3></div><dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl><div class="ft"><a class="go" href="${esc(e.link || "#")}">فتح في ${esc(SYS[e.sys])}</a><button type="button" id="dX">إغلاق</button></div>`;
    dlg.querySelector("#dX").onclick = () => dlg.close(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ----- حجوزات اليوم: خط زمني لكل مرفق ----- */
  function bookingsTL(fa) {
    const bk = fa.bookings || [], toM = (s) => { const [h, mi] = String(s).split(":"); return +h * 60 + +mi; };
    if (!bk.length) return `<div class="lb-nomt" style="padding:26px 10px"><span style="color:var(--brand)">${calSvg}</span><b>لا حجوزات اليوم</b><span>${fa.total_bookable ? `جميع المرافق (${num(fa.total_bookable)}) متاحة للحجز.` : ""} <a href="/facility-booking/bookings.html" style="color:var(--brand2);font-weight:700">احجز مرفقاً</a></span></div>`;
    let a = Math.min(...bk.map((x) => toM(x.start))), b = Math.max(...bk.map((x) => toM(x.end)));
    a = Math.min(Math.floor((a - 30) / 60) * 60, 7 * 60); b = Math.max(Math.ceil((b + 30) / 60) * 60, 14 * 60); const span = b - a, hrs = []; for (let h = a; h <= b; h += 60) hrs.push(h);
    const rows = {}; bk.forEach((x) => (rows[x.facility] = rows[x.facility] || []).push(x));
    const nowM = (() => { const n = nowRy(); return n.getHours() * 60 + n.getMinutes(); })(), pos = (mn) => ((mn - a) / span) * 100;
    return `<div class="lb-tl"><div class="ax">${hrs.map((h) => `<span style="inset-inline-start:${pos(h)}%">${String(Math.floor(h / 60)).padStart(2, "0")}:00</span>`).join("")}</div>
      ${Object.entries(rows).map(([f, xs]) => `<div class="rw"><div class="nm">${esc(f)}</div><div class="tr2">${hrs.map((h) => `<i class="gl" style="inset-inline-start:${pos(h)}%"></i>`).join("")}${xs.map((x) => `<a class="bl ${esc(x.state)} ${x.status === "pending" ? "pend" : ""}" href="${esc(x.link)}" style="inset-inline-start:${pos(toM(x.start))}%;width:${((toM(x.end) - toM(x.start)) / span) * 100}%" title="${esc(f)} · ${tm2(x.start)} – ${tm2(x.end)} · ${esc(x.beneficiary || "")}"><b>${esc(x.beneficiary || "حجز")}</b><span>${tm2(x.start)}–${tm2(x.end)}</span></a>`).join("")}${nowM > a && nowM < b ? `<i class="nw" style="inset-inline-start:${pos(nowM)}%"></i>` : ""}</div></div>`).join("")}</div>
      <div class="lb-leg" style="margin-top:10px"><span><i style="background:#0f8a94"></i>قادم</span><span><i style="background:#24895a"></i>جارٍ الآن</span><span><i style="background:#9db4bc"></i>انتهى</span><span><i style="background:#f0b34a"></i>بانتظار الاعتماد</span></div>`;
  }

  /* ----- توثيقات الخطط (شريط الصور) ----- */
  let DOCS = [];
  function docsStrip(items) {
    DOCS = items;
    if (!items.length) return `<section class="lb-p lb-docs"><div class="dh"><h4>آخر التوثيقات</h4><span>من الخطط الذكية</span></div>${em("لا توثيقات بصور بعد. تظهر هنا فور توثيق أي برنامج.", ["/smart-plans/", "فتح الخطط الذكية"])}</section>`;
    const one = (x, i) => `<button type="button" class="dc" data-i="${i}"><span class="im"><img loading="lazy" alt="" src="${esc(pub("sp-evidence", x.images[0]))}">${x.images.length > 1 ? `<i>${num(x.images.length)} صور</i>` : ""}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x.executor || "—")}${x.date ? " · " + esc(fmt(x.date)) : ""}</small></span></button>`;
    const set = items.map(one).join("");
    return `<section class="lb-p lb-docs" aria-label="آخر التوثيقات"><div class="dh"><h4>آخر التوثيقات</h4><span>من الخطط الذكية · اضغط للخبر كاملاً</span></div><div class="vp"><div class="tr" style="animation-duration:${Math.max(30, items.length * 7)}s">${set}${items.length > 3 ? set : ""}</div></div></section>`;
  }
  function docDlg(x) {
    let dlg = m.querySelector("#lbDlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "lbDlg"; dlg.className = "lb-dlg"; m.querySelector(".lb").appendChild(dlg); dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); }); }
    const rows = [["المنفذ", x.executor], ["تاريخ التنفيذ", x.date ? fmt(x.date) : ""], ["المكان", x.location], ["المشاركون", x.participants], ["عدد المستفيدين", x.beneficiaries]].filter((r) => r[1]);
    dlg.innerHTML = `<div class="hd" style="--c:#b86d0c"><span class="ty">توثيق · الخطط الذكية</span><h3>${esc(x.title)}</h3></div><div class="dg">${x.images.map((p) => `<a href="${esc(pub("sp-evidence", p))}" target="_blank" rel="noopener"><img alt="" src="${esc(pub("sp-evidence", p))}"></a>`).join("")}</div>
      <dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}${x.description ? `<div><dt>الوصف</dt><dd>${esc(x.description)}</dd></div>` : ""}${x.outputs ? `<div><dt>المخرجات</dt><dd>${esc(x.outputs)}</dd></div>` : ""}</dl><div class="ft"><a class="go" href="${esc(x.link || "/smart-plans/")}">فتح في الخطط الذكية</a><button type="button" id="dX">إغلاق</button></div>`;
    dlg.querySelector("#dX").onclick = () => dlg.close(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ----- التقويم + لقاءات اليوم ----- */
  const CAL = { mon: null, sel: null }; const wkCache = {};
  const ws0 = (s) => addDays(s, -new Date(s + "T12:00:00").getDay());
  const GROUPS = [["meeting", "الاجتماعات واللقاءات"], ["program", "البرامج والأنشطة"], ["booking", "حجوزات المرافق"], ["task", "المهام والمواعيد"], ["calendar", "التقويم المدرسي"]];
  async function calWidget(host) {
    const td = iso(nowRy()); if (!CAL.sel) CAL.sel = td; if (!CAL.mon) CAL.mon = CAL.sel.slice(0, 8) + "01";
    const [mo, wk] = await Promise.all([rpc("lb_month", { p_month: CAL.mon }), (async () => { const k = ws0(CAL.sel); return rpc("lb_week", { p_from: k }); })()]);
    const dots = {}; (mo.events || []).forEach((e) => ((dots[e.day] = dots[e.day] || new Set()).add(e.sys)));
    const first = new Date(CAL.mon + "T12:00:00"), pad = first.getDay(), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = []; for (let i = 0; i < pad; i++) cells.push(`<span></span>`);
    for (let d = 1; d <= dim; d++) { const k = CAL.mon.slice(0, 8) + String(d).padStart(2, "0"), ds = [...(dots[k] || [])].slice(0, 3); cells.push(`<button type="button" data-d="${k}" class="${k === td ? "today" : ""} ${k === CAL.sel ? "sel" : ""}">${num(d)}${ds.length ? `<i>${ds.map((x) => `<b style="--c:${COL[x]}"></b>`).join("")}</i>` : ""}</button>`); }
    const wd = ["ح", "ن", "ث", "ر", "خ", "ج", "س"], title = first.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    const ev = (wk.events || []).filter((e) => e.day === CAL.sel || (e.kind === "program" && e.until && e.day <= CAL.sel && CAL.sel <= e.until)), timeOf = (e) => (e.starts_at ? tm(e.starts_at) : e.from ? tm2(e.from) : "");
    const kk = (e) => (e.kind === "deadline" ? "task" : e.kind);
    const grp = GROUPS.map(([k, n]) => [n, ev.filter((e) => kk(e) === k).sort((a, b) => (timeOf(a) || "99").localeCompare(timeOf(b) || "99"))]).filter(([, l]) => l.length);
    host.innerHTML = `<div class="lb-cal"><div class="lb-p"><div class="lb-mh"><button type="button" id="mP" aria-label="الشهر السابق">›</button><b>${esc(title)}</b><button type="button" id="mN" aria-label="الشهر التالي">‹</button></div><div class="lb-mg">${wd.map((x) => `<span class="w">${x}</span>`).join("")}${cells.join("")}</div></div>
      <div class="lb-p lb-ag"><h4><span>${CAL.sel === td ? "اليوم" : esc(dayName(CAL.sel))} · ${esc(fmt(CAL.sel))}</span><small>${num(ev.length)} حدثاً</small></h4>${grp.length ? grp.map(([n, l]) => `<div class="gh">${esc(n)}</div>${l.map((e) => `<button type="button" class="lb-agi ${esc(e.state || "")}" data-k="${ev.indexOf(e)}" style="--c:${COL[e.sys]}"><span class="tm">${esc(timeOf(e) || "طوال اليوم")}</span><span><b>${esc(e.title)}</b></span>${e.kind === "meeting" ? stB(e.state) : ""}<span class="mt">${chip(e.sys)}${e.place ? `<span>${esc(e.place)}</span>` : ""}${e.owner ? `<span>${esc(e.owner)}</span>` : ""}</span></button>`).join("")}`).join("") : `<div class="lb-nomt">${calSvg}<b>لا لقاءات أو فعاليات في هذا اليوم</b></div>`}</div></div>`;
    const sh = (n) => { const d = new Date(CAL.mon + "T12:00:00"); d.setMonth(d.getMonth() + n); CAL.mon = iso(d); calWidget(host); };
    host.querySelector("#mP").onclick = () => sh(-1); host.querySelector("#mN").onclick = () => sh(1);
    host.querySelectorAll(".lb-mg [data-d]").forEach((b) => (b.onclick = () => { CAL.sel = b.dataset.d; calWidget(host); }));
    host.querySelectorAll(".lb-agi").forEach((b) => (b.onclick = () => detail(ev[+b.dataset.k])));
  }

  /* ----- نجوم قيمي: أفضل 10 بشريط متحرك ----- */
  function topStrip(top, link) {
    if (!top.length) return `<section class="lb-p"><h4>نجوم لبيد · قيمي</h4>${em("لا بيانات في لوحة الشرف.")}</section>`;
    const one = (x) => `<a class="tp r${x.rank <= 3 ? x.rank : 0}" href="${esc(link)}" style="--h:${hue(x.name)[0]};--h2:${hue(x.name)[1]}"><span class="rk">${num(x.rank)}</span><span class="ph">${esc(mono(x.name))}</span><b>${esc(x.name)}</b><small>${esc(x.grade || "")} · ${esc(x.section || "")}</small><em>${num(x.balance)} نقطة</em></a>`;
    const set = top.map(one).join("");
    return `<section class="lb-p lb-top" aria-label="أفضل 10 طلاب"><div class="dh"><h4>نجوم لبيد · قيمي</h4><span>أفضل ${num(top.length)} طلاب في لوحة الشرف</span></div><div class="vp"><div class="tr" style="animation-duration:${Math.max(30, top.length * 6)}s">${set}${set}</div></div></section>`;
  }

  async function overview() {
    const [d, pl, docs, top, hn] = await Promise.all([rpc("lb_day", { p_day: null }), hero(), rpc("lb_docs", { p_limit: 12 }).catch(() => []), rpc("lb_top", { p_n: 10 }).catch(() => []), rpc("lb_honor").catch(() => ({ link: "#" }))]);
    const ind = d.indicators || {}, at = d.attendance || {}, fa = d.facilities || {}, doms = ind.domains || [], totAct = Object.values(pl.by_sys).reduce((a, b) => a + b, 0) || 1;
    const pct = (v) => (v == null ? "—" : num(v) + "%");
    body.innerHTML = `${docsStrip(docs || [])}
      <section id="lbCal" aria-label="التقويم واللقاءات"></section>
      <section class="lb-p dk lb-dis" style="margin-top:16px"><div class="dh"><h4>بطاقة الانضباط اليوم</h4><a class="more" href="/indibati/dashboard.html">فتح انضباطي</a></div>${at.recorded ? `<div class="ds"><div class="rg">${ring(at.present_pct, "الحضور", "حضور", "#f0b34a")}</div><div class="ks"><div><b>${num(at.present)}</b><span>الطلاب الحضور</span></div><div><b>${pct(at.present_pct)}</b><span>نسبة الحضور</span></div><div><b>${pct(at.absent_pct)}</b><span>نسبة الغياب</span></div><div><b>${num(at.absent)}</b><span>الغائبون (بعذر ${num(at.absent_excused)})</span></div><div><b>${num(at.late)}</b><span>المتأخرون</span></div><div><b>${num(at.sections_recorded)}/${num(at.sections_total)}</b><span>فصول مرصودة</span></div></div></div>` : `<div class="lb-em" style="border-color:rgba(255,255,255,.25);color:#a9d4d9">لم يُرصد الحضور اليوم بعد.</div>`}</section>
      <div style="margin-top:16px">${topStrip(top || [], hn.link || "/qiyami/leaderboard.html")}</div>
      <section class="lb-p" style="margin-top:16px"><h4>حجوزات اليوم</h4><p class="sub">${fa.total_bookable ? `${num(fa.available_now)} مرافق متاحة الآن من ${num(fa.total_bookable)}` : "لا مرافق قابلة للحجز"}</p>${bookingsTL(fa)}<a class="more" href="/facility-booking/bookings.html">فتح الحجوزات</a></section>
      <section class="lb-p" style="margin-top:16px"><h4>مؤشرات المدرسة ${ind.cycle ? "· " + esc(ind.cycle) : ""}</h4><p class="sub">${ind.has_cycle ? `اكتمال المجالات: ${num(ind.approved)} معتمد من ${num(ind.total)} مؤشراً` : "لا توجد دورة تقويم نشطة"}</p><div class="lb-doms">${doms.map((x, i) => `<div><div class="lb-row"><span>${esc(x.name)}</span><b>${x.approved}/${x.total}${x.total ? " · " + num(Math.round((100 * x.approved) / x.total)) + "%" : ""}</b></div><div class="lb-bar"><i style="width:${x.total ? Math.max((100 * x.approved) / x.total, x.evaluated ? 3 : 0) : 0}%;animation-delay:${i * .12}s"></i></div></div>`).join("")}</div></section>
      <div class="lb-sec"><h3>حالة الأنظمة</h3><small>سبعة أنظمة، وكل نظام يبقى مصدر الحقيقة لبياناته</small></div>
      <div class="lb-srcg">${Object.keys(SYS).map((k) => { const v = d.sources && d.sources[k], age = v ? (Date.now() - new Date(v)) / 864e5 : 99, cls = age < 2 ? "" : age < 7 ? "mid" : "old", n = pl.by_sys[k] || 0; return `<a class="lb-sc ${cls}" style="--c:${COL[k]};text-decoration:none;color:inherit" href="${k === "core" ? "/digital-core/dashboard.html" : k === "saas" ? "/self-evaluation/admin.html" : k === "plans" ? "/smart-plans/" : k === "community" ? "/teachers-community/" : k === "indibati" ? "/indibati/dashboard.html" : k === "qiyami" ? "/qiyami/leaderboard.html" : "/facility-booking/bookings.html"}"><div class="ic">${esc(SYS[k][0])}</div><b>${esc(SYS[k])}</b><small>${num(n)} سجلاً في 14 يوماً</small><div class="lb-bar" style="height:6px;margin-top:8px"><i style="width:${Math.max((n / totAct) * 100, n ? 4 : 0)}%;background:${COL[k]}"></i></div><div class="fr"><i></i>${age < 2 ? "نشط" : age < 7 ? "هادئ" : "ساكن"} · ${REL(v)}</div></a>`; }).join("")}</div>`;
    body.querySelectorAll(".lb-docs .dc").forEach((b) => (b.onclick = () => docDlg(DOCS[+b.dataset.i])));
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
    try { await ({ ov: overview, log: logView })[S.view](); ok = true; last = new Date(); quiet = !!silent; reveal(); }
    catch (e) { ok = false; if (!silent || body.querySelector(".lb-sk")) body.innerHTML = em(e && e.code === "42501" ? "هذه النافذة متاحة لمنسوبي المدرسة المفعّلة حساباتهم." : "تعذر تحميل البيانات حالياً. اضغط «تحديث» للمحاولة مرة أخرى."); }
    setStatus();
  }
  m.querySelectorAll(".lb-tabs [data-v]").forEach((b) => (b.onclick = () => { S.view = b.dataset.v; m.querySelectorAll(".lb-tabs [data-v]").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
  m.querySelector("#lbR").onclick = () => load();
  setInterval(() => { if (!document.hidden && S.view === "ov") load(true); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.view === "ov") load(true); });
  await load();
}
