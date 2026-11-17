/* «يحدث في لبيد» – نافذة قراءة فقط؛ لا تكتب في أي جدول، وتستدعي دوال التجميع lb_day / lb_week / lb_ticker / lb_feed فقط. */
async function lbeedPage(m) {
  const SYS = { core: "النواة الرقمية", saas: "التقويم المدرسي الذكي", plans: "الخطط الذكية", community: "مجتمع لبيد المهني", indibati: "انضباطي", qiyami: "قيمي", booking: "احجز مرفق" };
  const KIND = { meeting: "اجتماع", program: "برنامج", booking: "حجز", deadline: "موعد", task: "مهمة", calendar: "تقويم", attendance: "حضور", achievement: "إنجاز" };
  const OP = { new: "جديد", update: "تعديل" };
  const ST = { upcoming: ["قادم", "b"], running: ["جارٍ الآن", "g"], ended: ["انتهى", ""], cancelled: ["ملغى", "r"], postponed: ["مؤجل", "y"] };
  const DOC = { none: ["لم يوثق", "y"], pending: ["بانتظار الاعتماد", "b"], documented: ["موثق", "g"] };
  const S = { view: "day", day: null, wk: null, wkMode: "grid", feed: { sys: "", kind: "", op: "", from: "", to: "", off: 0 } };
  const today = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const tm = (t) => (t ? new Date(t).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const tm2 = (s) => (s ? String(s).slice(0, 5) : "—");
  const dt = (t) => (t ? new Date(t).toLocaleString("ar-SA-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" }) : "—");
  const dayName = (s) => new Date(s + "T12:00:00").toLocaleDateString("ar-SA", { weekday: "long" });
  const sysB = (k) => `<span class="sysb">${esc(SYS[k] || k)}</span>`;
  const stB = (s) => { const x = ST[s] || [s, ""]; return `<span class="st ${x[1]}">${esc(x[0])}</span>`; };
  const lnk = (l, t) => (l ? `<a href="${esc(l)}">${esc(t)}</a>` : esc(t));
  const em = (t) => `<div class="em">${esc(t)}</div>`;
  const num = (v) => (v == null ? "—" : Number(v).toLocaleString("ar-SA-u-nu-latn"));
  const hijri = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const greg = (d) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(d);
  let last = null, ok = true, timer = null;

  m.innerHTML = `<div class="wrap lbx"><div class="hd"><div><h2>يحدث في لبيد</h2><p>لبيد تتحرك، وإنجازاتها تُرى</p><div style="margin-top:8px"><span class="live" id="lbLive"><i></i><span id="lbLiveT">جارٍ التحميل…</span></span></div></div>
    <div class="dts"><b id="lbH"></b><span id="lbG"></span><span id="lbU"></span></div></div>
    <div class="tg"><button data-v="day" class="on" type="button">اليوم</button><button data-v="week" type="button">أسبوع</button><button data-v="log" type="button">سجل التحديثات</button><span class="sp"></span><button id="lbR" type="button">${ico("refresh")} تحديث</button></div>
    <div id="lbBody"></div>
    <p class="mt" style="margin:18px 0">نافذة قراءة فقط تجمع ما تسجله أنظمة المدرسة السبعة من مصادرها الأصلية دون نسخ أو تعديل، وتحترم صلاحيات كل نظام. لا تُعرض فيها حالات فردية للطلاب.</p></div>`;
  const body = m.querySelector("#lbBody");
  const nd = today();
  m.querySelector("#lbH").textContent = hijri(nd);
  m.querySelector("#lbG").textContent = greg(nd) + " م";

  const setStatus = () => {
    const el = m.querySelector("#lbLive");
    el.classList.toggle("off", !ok);
    m.querySelector("#lbLiveT").textContent = ok ? "متصل – يتحدث تلقائياً كل دقيقة" : "تعذر التحديث – المعروض آخر بيانات محملة";
    m.querySelector("#lbU").textContent = last ? "آخر تحديث: " + tm(last) : "";
  };
  const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args || {}); if (error) throw error; return data; };

  /* ---------- اليوم ---------- */
  const srcRow = (s) => { const k = Object.keys(SYS); return `<div class="src">${k.map((x) => { const v = s && s[x]; const old = v && Date.now() - new Date(v) > 7 * 864e5; return `<span class="${!v || old ? "old" : ""}" title="${v ? "آخر نشاط: " + dt(v) : "لا نشاط مسجل"}">${esc(SYS[x])}: ${v ? dt(v) : "لا بيانات حديثة"}</span>`; }).join("")}</div>`; };
  const pulse = (p) => {
    const cells = [["الاجتماعات", p.meetings + p.pro_meetings, "اجتماعات اليوم"], ["البرامج", p.programs, "برامج جارية اليوم"], ["الحجوزات", p.bookings, "حجوزات معتمدة"], ["مهام وآجال", p.tasks_due, p.overdue ? p.overdue + " متأخر" : "مستحقة اليوم"], ["حضور الطلاب", p.present_pct == null ? null : p.present_pct + "%", p.attendance_recorded ? "من الفصول المرصودة" : "لم يرصد بعد"], ["سجلات اليوم", p.records, "حركة في الأنظمة"]];
    return `<div class="pulse">${cells.map(([a, b, c]) => `<div class="pc"><span>${a}</span><b>${typeof b === "string" ? esc(b) : num(b)}</b><small>${esc(c)}</small></div>`).join("")}</div>`;
  };
  const meetRows = (a) => !a.length ? em("لا اجتماعات مجدولة في هذا اليوم.") : `<div class="tw"><table><thead><tr><th>الفريق</th><th>العنوان</th><th>الوقت</th><th>المكان</th><th>المسؤول</th><th>الحالة</th><th>التوثيق</th></tr></thead><tbody>${a.map((x) => `<tr><td>${esc(x.team)}<div>${sysB(x.sys)}</div></td><td>${lnk(x.link, x.title)}${x.actions && x.actions.length ? `<div class="mt">توصيات: ${x.actions.map((t) => esc(t.title)).join("، ")}</div>` : ""}</td><td>${tm(x.starts_at)}${x.ends_at ? " – " + tm(x.ends_at) : ""}</td><td>${esc(x.location || "—")}</td><td>${esc(x.owner || "—")}</td><td>${stB(x.state)}</td><td>${x.state === "ended" || x.state === "running" ? `<span class="st ${(DOC[x.doc] || DOC.none)[1]}">${(DOC[x.doc] || DOC.none)[0]}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>`;
  const dayView = async () => {
    const [d, tk, fd] = await Promise.all([rpc("lb_day", { p_day: S.day }), rpc("lb_ticker").catch(() => []), rpc("lb_feed", { p_from: null, p_to: null, p_sys: null, p_kind: null, p_op: null, p_ach: true, p_limit: 8, p_offset: 0 }).catch(() => ({ items: [] }))]);
    const ind = d.indicators || {}, pl = d.plans || {}, co = d.community || {}, q = d.qiyami || {}, at = d.attendance || {}, fa = d.facilities || {};
    const items = fd.items || [];
    body.innerHTML = `
      <div class="fl"><button class="btn sec sm" id="lbPrev" type="button">اليوم السابق</button><input type="date" id="lbDay" value="${esc(d.day)}"><button class="btn sec sm" id="lbNext" type="button">اليوم التالي</button>${d.is_today ? "" : `<button class="btn sec sm" id="lbToday" type="button">العودة لليوم</button>`}<b style="align-self:center">${esc(dayName(d.day))}</b></div>
      ${pulse(d.pulse)}
      ${tk && tk.length ? `<div class="tick" id="lbTick" aria-label="شريط التميز"><button class="pb" id="lbPz" type="button" title="إيقاف/تشغيل الحركة" aria-label="إيقاف مؤقت">II</button><div class="tr">${[0, 1].map(() => tk.map((x) => `<a href="${esc(x.link || "#")}"><em>${esc(x.tag)}</em>${esc(x.text)}</a>`).join("")).join("")}</div></div>` : ""}
      <div class="gr"><div class="cd wide"><h4>اجتماعات اليوم</h4>${meetRows(d.meetings || [])}</div>
      <div class="cd"><h4>أحدث الإنجازات والتوثيق</h4>${items.length ? items.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.title)}<div class="mt">${sysB(x.sys)}<span>${dt(x.at)}</span>${x.actor ? `<span>${esc(x.actor)}</span>` : ""}</div></div></div>`).join("") : em("لا إنجازات موثقة حديثاً.")}</div>
      <div class="cd"><h4>مؤشرات المدرسة <a href="${esc(ind.link || "#")}">التقويم الذاتي</a></h4>${!ind.has_cycle ? em("لا توجد دورة تقويم نشطة.") : `<div class="mt">${esc(ind.cycle || "")} · ${num(ind.total)} مؤشراً · معتمد ${num(ind.approved)} · تغير آخر 7 أيام: ${num(ind.changed_7d)}</div>${(ind.domains || []).map((x) => `<div style="margin-top:8px"><div style="display:flex;justify-content:space-between;font-size:.86rem"><span>${esc(x.name)}</span><b>${x.approved}/${x.total}</b></div><div class="bar"><i style="width:${x.pct || 0}%"></i></div><div class="mt"><span>آخر تحديث: ${x.last_update ? dt(x.last_update) : "لم يحدث"}</span>${x.changed_7d ? `<span>تغير ${x.changed_7d}</span>` : ""}</div></div>`).join("")}${(ind.follow_up || []).length ? `<div class="mt" style="margin-top:8px">يحتاج متابعة: ${ind.follow_up.map((x) => esc(x.code)).join("، ")}</div>` : ""}${(ind.not_updated || []).length ? `<div class="mt">لم يُحدّث منذ أكثر من 14 يوماً: ${ind.not_updated.map((x) => esc(x.code)).join("، ")}</div>` : ""}`}</div>
      <div class="cd"><h4>الخطط الذكية <a href="${esc(pl.link || "#")}">فتح</a></h4>${(pl.plans || []).length ? pl.plans.map((x) => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span>${esc(x.name)}</span><b>${x.done}/${x.total}</b></div><div class="bar"><i style="width:${x.pct || 0}%"></i></div><div class="mt">${x.overdue ? `<span>متأخر ${x.overdue}</span>` : ""}${x.stale ? `<span>راكد ${x.stale}</span>` : ""}</div></div>`).join("") + `<div class="mt">برامج خلال 7 أيام: ${num(pl.next7)} · آخر تحديث ${pl.last_update ? dt(pl.last_update) : "—"}</div>` : em("لا خطط.")}${(d.programs || []).length ? `<div style="margin-top:8px"><b style="font-size:.86rem">برامج اليوم</b>${d.programs.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.name)}<div class="mt"><span>${esc(x.owner || "")}</span><span>${esc(x.status || "")}</span></div></div></div>`).join("")}</div>` : ""}</div>
      <div class="cd"><h4>مجتمع لبيد المهني <a href="${esc(co.link || "#")}">فتح</a></h4><div class="mt">فرق نشطة: ${num(co.communities_active)} · لقاءات منفذة اليوم: ${num(co.held_today)} · محاضر معتمدة اليوم: ${num(co.documented_today)}</div>
        ${(co.awaiting_doc || []).length ? `<b style="font-size:.86rem">لقاءات بانتظار التوثيق</b>${co.awaiting_doc.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.title)}<div class="mt"><span>${esc(x.community)}</span><span>${dt(x.at)}</span></div></div></div>`).join("")}` : ""}
        ${(co.latest_minutes || []).length ? `<b style="font-size:.86rem">آخر المحاضر المعتمدة</b>${co.latest_minutes.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.title)}<div class="mt"><span>${esc(x.community)}</span><span>${dt(x.at)}</span></div></div></div>`).join("")}` : ""}
        ${(co.active_teams || []).length ? `<b style="font-size:.86rem">أنشط الفرق (30 يوماً)</b>${co.active_teams.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.name)}<div class="mt"><span>${num(x.activity)} نشاطاً</span></div></div></div>`).join("")}` : ""}
        ${!(co.awaiting_doc || []).length && !(co.latest_minutes || []).length && !(co.active_teams || []).length ? em("لا نشاط مسجل حديثاً في المجتمع المهني.") : ""}</div>
      <div class="cd"><h4>انضباطي – مجاميع اليوم <a href="/indibati/dashboard.html">فتح</a></h4>${at.recorded ? `<div class="mt">فصول مرصودة: ${num(at.sections_recorded)} من ${num(at.sections_total)} · طلاب في الفصول المرصودة: ${num(at.students_in_recorded)}</div><div class="bar"><i style="width:${at.present_pct || 0}%"></i></div><div class="pulse" style="margin:8px 0 0"><div class="pc"><span>حضور</span><b>${at.present_pct}%</b></div><div class="pc"><span>غياب</span><b>${num(at.absent)}</b><small>بعذر ${num(at.absent_excused)} · بدون ${num(at.absent_unexcused)}</small></div><div class="pc"><span>تأخر</span><b>${num(at.late)}</b></div></div>` : em("لم يُرصد الحضور في هذا اليوم بعد.")}</div>
      <div class="cd"><h4>قيمي <a href="${esc(q.link || "#")}">لوحة الشرف</a></h4>${(q.top3 || []).length ? `<b style="font-size:.86rem">أعلى 3 في لوحة الشرف</b>${q.top3.map((x) => `<div class="li"><div class="tx"><b>${x.rank}. ${esc(x.name)}</b><div class="mt"><span>${esc(x.grade)} / ${esc(x.section)}</span><span>${num(x.balance)} نقطة</span></div></div></div>`).join("")}` : em("لا بيانات في لوحة الشرف.")}
        <div class="mt" style="margin-top:8px">اليوم: ${num(q.today && q.today.reinforcements)} تعزيزاً · ${num(q.today && q.today.badges)} وساماً · هذا الأسبوع: ${num(q.week && q.week.reinforcements)} تعزيزاً · ${num(q.week && q.week.badges)} وساماً</div>
        ${(q.recent_badges || []).length ? `<b style="font-size:.86rem">آخر الأوسمة</b>${q.recent_badges.map((x) => `<div class="li"><div class="tx">${esc(x.student)} – <b>${esc(x.badge)}</b><div class="mt"><span>${dt(x.at)}</span></div></div></div>`).join("")}` : ""}
        ${(q.values || []).length ? `<b style="font-size:.86rem">أكثر القيم تفاعلاً</b><div class="mt">${q.values.map((x) => `<span>${esc(x.name)} (${num(x.n)})</span>`).join(" · ")}</div>` : ""}
        ${(q.givers || []).length ? `<b style="font-size:.86rem">الأكثر منحاً</b><div class="mt">${q.givers.map((x) => `<span>${esc(x.name)}: ${num(x.reinforcements)} تعزيزاً${x.badges ? " و" + num(x.badges) + " وساماً" : ""}</span>`).join(" · ")}</div>` : ""}</div>
      <div class="cd"><h4>احجز مرفق <a href="/facility-booking/bookings.html">فتح</a></h4><div class="mt">${fa.available_now == null ? "" : `متاح الآن ${num(fa.available_now)} من ${num(fa.total_bookable)} · مشغول ${num(fa.busy_now)}`}</div>${(fa.bookings || []).length ? fa.bookings.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.facility)}<div class="mt"><span>${esc(x.beneficiary || "")}</span><span>${esc(x.purpose || "")}</span><span>${tm2(x.start)} – ${tm2(x.end)}</span></div></div>${stB(x.state)}</div>`).join("") : em("لا حجوزات في هذا اليوم.")}</div>
      <div class="cd wide"><h4>حالة المصادر</h4>${srcRow(d.sources)}<div class="mt" style="margin-top:6px">التواريخ أعلاه هي آخر نشاط مسجل في كل نظام؛ الأصفر يعني أن النظام لم يُحدّث منذ أكثر من 7 أيام أو لا بيانات فيه.</div></div></div>`;
    const go = (n) => { const x = new Date((S.day || d.day) + "T12:00:00"); x.setDate(x.getDate() + n); S.day = iso(x); load(); };
    body.querySelector("#lbPrev").onclick = () => go(-1); body.querySelector("#lbNext").onclick = () => go(1);
    body.querySelector("#lbDay").onchange = (e) => { S.day = e.target.value || null; load(); };
    const t = body.querySelector("#lbToday"); if (t) t.onclick = () => { S.day = null; load(); };
    const pz = body.querySelector("#lbPz"); if (pz) pz.onclick = () => body.querySelector("#lbTick").classList.toggle("pz");
  };

  /* ---------- الأسبوع ---------- */
  const evCard = (e) => `<a class="ev" href="${esc(e.link || "#")}"><b>${esc(e.title)}</b><small>${esc(KIND[e.kind] || e.kind)} · ${esc(SYS[e.sys] || "")}${e.starts_at ? " · " + tm(e.starts_at) : e.from ? " · " + tm2(e.from) : ""}${e.owner ? " · " + esc(e.owner) : ""}</small></a>`;
  const weekView = async () => {
    const w = await rpc("lb_week", { p_from: S.wk }), h = w.harvest || {}, ev = w.events || [];
    const days = []; for (let i = 0; i < 7; i++) { const x = new Date(w.from + "T12:00:00"); x.setDate(x.getDate() + i); days.push(iso(x)); }
    const td = iso(today());
    const by = (k) => ev.filter((e) => e.day === k);
    const harv = [["لقاءات منفذة", h.meetings_held], ["محاضر موثقة", h.documented], ["برامج منجزة", h.programs_done == null ? null : h.programs_done + " من " + h.programs_planned], ["إنجازات موثقة", h.achievements], ["أوسمة ممنوحة", h.badges], ["تعزيزات", h.reinforcements], ["مؤشرات تغيرت", h.indicators_changed], ["شواهد مضافة", h.evidence_added], ["أيام رصد الحضور", h.attendance_days], ["إجمالي السجلات", h.records]];
    body.innerHTML = `<div class="fl"><button class="btn sec sm" id="lbWP" type="button">الأسبوع السابق</button><button class="btn sec sm" id="lbWN" type="button">الأسبوع التالي</button><button class="btn sec sm" id="lbWT" type="button">هذا الأسبوع</button><button class="btn sec sm" id="lbWM" type="button">${S.wkMode === "grid" ? "عرض جدولي" : "عرض الأيام"}</button><b style="align-self:center">${fmt(w.from)} – ${fmt(w.to)}</b></div>
      <div class="cd" style="margin-bottom:14px"><h4>حصاد الأسبوع</h4><div class="pulse" style="margin:0">${harv.map(([a, b]) => `<div class="pc"><span>${a}</span><b>${typeof b === "string" ? esc(b) : num(b)}</b></div>`).join("")}</div>
        ${(h.highlights || []).length ? `<b style="font-size:.86rem">أبرز ما حدث</b>${h.highlights.map((x) => `<div class="li"><div class="tx">${lnk(x.link, x.title)}<div class="mt">${sysB(x.sys)}<span>${dt(x.at)}</span>${x.actor ? `<span>${esc(x.actor)}</span>` : ""}</div></div></div>`).join("")}` : ""}</div>
      ${S.wkMode === "grid" ? `<div class="wk">${days.map((k) => `<div class="wd ${k === td ? "today" : ""}"><h5>${esc(dayName(k))} <small>${fmt(k)}</small></h5>${by(k).length ? by(k).map(evCard).join("") : `<div class="mt">لا أحداث</div>`}</div>`).join("")}</div>`
      : `<div class="cd tw"><table><thead><tr><th>اليوم</th><th>النوع</th><th>العنوان</th><th>النظام</th><th>المسؤول</th><th>الوقت</th></tr></thead><tbody>${ev.length ? ev.map((e) => `<tr><td>${esc(dayName(e.day))} ${fmt(e.day)}</td><td>${esc(KIND[e.kind] || e.kind)}</td><td>${lnk(e.link, e.title)}</td><td>${sysB(e.sys)}</td><td>${esc(e.owner || "—")}</td><td>${e.starts_at ? tm(e.starts_at) : e.from ? tm2(e.from) + (e.to ? " – " + tm2(e.to) : "") : "—"}</td></tr>`).join("") : `<tr><td colspan="6">${em("لا أحداث في هذا الأسبوع.")}</td></tr>`}</tbody></table></div>`}`;
    const sh = (n) => { const x = new Date(w.from + "T12:00:00"); x.setDate(x.getDate() + n); S.wk = iso(x); load(); };
    body.querySelector("#lbWP").onclick = () => sh(-7); body.querySelector("#lbWN").onclick = () => sh(7); body.querySelector("#lbWT").onclick = () => { S.wk = null; load(); };
    body.querySelector("#lbWM").onclick = () => { S.wkMode = S.wkMode === "grid" ? "table" : "grid"; load(); };
  };

  /* ---------- سجل التحديثات الموحد ---------- */
  const logView = async () => {
    const f = S.feed, LIM = 30;
    const r = await rpc("lb_feed", { p_from: f.from ? new Date(f.from + "T00:00:00+03:00").toISOString() : null, p_to: f.to ? new Date(f.to + "T23:59:59+03:00").toISOString() : null, p_sys: f.sys || null, p_kind: f.kind || null, p_op: f.op || null, p_ach: null, p_limit: LIM, p_offset: f.off });
    const it = r.items || [], tot = Number(r.total || 0);
    const opt = (o, v) => Object.entries(o).map(([k, n]) => `<option value="${k}" ${v === k ? "selected" : ""}>${esc(Array.isArray(n) ? n[0] : n)}</option>`).join("");
    body.innerHTML = `<div class="cd"><h4>سجل التحديثات الموحد <small class="mt">${num(tot)} سجل</small></h4>
      <div class="fl"><select id="fS"><option value="">كل الأنظمة</option>${opt(SYS, f.sys)}</select><select id="fK"><option value="">كل الأنواع</option>${opt(KIND, f.kind)}</select><select id="fO"><option value="">جديد ومعدل</option>${opt(OP, f.op)}</select><input type="date" id="fF" value="${esc(f.from)}" aria-label="من"><input type="date" id="fT" value="${esc(f.to)}" aria-label="إلى"></div>
      ${it.length ? `<div class="tw"><table><thead><tr><th>العملية</th><th>الوصف</th><th>النظام</th><th>المسؤول</th><th>التاريخ والوقت</th></tr></thead><tbody>${it.map((x) => `<tr><td><span class="st ${x.op === "new" ? "g" : "b"}">${esc(OP[x.op] || x.op)}</span><div class="mt">${esc(KIND[x.kind] || x.kind)}</div></td><td>${lnk(x.link, x.title)}${x.detail ? `<div class="mt">${esc(x.detail)}</div>` : ""}</td><td>${sysB(x.sys)}</td><td>${esc(x.actor || "—")}</td><td>${dt(x.at)}</td></tr>`).join("")}</tbody></table></div>` : em("لا سجلات مطابقة للتصفية.")}
      <div class="fl" style="margin-top:10px;justify-content:center"><button class="btn sec sm" id="fP" type="button" ${f.off === 0 ? "disabled" : ""}>السابق</button><span style="align-self:center" class="mt">${tot ? f.off + 1 : 0} – ${Math.min(f.off + LIM, tot)} من ${num(tot)}</span><button class="btn sec sm" id="fN" type="button" ${f.off + LIM >= tot ? "disabled" : ""}>التالي</button></div></div>`;
    const bind = (id, k) => (body.querySelector(id).onchange = (e) => { f[k] = e.target.value; f.off = 0; load(); });
    bind("#fS", "sys"); bind("#fK", "kind"); bind("#fO", "op"); bind("#fF", "from"); bind("#fT", "to");
    body.querySelector("#fP").onclick = () => { f.off = Math.max(0, f.off - LIM); load(); }; body.querySelector("#fN").onclick = () => { f.off += LIM; load(); };
  };

  async function load(silent) {
    if (!silent) body.innerHTML = em("جارٍ التحميل…");
    try { await ({ day: dayView, week: weekView, log: logView })[S.view](); ok = true; last = new Date(); }
    catch (e) { ok = false; if (!silent || !body.children.length || body.querySelector(".em")) body.innerHTML = em(e && e.code === "42501" ? "هذه النافذة متاحة لمنسوبي المدرسة المفعلة حساباتهم." : "تعذر تحميل البيانات حالياً. حاول التحديث بعد قليل."); }
    setStatus();
  }
  m.querySelectorAll(".tg [data-v]").forEach((b) => (b.onclick = () => { S.view = b.dataset.v; m.querySelectorAll(".tg [data-v]").forEach((x) => x.classList.toggle("on", x === b)); load(); }));
  m.querySelector("#lbR").onclick = () => load();
  timer = setInterval(() => { if (!document.hidden && S.view !== "log") load(true); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(true); });
  await load();
}
