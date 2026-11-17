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
    <section class="lb-hero" aria-label="نبض لبيد"><div class="in"><div class="row"><div class="ttl"><h2>يحدث في لبيد</h2><p class="tag">لبيد تتحرك، وإنجازاتها تُرى</p></div>
      <div class="lb-beat" id="lbBeat" aria-hidden="true"></div>
      <div class="dtm"><b id="lbH"></b><span id="lbG"></span><span class="clk" id="lbClk"></span><span class="live" id="lbLive"><i></i><span id="lbLiveT">جارٍ التحميل</span></span><span id="lbU"></span></div></div></div></section>
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

  /* ----- أيقونات ----- */
  const I = { meeting: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5M16 5.2a3.2 3.2 0 010 5.6M18 14.6c1.6.6 2.7 2.1 3 4.4"/>', program: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', booking: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 9h2a2 2 0 012 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>', task: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>', shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>', chev: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M7 17L17 7M9 7h8v8"/>' };
  const ic = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k] || I.calendar}</svg>`;
  const KI = { meeting: "meeting", program: "program", booking: "booking", task: "task", deadline: "task", calendar: "calendar" };

  /* ----- توثيقات الخطط (شريط الصور) ----- */
  let DOCS = [];
  function docsStrip(items) {
    DOCS = items;
    const head = `<div class="dh"><div><h4>آخر التوثيقات</h4><p>ما نُفِّذ ووُثِّق في الخطط الذكية، اضغط على أي بطاقة لقراءة الخبر كاملاً</p></div><a href="/smart-plans/">كل التوثيقات</a></div>`;
    if (!items.length) return `<section class="lb-p lb-docs">${head}${em("لا توجد توثيقات بصور بعد. تظهر هنا فور توثيق أي برنامج.", ["/smart-plans/", "فتح الخطط الذكية"])}</section>`;
    const one = (x, i) => `<button type="button" class="dc" data-i="${i}"><span class="im"><img loading="lazy" alt="" src="${esc(pub("sp-evidence", x.images[0]))}">${x.images.length > 1 ? `<i>${num(x.images.length)} صور</i>` : ""}<span class="dov"><b>${esc(x.title)}</b></span></span><span class="by"><span class="lb-av" style="--c:${hue(x.executor || "؟")[0]}">${esc(mono(x.executor))}</span><span><b>${esc(x.executor || "—")}</b><small>${x.date ? esc(fmt(x.date)) : esc(dt(x.at))}</small></span></span></button>`;
    const set = items.map(one).join("");
    return `<section class="lb-p lb-docs" aria-label="آخر التوثيقات">${head}<div class="vp"><div class="tr" style="animation-duration:${Math.max(36, items.length * 8)}s">${set}${items.length > 3 ? set : ""}</div></div></section>`;
  }
  function docDlg(x) {
    let dlg = m.querySelector("#lbDlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "lbDlg"; dlg.className = "lb-dlg"; m.querySelector(".lb").appendChild(dlg); dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); }); }
    const rows = [["المنفذ", x.executor], ["تاريخ التنفيذ", x.date ? fmt(x.date) : ""], ["المكان", x.location], ["المشاركون", x.participants], ["عدد المستفيدين", x.beneficiaries]].filter((r) => r[1]);
    dlg.innerHTML = `<div class="hd" style="--c:#b86d0c"><span class="ty">توثيق · الخطط الذكية</span><h3>${esc(x.title)}</h3></div><div class="dg">${x.images.map((p) => `<a href="${esc(pub("sp-evidence", p))}" target="_blank" rel="noopener"><img alt="" src="${esc(pub("sp-evidence", p))}"></a>`).join("")}</div>
      <dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}${x.description ? `<div><dt>الوصف</dt><dd>${esc(x.description)}</dd></div>` : ""}${x.outputs ? `<div><dt>المخرجات</dt><dd>${esc(x.outputs)}</dd></div>` : ""}</dl><div class="ft"><a class="go" href="${esc(x.link || "/smart-plans/")}">فتح في الخطط الذكية</a><button type="button" id="dX">إغلاق</button></div>`;
    dlg.querySelector("#dX").onclick = () => dlg.close(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }

  /* ----- التقويم التفاعلي + خط اليوم الزمني ----- */
  const CAL = { mon: null, sel: null, kf: "all", open: null }; let MC = {}, WC = {};
  const ws0 = (s) => addDays(s, -new Date(s + "T12:00:00").getDay());
  const KF = [["all", "الكل"], ["meeting", "اجتماعات ولقاءات"], ["program", "برامج"], ["booking", "حجوزات"], ["task", "مهام ومواعيد"], ["calendar", "تقويم المدرسة"]];
  const kk = (e) => (e.kind === "deadline" ? "task" : e.kind);
  const minsOf = (e) => { if (e.starts_at) { const d = new Date(new Date(e.starts_at).toLocaleString("en-US", { timeZone: "Asia/Riyadh" })); return d.getHours() * 60 + d.getMinutes(); } if (e.from) { const [h, mi] = String(e.from).split(":"); return +h * 60 + +mi; } return null; };
  const dayEv = (k) => { const w = WC[ws0(k)]; return w ? (w.events || []).filter((e) => e.day === k || (e.kind === "program" && e.until && e.day <= k && k <= e.until)) : []; };
  async function ensure() { const wk = ws0(CAL.sel); await Promise.all([MC[CAL.mon] ? 0 : rpc("lb_month", { p_month: CAL.mon }).then((r) => (MC[CAL.mon] = r)), WC[wk] ? 0 : rpc("lb_week", { p_from: wk }).then((r) => (WC[wk] = r))]); }
  function evRows(e) { const when = e.starts_at ? `${fmt(e.day)} · ${tm(e.starts_at)}` : e.from ? `${fmt(e.day)} · ${tm2(e.from)} – ${tm2(e.to)}` : e.until && e.until !== e.day ? `من ${fmt(e.day)} إلى ${fmt(e.until)}` : fmt(e.day);
    return [["الموعد", `${dayName(e.day)} ${when}`], ["النظام", SYS[e.sys]], ["الفريق أو الجهة", e.team], ["المكان", e.place || e.location], ["المسؤول", e.owner], ["الفئة المستفيدة", e.beneficiary], ["التوثيق", e.kind === "meeting" && e.doc ? (DOC[e.doc] || [""])[0] : null]].filter((r) => r[1]); }
  const wkd = (k) => { const w = new Date(k + "T12:00:00").getDay(); return w === 5 ? addDays(k, 2) : w === 6 ? addDays(k, 1) : k; };
  function setSel(host, k) { k = wkd(k); CAL.sel = k; CAL.open = null; if (k.slice(0, 7) !== CAL.mon.slice(0, 7)) CAL.mon = k.slice(0, 8) + "01"; paint(host, true); }
  async function paint(host, anim) {
    host.classList.add("ld"); try { await ensure(); } catch (e) { host.classList.remove("ld"); return; } host.classList.remove("ld");
    const td = iso(nowRy()), all = dayEv(CAL.sel), cnt = {}; all.forEach((e) => (cnt[kk(e)] = (cnt[kk(e)] || 0) + 1));
    if (CAL.kf !== "all" && !cnt[CAL.kf]) CAL.kf = "all";
    const ev = all.filter((e) => CAL.kf === "all" || kk(e) === CAL.kf).sort((a, b) => (minsOf(a) ?? -1) - (minsOf(b) ?? -1));
    const dots = {}; ((MC[CAL.mon] || {}).events || []).forEach((e) => { const o = (dots[e.day] = dots[e.day] || { n: 0, s: new Set() }); o.n++; o.s.add(e.sys); });
    const first = new Date(CAL.mon + "T12:00:00"), pad = first.getDay(), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = []; for (let i = 0; i < (pad >= 5 ? 0 : pad); i++) cells.push(`<span></span>`);
    for (let d = 1; d <= dim; d++) { if (new Date(CAL.mon.slice(0, 8) + String(d).padStart(2, "0") + "T12:00:00").getDay() >= 5) continue; const k = CAL.mon.slice(0, 8) + String(d).padStart(2, "0"), o = dots[k], dw = new Date(k + "T12:00:00").getDay(); cells.push(`<button type="button" data-d="${k}" style="--h:${o ? Math.min(o.n, 6) / 6 : 0}" class="${k === td ? "today" : ""} ${k === CAL.sel ? "sel" : ""} ${dw >= 5 ? "we" : ""}" aria-label="${esc(dayName(k))} ${d}${o ? "، " + o.n + " أحداث" : ""}" ${k === CAL.sel ? 'aria-current="date"' : ""}><b>${num(d)}</b>${o ? `<i>${[...o.s].slice(0, 3).map((x) => `<u style="--c:${COL[x]}"></u>`).join("")}</i>` : ""}</button>`); }
    const wd = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"], title = first.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    const wk0 = ws0(CAL.sel), strip = Array.from({ length: 5 }, (_, i) => addDays(wk0, i)).map((k) => { const n = dayEv(k).length; return `<button type="button" data-d="${k}" class="${k === CAL.sel ? "sel" : ""} ${k === td ? "today" : ""}"><span>${wd[new Date(k + "T12:00:00").getDay()]}</span><b>${num(new Date(k + "T12:00:00").getDate())}</b><i>${n ? num(n) : ""}</i></button>`; }).join("");
    const nowM = (() => { const n = nowRy(); return n.getHours() * 60 + n.getMinutes(); })(); let nowDone = CAL.sel !== td;
    const line = (e, i) => { const st = minsOf(e), mm = st == null ? "" : tm2(`${String(Math.floor(st / 60)).padStart(2, "0")}:${String(st % 60).padStart(2, "0")}`), open = CAL.open === i, rows = evRows(e), done = e.state === "ended" || (CAL.sel === td && st != null && e.kind !== "program" && !e.cont && (e.state == null) && false);
      let mark = ""; if (!nowDone && st != null && st > nowM) { nowDone = true; mark = `<div class="nowm"><span>الآن · ${tm(new Date())}</span></div>`; }
      return `${mark}<div class="ev ${esc(e.state || "")} ${open ? "open" : ""}" style="--c:${COL[e.sys]};--i:${i}"><div class="tc">${st == null ? `<b>طوال اليوم</b>` : `<b>${esc(mm)}</b>${e.to || e.ends_at ? `<small>${esc(e.to ? tm2(e.to) : tm(e.ends_at))}</small>` : ""}`}</div><div class="rl"><i></i></div>
        <article class="ec"><button type="button" class="eh" data-k="${i}" aria-expanded="${open}"><span class="ico">${ic(KI[e.kind])}</span><span class="tt"><b>${esc(e.title)}</b><small>${esc(TYPE[e.kind] || e.kind)}${e.place || e.location ? " · " + esc(e.place || e.location) : ""}${e.owner ? " · " + esc(e.owner) : ""}</small></span>${e.kind === "meeting" ? stB(e.state) : ""}<span class="chv">${ic("chev")}</span></button>
        <div class="eb"><div><dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl><a class="go" href="${esc(e.link || "#")}">فتح في ${esc(SYS[e.sys])} ${ic("up")}</a></div></div></article></div>`; };
    const tl = ev.map(line).join("") + (!nowDone && ev.length ? `<div class="nowm"><span>الآن · ${tm(new Date())}</span></div>` : "");
    host.innerHTML = `<div class="lb-cal"><div class="lb-p lb-mcal"><div class="lb-mh"><button type="button" id="mP" aria-label="الشهر السابق">${ic("chev")}</button><b>${esc(title)}</b><button type="button" id="mN" aria-label="الشهر التالي">${ic("chev")}</button></div>
        <div class="lb-mg">${["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"].map((x) => `<span class="w">${x}</span>`).join("")}${cells.join("")}</div><button type="button" class="tdb" id="mT">العودة إلى اليوم</button>
        <div class="lg">${Object.keys(SYS).filter((k) => ["community", "saas", "plans", "booking"].includes(k)).map((k) => `<span><u style="--c:${COL[k]}"></u>${esc(SYS[k])}</span>`).join("")}</div></div>
      <div class="lb-p lb-ag ${anim ? "an" : ""}"><div class="agh"><div class="big"><b>${num(new Date(CAL.sel + "T12:00:00").getDate())}</b><span>${CAL.sel === td ? "اليوم" : esc(dayName(CAL.sel))}</span></div><div class="meta"><h4>${esc(dayName(CAL.sel))}</h4><p>${esc(hijri(new Date(CAL.sel + "T12:00:00")))}</p></div><div class="cn"><b>${num(all.length)}</b><span>حدثاً</span></div></div>
        <div class="wks" role="group" aria-label="أيام الأسبوع"><button type="button" id="wP" aria-label="الأسبوع السابق">${ic("chev")}</button>${strip}<button type="button" id="wN" aria-label="الأسبوع التالي">${ic("chev")}</button></div>
        <div class="lb-fc" role="group" aria-label="تصفية الأحداث">${KF.filter(([k]) => k === "all" || cnt[k]).map(([k, n]) => `<button type="button" data-k="${k}" class="${CAL.kf === k ? "on" : ""}">${n}<b>${num(k === "all" ? all.length : cnt[k])}</b></button>`).join("")}</div>
        <div class="tl">${tl || `<div class="lb-nomt">${calSvg}<b>${all.length ? "لا أحداث من هذا النوع" : "يوم هادئ، لا لقاءات أو فعاليات مجدولة"}</b><span>ما يُجدول في أي نظام من أنظمة المدرسة يظهر هنا فوراً.</span></div>`}</div></div></div>`;
    host.querySelectorAll(".lb-mg [data-d],.wks [data-d]").forEach((b) => (b.onclick = () => setSel(host, b.dataset.d)));
    host.querySelector("#mP").onclick = () => { const d = new Date(CAL.mon + "T12:00:00"); d.setMonth(d.getMonth() - 1); CAL.mon = iso(d); setSel(host, CAL.mon); };
    host.querySelector("#mN").onclick = () => { const d = new Date(CAL.mon + "T12:00:00"); d.setMonth(d.getMonth() + 1); CAL.mon = iso(d); setSel(host, CAL.mon); };
    host.querySelector("#mT").onclick = () => { const t = wkd(iso(nowRy())); CAL.mon = t.slice(0, 8) + "01"; setSel(host, t); };
    host.querySelector("#wP").onclick = () => setSel(host, addDays(CAL.sel, -7)); host.querySelector("#wN").onclick = () => setSel(host, addDays(CAL.sel, 7));
    host.querySelectorAll(".lb-fc button").forEach((b) => (b.onclick = () => { CAL.kf = b.dataset.k; CAL.open = null; paint(host, true); }));
    host.querySelectorAll(".eh").forEach((b) => (b.onclick = () => { const i = +b.dataset.k, was = CAL.open === i; CAL.open = was ? null : i; host.querySelectorAll(".ev").forEach((x, n) => { const o = x.querySelector(".eh"); const on = !was && +o.dataset.k === i; x.classList.toggle("open", on); o.setAttribute("aria-expanded", on); }); }));
  }
  function calWidget(host) { const td = wkd(iso(nowRy())); if (!CAL.sel) CAL.sel = td; if (!CAL.mon) CAL.mon = CAL.sel.slice(0, 8) + "01"; MC = {}; WC = {}; return paint(host, false); }

  /* ----- بطاقة الانضباط (داكنة) ----- */
  function disCard(at) {
    const head = `<div class="dh"><span class="ico g">${ic("shield")}</span><div><h4>الانضباط اليوم</h4><p>الحضور والغياب والتأخر من نظام انضباطي</p></div><a href="/indibati/dashboard.html">فتح انضباطي</a></div>`;
    if (!at.recorded) return `<section class="lb-p dkc lb-dis">${head}<div class="lb-em">لم يُرصد الحضور اليوم بعد. تظهر النسب هنا فور رصد أول فصل.</div></section>`;
    const P = Math.round(at.present_pct || 0), A = Math.round(at.absent_pct || 0), R = 15.9155, ex = at.absent_excused || 0, un = at.absent_unexcused || 0, tot = Math.max(1, at.students_in_recorded || 1), st = at.sections_total || 0, sr = at.sections_recorded || 0;
    const cov = st ? Math.round((100 * sr) / st) : 0;
    return `<section class="lb-p dkc lb-dis">${head}<div class="ds"><div class="rg" role="img" aria-label="الحضور ${P}% والغياب ${A}%"><svg viewBox="0 0 42 42"><circle class="tk" cx="21" cy="21" r="${R}"/><circle class="pr" cx="21" cy="21" r="${R}" pathLength="100" style="--p:${P}"/><circle class="ab" cx="21" cy="21" r="${R}" pathLength="100" style="--p:${A};--o:${-P}"/></svg><div class="ct"><b class="cu" data-cu="${P}" data-sfx="%">0</b><span>نسبة الحضور</span></div></div>
      <div class="ks"><div class="k g"><b class="cu" data-cu="${at.present || 0}">0</b><span>الطلاب الحضور</span><small>من ${num(at.students_in_recorded)} طالباً</small></div>
      <div class="k r"><b class="cu" data-cu="${A}" data-sfx="%">0</b><span>نسبة الغياب</span><small>${num(at.absent)} غائباً</small></div>
      <div class="k y"><b class="cu" data-cu="${ex}">0</b><span>غياب بعذر</span><small>${num(un)} بدون عذر</small></div>
      <div class="k b"><b class="cu" data-cu="${at.late || 0}">0</b><span>المتأخرون</span><small>سجلات التأخر اليوم</small></div></div></div>
      <div class="ft2"><div class="cv"><span>تغطية الرصد: ${num(sr)} من ${num(st)} فصلاً (${num(cov)}%)</span><div class="dots">${Array.from({ length: st }, (_, i) => `<i class="${i < sr ? "on" : ""}"></i>`).join("")}</div></div>
      <div class="sb"><div class="stk" aria-hidden="true"><i class="g" style="width:${(100 * (at.present || 0)) / tot}%"></i><i class="y" style="width:${(100 * ex) / tot}%"></i><i class="r" style="width:${(100 * un) / tot}%"></i></div><div class="lb-leg"><span><i style="background:#3ed598"></i>حاضر</span><span><i style="background:#f0b34a"></i>بعذر</span><span><i style="background:#ff7a66"></i>بدون عذر</span></div></div></div></section>`;
  }

  /* ----- مؤشرات المدرسة: خارطة اكتمال المجالات ----- */
  function indCard(ind) {
    const doms = ind.domains || [], PAL = ["#0f8a94", "#2f5ea8", "#7a4bb5", "#b86d0c", "#24895a", "#b8434f"], ov = ind.total ? Math.round((100 * ind.approved) / ind.total) : 0;
    const head = `<div class="dh"><span class="ico b">${ic("task")}</span><div><h4>مؤشرات المدرسة${ind.cycle ? " · " + esc(ind.cycle) : ""}</h4><p>${ind.has_cycle ? `اكتمال كل مجال بحسب المؤشرات المعتمدة · تغيّر ${num(ind.changed_7d)} خلال 7 أيام` : "لا توجد دورة تقويم نشطة"}</p></div><a href="/self-evaluation/admin.html">فتح التقويم الذاتي</a></div>`;
    if (!doms.length) return `<section class="lb-p lb-ind">${head}${em("لا مجالات للعرض.")}</section>`;
    const ring = (p, c, sz) => `<svg viewBox="0 0 42 42" width="${sz}" height="${sz}" aria-hidden="true"><circle class="tk" cx="21" cy="21" r="15.9155"/><circle class="pr" cx="21" cy="21" r="15.9155" pathLength="100" style="--p:${p};stroke:${c}"/></svg>`;
    return `<section class="lb-p lb-ind">${head}<div class="ig"><div class="ovr"><div class="rg">${ring(ov, "#0f8a94", 150)}<div class="ct"><b class="cu" data-cu="${ov}" data-sfx="%">0</b><span>اكتمال المدرسة</span></div></div><small>${num(ind.approved)} معتمد من ${num(ind.total)} مؤشراً</small></div>
      <div class="dm">${doms.map((x, i) => { const p = x.total ? Math.round((100 * x.approved) / x.total) : 0, c = PAL[i % PAL.length]; return `<a class="d" href="/self-evaluation/admin.html" style="--c:${c}"><span class="rg">${ring(p, c, 68)}<b>${num(p)}%</b></span><span class="tx"><b>${esc(x.name)}</b><small>${num(x.total)} مؤشرات · ${num(x.approved)} معتمد · ${num(x.evaluated)} مقيَّم</small><small>${x.last_update ? "آخر تحديث " + dt(x.last_update) : "لم يُحدَّث بعد"}</small></span></a>`; }).join("")}</div></div></section>`;
  }

  /* ----- النمو المهني ----- */
  function growthCard(gr) {
    const head = `<div class="dh"><span class="ico y">${ic("star")}</span><div><h4>النمو المهني للمعلمين</h4><p>${gr ? `${num(gr.plans)} خطة نمو من ${num(gr.teachers)} معلماً` : "تعذر تحميل البيانات"}</p></div><a href="/teachers-community/#/growth">مجتمع لبيد المهني</a></div>`;
    if (!gr) return `<section class="lb-p lb-gr">${head}</section>`;
    const mx = Math.max(1, ...(gr.needs || []).map((n) => n.n)), pr = gr.target_hours ? Math.min(100, Math.round((100 * gr.approved_hours) / gr.target_hours)) : 0;
    return `<section class="lb-p lb-gr">${head}<div class="gg"><div class="gk"><div><b class="cu" data-cu="${gr.approved_hours || 0}">0</b><span>ساعة معتمدة</span></div><div><b class="cu" data-cu="${gr.records_30d || 0}">0</b><span>سجل جديد خلال 30 يوماً</span></div><div><b class="cu" data-cu="${gr.pending_review || 0}">0</b><span>بانتظار المراجعة</span></div>
      <div class="pg"><div class="lb-row"><span>الإنجاز نحو هدف ${num(gr.target_hours)} ساعة</span><b>${num(pr)}%</b></div><div class="lb-bar"><i style="width:${pr}%"></i></div></div></div>
      <div class="gl"><h5>آخر ما اعتُمد</h5>${(gr.latest || []).length ? gr.latest.map((x) => `<a class="lb-it" href="${esc(x.link)}">${av(x.who, "community")}<div class="tx"><b>${esc(x.title)}</b><div class="mt"><span>${esc(x.who)}</span>${x.hours ? `<span>${num(x.hours)} ساعة</span>` : ""}</div></div></a>`).join("") : em("لم تُعتمد سجلات نمو بعد.")}</div>
      <div class="gn"><h5>الاحتياجات المهنية المفتوحة (${num(gr.needs_open)})</h5>${(gr.needs || []).length ? gr.needs.slice(0, 5).map((n, i) => `<div class="lb-row"><span>${esc(n.domain)}</span><b>${num(n.n)}${n.high ? ` · ${n.high} عالٍ` : ""}</b></div><div class="lb-bar"><i style="width:${(n.n / mx) * 100}%;animation-delay:${i * .08}s;background:linear-gradient(90deg,#7a4bb5,#b99ae0)"></i></div>`).join("") : em("لا احتياجات مسجلة.")}</div></div></section>`;
  }
  /* ----- المعلمون الأكثر إنجازاً ----- */
  function achCard(list) {
    const head = `<div class="dh"><span class="ico b">${ic("crown")}</span><div><h4>الأكثر إنجازاً في النمو المهني</h4><p>المعلمون حسب الساعات المعتمدة</p></div><a href="/teachers-community/#/growth">كل السجلات</a></div>`;
    if (!list.length) return `<section class="lb-p lb-ach">${head}${em("لم تُعتمد ساعات نمو مهني بعد.")}</section>`;
    const mx = Math.max(1, ...list.map((x) => x.hours));
    return `<section class="lb-p lb-ach">${head}<div class="al">${list.map((x, i) => `<a class="ap r${i < 3 ? i + 1 : 0}" href="${esc(x.link)}" style="--h:${hue(x.name)[0]}"><span class="rk">${num(i + 1)}</span><span class="ph">${x.photo ? `<img loading="lazy" alt="" src="${esc(pub("public-photos", x.photo))}">` : esc(mono(x.name))}</span><b>${esc(x.name)}</b><small>${esc(x.specialty || "معلم")}</small><span class="pt"><i style="width:${(100 * x.hours) / mx}%"></i></span><em>${num(x.hours)} ساعة · ${num(x.records)} نشاط</em></a>`).join("")}</div></section>`;
  }
  /* ----- برامج هذا الأسبوع ----- */
  function progCard(wk) {
    const ps = (wk.events || []).filter((e) => e.kind === "program").sort((a, b) => String(a.day).localeCompare(String(b.day)));
    const head = `<div class="dh"><span class="ico c">${ic("program")}</span><div><h4>برامج هذا الأسبوع</h4><p>${esc(fmt(wk.from))} – ${esc(fmt(wk.to))} · ${num(ps.length)} برنامجاً</p></div><a href="/smart-plans/">الخطط الذكية</a></div>`;
    if (!ps.length) return `<section class="lb-p lb-pg">${head}${em("لا برامج مجدولة هذا الأسبوع.", ["/smart-plans/", "فتح الخطط الذكية"])}</section>`;
    return `<section class="lb-p lb-pg">${head}<div class="pgl">${ps.map((e) => `<a class="pgc" href="${esc(e.link || "/smart-plans/")}"><span class="dy"><b>${num(new Date(e.day + "T12:00:00").getDate())}</b><small>${esc(dayName(e.day))}</small></span><span class="tx"><b>${esc(e.title)}</b><small>${e.until && e.until !== e.day ? `حتى ${esc(fmt(e.until))}` : "يوم واحد"}${e.owner ? " · " + esc(e.owner) : ""}</small>${e.beneficiary ? `<small>المستفيد: ${esc(e.beneficiary)}</small>` : ""}</span>${e.status ? `<span class="lb-st b">${esc(e.status)}</span>` : ""}</a>`).join("")}</div></section>`;
  }
  /* ----- الحجوزات حسب الحصص ----- */
  function periodsCard(pd) {
    const ps = pd.periods || [], taken = ps.filter((p) => (p.bookings || []).length).length;
    const head = `<div class="dh"><span class="ico c">${ic("booking")}</span><div><h4>حجوزات اليوم حسب الحصص</h4><p>${num(taken)} حصص فيها حجوزات من ${num(ps.length)} · ${num(pd.total_bookable)} مرافق قابلة للحجز</p></div><a href="${esc(pd.link || "/facility-booking/bookings.html")}">احجز مرفقاً</a></div>`;
    const stl = { running: ["جارية الآن", "g"], upcoming: ["قادمة", "b"], ended: ["انتهت", ""] };
    return `<section class="lb-p lb-bk">${head}<div class="pdg">${ps.map((p) => { const bk = p.bookings || [], s = stl[p.state] || ["", ""]; return `<article class="pc ${esc(p.state)} ${bk.length ? "has" : "empty"}"><div class="ph"><b>${esc(p.name)}</b><small>${esc(tm2(p.from))} – ${esc(tm2(p.to))}</small><span class="lb-st ${s[1]}">${s[0]}</span></div>${bk.length ? bk.map((x) => `<div class="bi ${x.status === "pending" ? "pend" : ""}"><b>${esc(x.facility)}</b><small>${esc(x.who || "")}${x.purpose ? " · " + esc(x.purpose) : ""}</small>${x.status === "pending" ? `<em>بانتظار الاعتماد</em>` : ""}</div>`).join("") : `<div class="fr0"><span>فارغة</span><small>متاحة للحجز</small></div>`}</article>`; }).join("")}</div></section>`;
  }
  /* ----- المجتمعات المهنية ----- */
  const CKIND = { plc: "مجتمع تعلم مهني", team: "فريق عمل", committee: "لجنة" };
  function commCard(cs, ev) {
    const head = `<div class="dh"><span class="ico y">${ic("meeting")}</span><div><h4>المجتمعات المهنية</h4><p>${num(cs.length)} مجتمعاً نشطاً وآخر ما حدث فيها</p></div><a href="/teachers-community/#/communities">فتح المجتمعات</a></div>`;
    const one = (c) => `<a class="cm" href="${esc(c.link)}"><span class="ci">${ic("meeting")}</span><b>${esc(c.name)}</b><small>${esc(CKIND[c.kind] || c.kind || "")}${c.leader ? " · القائد: " + esc(c.leader) : ""}</small><span class="cn"><em>${num(c.members)}</em> أعضاء <em>${num(c.meetings_30d)}</em> لقاءات (30 يوماً)</span></a>`;
    const set = cs.map(one).join("");
    const KL = { minutes: "توثيق", meeting: "لقاء", post: "منشور", growth: "نمو مهني", task: "مهمة", initiative: "مبادرة", community: "مجتمع" };
    return `<section class="lb-p dkc lb-cm">${head}${cs.length ? `<div class="vp"><div class="tr" style="animation-duration:${Math.max(30, cs.length * 12)}s">${set}${cs.length > 2 ? set : ""}</div></div>` : em("لا مجتمعات نشطة.")}
      <div class="ce"><h5>آخر الأحداث في المجتمعات</h5>${(ev || []).length ? ev.map((x) => `<a class="ei" href="${esc(x.link || "#")}"><span class="kd ${x.kind === "minutes" ? "doc" : ""}">${esc(KL[x.kind] || x.kind)}</span><span class="tx"><b>${esc(String(x.title).replace(/^[^:]+: /, ""))}</b><small>${esc(x.detail || "")}${x.actor ? " · " + esc(x.actor) : ""}</small></span><time>${REL(x.at)}</time></a>`).join("") : em("لا أحداث حديثة.")}</div></section>`;
  }
  /* ----- حالة الأنظمة (أخضر، قابلة للتمدد) ----- */
  const SICO = { core: "school", saas: "check", plans: "plan", community: "users", indibati: "clock", qiyami: "star", booking: "cal" };
  const SDESC = { core: "الهوية الموحدة والسجلات", saas: "المؤشرات والشواهد والتقييم", plans: "الخطط والبرامج وتوثيقها", community: "النمو المهني والمجتمعات", indibati: "الحضور والغياب والتأخر", qiyami: "النقاط والأوسمة والسلوك", booking: "حجز المرافق والقاعات" };
  const SURL = { core: "/digital-core/dashboard.html", saas: "/self-evaluation/admin.html", plans: "/smart-plans/", community: "/teachers-community/", indibati: "/indibati/dashboard.html", qiyami: "/qiyami/leaderboard.html", booking: "/facility-booking/bookings.html" };
  const SOPEN = new Set();
  function sysCard(d, pl) {
    const tot = Object.values(pl.by_sys).reduce((a, b) => a + b, 0) || 1;
    return `<section class="lb-p lb-sys"><div class="dh"><span class="ico g">${ic("shield")}</span><div><h4>حالة الأنظمة</h4><p>سبعة أنظمة، وكل نظام يبقى مصدر الحقيقة لبياناته · اضغط على النظام لتفاصيله</p></div></div><div class="sl">${Object.keys(SYS).map((k) => {
      const v = d.sources && d.sources[k], age = v ? (Date.now() - new Date(v)) / 864e5 : 99, st = age < 2 ? ["نشط", "ok"] : age < 7 ? ["هادئ", "mid"] : ["ساكن", "old"], n = pl.by_sys[k] || 0;
      return `<div class="sy ${st[1]} ${SOPEN.has(k) ? "open" : ""}" data-k="${k}"><button type="button" class="sh" aria-expanded="${SOPEN.has(k)}"><span class="si">${ico(SICO[k])}</span><span class="tt"><b>${esc(SYS[k])}</b><small>${esc(SDESC[k])}</small></span><span class="bd"><i></i>${st[0]}</span><span class="chv">${ic("chev")}</span></button>
        <div class="sb"><div><div class="sx"><div><b>${num(n)}</b><span>سجلاً في 14 يوماً</span></div><div><b>${REL(v)}</b><span>آخر نشاط</span></div><div><b>${num(Math.round((100 * n) / tot))}%</b><span>من حركة المدرسة</span></div></div><div class="lb-bar"><i style="width:${Math.max((n / tot) * 100, n ? 4 : 0)}%"></i></div><div class="sf" data-sf="${k}"><small>جارٍ تحميل آخر الأحداث…</small></div><a class="go" href="${SURL[k]}">فتح ${esc(SYS[k])} ${ic("up")}</a></div></div></div>`; }).join("")}</div></section>`;
  }
  async function loadSf(el, k) { if (el.dataset.done) return; el.dataset.done = "1"; try { const r = await rpc("lb_feed", { p_from: null, p_to: null, p_sys: k, p_kind: null, p_op: null, p_ach: null, p_limit: 4, p_offset: 0 }); const it = r.items || []; el.innerHTML = it.length ? it.map((x) => `<a href="${esc(x.link || "#")}"><b>${esc(x.title)}</b><small>${esc(x.actor || "")} · ${REL(x.at)}</small></a>`).join("") : `<small>لا أحداث حديثة.</small>`; } catch (e) { el.dataset.done = ""; el.innerHTML = `<small>تعذر التحميل.</small>`; } }

  async function overview() {
    const [d, pl, docs, wk, gr, ach, pd, cs, cev] = await Promise.all([rpc("lb_day", { p_day: null }), hero(), rpc("lb_docs", { p_limit: 12 }).catch(() => []), rpc("lb_week", { p_from: null }).catch(() => ({ events: [] })), rpc("lb_growth").catch(() => null), rpc("lb_achievers", { p_n: 6 }).catch(() => []), rpc("lb_periods", { p_day: null }).catch(() => ({ periods: [] })), rpc("lb_communities").catch(() => []), rpc("lb_feed", { p_from: null, p_to: null, p_sys: "community", p_kind: null, p_op: null, p_ach: null, p_limit: 6, p_offset: 0 }).then((r) => r.items).catch(() => [])]);
    body.innerHTML = `${disCard(d.attendance || {})}
      ${docsStrip(docs || [])}
      <section id="lbCal" class="lb-calw" aria-label="التقويم واللقاءات"></section>
      ${indCard(d.indicators || {})}
      ${growthCard(gr)}
      ${achCard(ach || [])}
      ${progCard(wk || { events: [] })}
      ${periodsCard(pd || { periods: [] })}
      ${commCard(cs || [], cev || [])}
      ${sysCard(d, pl)}`;
    body.querySelectorAll(".lb-docs .dc").forEach((b) => (b.onclick = () => docDlg(DOCS[+b.dataset.i])));
    body.querySelectorAll(".sy .sh").forEach((b) => (b.onclick = () => { const r = b.parentElement, k = r.dataset.k, on = !r.classList.contains("open"); r.classList.toggle("open", on); b.setAttribute("aria-expanded", on); on ? SOPEN.add(k) : SOPEN.delete(k); if (on) loadSf(r.querySelector(".sf"), k); }));
    body.querySelectorAll(".sy.open .sf").forEach((e) => loadSf(e, e.dataset.sf));
    body.querySelectorAll(".cu").forEach((el) => countUp(el, el.dataset.cu));
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
