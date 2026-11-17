// دليل الوظائف والتكليفات المدرسية: المرجع هو الدليل التنظيمي (دليل الأهداف والمهام). الوظائف والتكليفات قائمتان منفصلتان.
boot("guide.html", async (m, c) => {
  const mgr = c.can("assignments:manage");
  const [jQ, aQ, dQ, lQ] = await Promise.all([
    sb.from("guide_jobs").select("*").order("sort_order"),
    sb.from("guide_assignments").select("*").order("sort_order"),
    sb.from("guide_duties").select("*").order("seq"),
    sb.from("guide_assignment_links").select("*").order("seq")]);
  for (const q of [jQ, aQ, dQ, lQ]) if (q.error) throw q.error;
  const J = jQ.data, A = aQ.data, D = dQ.data, LK = lQ.data;
  const KIND = { committee: "لجنة", team: "فريق عمل", org_unit: "وحدة تنظيمية" };
  const dutiesOf = (t, id) => D.filter((d) => (t === "job" ? d.job_id : d.assignment_id) === id).sort((a, b) => a.seq - b.seq);
  const linksOfA = (id) => LK.filter((l) => l.assignment_id === id).sort((a, b) => a.seq - b.seq);
  const assignmentsOfJob = (id) => A.filter((a) => LK.some((l) => l.assignment_id === a.id && l.job_id === id));
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const ul = (arr) => (arr && arr.length ? `<ul class="gd-ul">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  const sec = (title, html) => (html ? `<h3 class="gd-sec">${title}</h3>${html}` : "");
  const txt = (s) => (s ? `<p style="margin:0;line-height:1.9">${esc(s)}</p>` : "");

  let tab = qs("t") === "assignment" ? "assignment" : "job", sel = qs("id"), q = "", kind = "";
  const hay = (t, r) => {
    const ds = dutiesOf(t, r.id).map((d) => d.body);
    return (t === "job" ? [r.title, r.subtitle, r.objective, r.competencies, ...r.org_link, ...r.min_qualifications, ...r.notes, ...ds]
      : [r.title, r.full_title, r.objective, ...r.org_link, ...r.formation_rules, ...r.meeting_rules, ...r.notes, ...ds, ...linksOfA(r.id).map((l) => l.member_text)]).join(" ");
  };
  const match = (t, r) => !q || hay(t, r).includes(q);
  const list = (t) => (t === "job" ? J : A).filter((r) => match(t, r) && (t === "job" || !kind || r.kind === kind));
  const cur = () => (tab === "job" ? J : A).find((r) => r.id === sel);

  function detail(r) {
    if (!r) return '<div class="card"><p class="sub" style="margin:0">اختر عنصرًا من القائمة لعرض بياناته كاملة.</p></div>';
    const ds = dutiesOf(tab, r.id);
    const dli = ds.map((d) => `<li>${esc(d.body)}${d.original_body === null ? ' <span class="badge">مضافة</span>' : !d.is_original ? ' <span class="badge warn">معدّلة</span>' : ""}${mgr ? `<span class="acts noprint"><button class="btn sec sm" data-de="${d.id}" type="button">تعديل</button><button class="btn sec sm" data-dd="${d.id}" type="button">حذف</button></span>` : ""}</li>`).join("");
    const tasks = sec(`المهام والمسؤوليات (${ds.length})`, ds.length ? `<ol class="gd-ol">${dli}</ol>` : "") + (mgr ? `<div class="acts noprint mt"><button class="btn sm" id="da" type="button">إضافة مهمة</button></div>` : "");
    let body = "";
    if (tab === "job") {
      const rel = assignmentsOfJob(r.id);
      body = sec("الوصف", txt(r.subtitle)) + sec("الأهداف", txt(r.objective)) + sec("الارتباط التنظيمي", ul(r.org_link)) +
        sec("الحد الأدنى من المؤهلات", ul(r.min_qualifications)) + sec("الكفايات", txt(r.competencies)) + tasks +
        sec("التكليفات واللجان المرتبطة", rel.length ? rel.map((a) => `<button class="btn sec sm gd-lk" data-go="${a.id}" type="button">${esc(a.title)}</button>`).join("") : "") + sec("ملاحظات", ul(r.notes));
    } else {
      const ls = linksOfA(r.id);
      const mem = ls.length ? `<div class="tw"><table><thead><tr><th>العضو</th><th>الصفة</th><th>الوظيفة</th>${mgr ? '<th class="noprint"></th>' : ""}</tr></thead><tbody>${ls.map((l) => { const jb = J.find((x) => x.id === l.job_id);
        return `<tr><td>${esc(l.member_text)}</td><td>${esc(l.role_text || "")}</td><td>${jb ? `<a href="#" data-gj="${jb.id}">${esc(jb.title)}</a>` : ""}</td>${mgr ? `<td class="noprint"><button class="btn sec sm" data-lr="${l.id}" type="button">إزالة الربط</button></td>` : ""}</tr>`; }).join("")}</tbody></table></div>` : "";
      body = sec("الوصف", txt(r.full_title && r.full_title !== r.title ? r.full_title : "")) + sec("الأهداف", txt(r.objective)) + sec("الارتباط التنظيمي", ul(r.org_link)) +
        sec("تشكيل اللجنة أو الفريق", ul(r.formation_rules)) + sec("الأعضاء", mem) + sec("الاجتماعات", ul(r.meeting_rules)) + tasks + sec("ملاحظات", ul(r.notes));
    }
    return `<div class="card"><div class="acts noprint" style="float:inline-end"><button class="btn sec sm" id="ex1" type="button">تصدير</button><button class="btn sec sm" id="pr" type="button">طباعة</button>${mgr ? `<button class="btn sec sm" id="ed" type="button">تعديل البيانات</button>${tab === "assignment" && !r.is_original ? '<button class="btn sec sm" id="dl" type="button">حذف التكليف</button>' : ""}` : ""}</div>
      <h2 style="margin-top:0">${esc(r.title)}</h2>${tab === "assignment" ? `<span class="badge">${KIND[r.kind]}</span>` : ""}${body}</div>`;
  }

  function paint() {
    const jl = list("job"), al = list("assignment"), L = tab === "job" ? jl : al;
    if (!sel || !L.some((r) => r.id === sel)) sel = L[0]?.id || null;
    history.replaceState(null, "", `guide.html?t=${tab}${sel ? "&id=" + sel : ""}`);
    m.innerHTML = head("دليل الوظائف والتكليفات", "مرجع المسميات الوظيفية واللجان وفرق العمل ومهامها ومسؤولياتها كما وردت في الدليل التنظيمي.") +
      `<div class="acts noprint">${mgr ? `<button class="btn" id="na" type="button">${tab === "job" ? "إضافة مسمى وظيفي" : "إضافة تكليف"}</button>` : ""}<button class="btn sec" id="exa" type="button">تصدير الكل Excel</button></div>
       <div class="tabs mt" role="tablist"><button type="button" data-t="job" class="${tab === "job" ? "on" : ""}">الوظائف (${jl.length})</button><button type="button" data-t="assignment" class="${tab === "assignment" ? "on" : ""}">التكليفات واللجان (${al.length})</button></div>
       <div class="card mt noprint"><div class="fg"><div><label for="sq">بحث في الدليل</label><input id="sq" value="${esc(q)}" placeholder="العنوان أو الهدف أو نص المهمة"></div>
         ${tab === "assignment" ? `<div><label for="sk">النوع</label><select id="sk"><option value="">الكل</option>${opts(KIND, kind)}</select></div>` : ""}</div></div>
       <div class="gd mt"><div class="gd-list noprint">${L.map((r) => `<button type="button" class="gd-it ${r.id === sel ? "on" : ""}" data-s="${r.id}">${esc(r.title)}${tab === "assignment" ? `<small>${KIND[r.kind]}</small>` : ""}</button>`).join("") || '<p class="sub">لا توجد نتائج.</p>'}</div>
       <div id="dt">${detail(cur())}</div></div>`;
    bind();
  }

  function bind() {
    m.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { tab = b.dataset.t; sel = null; paint(); }));
    m.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { sel = b.dataset.s; paint(); }));
    m.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { tab = "assignment"; sel = b.dataset.go; q = ""; kind = ""; paint(); }));
    m.querySelectorAll("[data-gj]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); tab = "job"; sel = b.dataset.gj; q = ""; paint(); }));
    const sq = m.querySelector("#sq"); sq.oninput = (e) => { q = e.target.value.trim(); const p = e.target.selectionStart; paint(); const n = m.querySelector("#sq"); n.focus(); n.setSelectionRange(p, p); };
    const sk = m.querySelector("#sk"); if (sk) sk.onchange = (e) => { kind = e.target.value; paint(); };
    m.querySelector("#exa").onclick = exportAll;
    const r = cur(); if (!r) return;
    m.querySelector("#ex1").onclick = () => exportOne(r);
    m.querySelector("#pr").onclick = () => window.print();
    if (!mgr) return;
    const reload = () => location.reload();
    const run = async (p, msg) => { const x = await p; if (x.error) { toast(mapErr(x.error), true); return false; } toast(msg || "حُفظ"); setTimeout(reload, 400); return true; };
    m.querySelector("#da").onclick = () => dutyForm(null, r, run);
    m.querySelectorAll("[data-de]").forEach((b) => (b.onclick = () => dutyForm(D.find((d) => d.id === b.dataset.de), r, run)));
    m.querySelectorAll("[data-dd]").forEach((b) => (b.onclick = () => confirm("حذف هذه المهمة؟") && run(sb.rpc("guide_duty_delete", { p_id: b.dataset.dd }), "حُذفت")));
    m.querySelectorAll("[data-lr]").forEach((b) => (b.onclick = () => confirm("إزالة هذا الربط؟") && run(sb.rpc("guide_link_remove", { p_id: b.dataset.lr }), "أُزيل الربط")));
    m.querySelector("#ed").onclick = () => recordForm(r, run);
    const dl = m.querySelector("#dl"); if (dl) dl.onclick = () => confirm("حذف هذا التكليف؟") && run(sb.rpc("guide_assignment_delete", { p_id: r.id }), "حُذف");
    const na = m.querySelector("#na"); if (na) na.onclick = () => recordForm(null, run, tab);
  }

  function dutyForm(d, r, run) {
    const md = modal(`<h3>${d ? "تعديل المهمة" : "إضافة مهمة"}</h3>${d?.original_body && d.original_body !== d.body ? `<p class="sub">النص الأصلي في الدليل: ${esc(d.original_body)}</p>` : ""}
      <div><label for="db">نص المهمة</label><textarea id="db" rows="5">${esc(d?.body || "")}</textarea></div><p class="err" id="de" role="alert"></p>
      <div class="acts mt"><button class="btn" id="ok" type="button">حفظ</button><button class="btn sec" id="cx" type="button">إلغاء</button></div>`);
    md.el.querySelector("#cx").onclick = md.close;
    md.el.querySelector("#ok").onclick = async () => {
      const body = md.el.querySelector("#db").value.trim(); if (!body) { md.el.querySelector("#de").textContent = "نص المهمة مطلوب"; return; }
      if (await run(sb.rpc("guide_duty_save", { p_id: d?.id || null, p_job: d ? null : tab === "job" ? r.id : null, p_assignment: d ? null : tab === "assignment" ? r.id : null, p_body: body })))  md.close();
    };
  }

  function recordForm(r, run, forceTab) {
    const t = forceTab || tab, isJ = t === "job";
    const md = modal(`<h3>${r ? "تعديل البيانات" : isJ ? "إضافة مسمى وظيفي" : "إضافة تكليف"}</h3>
      <div class="fg"><div><label for="f_t">${isJ ? "المسمى الوظيفي" : "عنوان التكليف"}</label><input id="f_t" value="${esc(r?.title || "")}"></div>
      ${isJ ? `<div><label for="f_s">الوصف</label><input id="f_s" value="${esc(r?.subtitle || "")}"></div>` : `<div><label for="f_k">النوع</label><select id="f_k">${opts(KIND, r?.kind || "committee")}</select></div><div><label for="f_f">الوصف</label><input id="f_f" value="${esc(r?.full_title || "")}"></div>`}</div>
      <div><label for="f_o">الأهداف</label><textarea id="f_o" rows="3">${esc(r?.objective || "")}</textarea></div>
      <div><label for="f_l">الارتباط التنظيمي (سطر لكل بند)</label><textarea id="f_l" rows="2">${esc((r?.org_link || []).join("\n"))}</textarea></div>
      <div><label for="f_n">ملاحظات (سطر لكل بند)</label><textarea id="f_n" rows="2">${esc((r?.notes || []).join("\n"))}</textarea></div>
      ${!isJ ? `<h3 class="gd-sec">ربط التكليف بالوظائف</h3><div class="fg">${J.map((j) => `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-jb="${j.id}" style="width:auto" ${r && LK.some((l) => l.assignment_id === r.id && l.job_id === j.id) ? "checked disabled" : ""}> ${esc(j.title)}</label>`).join("")}</div>` : ""}
      <p class="err" id="fe" role="alert"></p><div class="acts mt"><button class="btn" id="ok" type="button">حفظ</button><button class="btn sec" id="cx" type="button">إلغاء</button></div>`, true);
    const e = md.el; e.querySelector("#cx").onclick = md.close;
    e.querySelector("#ok").onclick = async () => {
      const p = { title: e.querySelector("#f_t").value.trim(), objective: e.querySelector("#f_o").value, org_link: lines(e.querySelector("#f_l").value), notes: lines(e.querySelector("#f_n").value) };
      if (!p.title) { e.querySelector("#fe").textContent = "العنوان مطلوب"; return; }
      let res;
      if (isJ) { p.subtitle = e.querySelector("#f_s").value; res = await sb.rpc("guide_job_save", { p_id: r?.id || null, p }); }
      else { p.kind = e.querySelector("#f_k").value; p.full_title = e.querySelector("#f_f").value; p.job_ids = [...e.querySelectorAll("[data-jb]:checked:not(:disabled)")].map((x) => x.dataset.jb); res = await sb.rpc("guide_assignment_save", { p_id: r?.id || null, p }); }
      if (res.error) { e.querySelector("#fe").textContent = mapErr(res.error); return; }
      if (!r && res.data) history.replaceState(null, "", `guide.html?t=${t}&id=${res.data}`);
      toast("حُفظ"); setTimeout(() => location.reload(), 400);
    };
  }

  const rowsOf = (t, r) => {
    const out = [], add = (k, v) => { if (v && String(v).trim()) out.push([k, v]); };
    add("العنوان", r.title);
    if (t === "job") { add("الوصف", r.subtitle); add("الأهداف", r.objective); r.org_link.forEach((x) => add("الارتباط التنظيمي", x)); r.min_qualifications.forEach((x) => add("الحد الأدنى من المؤهلات", x)); add("الكفايات", r.competencies); }
    else { add("النوع", KIND[r.kind]); add("الوصف", r.full_title !== r.title ? r.full_title : ""); add("الأهداف", r.objective); r.org_link.forEach((x) => add("الارتباط التنظيمي", x)); r.formation_rules.forEach((x) => add("تشكيل اللجنة أو الفريق", x)); linksOfA(r.id).forEach((l) => add("عضو", [l.member_text, l.role_text].filter(Boolean).join(" – "))); r.meeting_rules.forEach((x) => add("الاجتماعات", x)); }
    dutiesOf(t, r.id).forEach((d, i) => add(`مهمة ${i + 1}`, d.body));
    r.notes.forEach((x) => add("ملاحظات", x)); return out;
  };
  const exportOne = (r) => exportXlsx(r.title.slice(0, 40), ["البند", "المحتوى"], rowsOf(tab, r));
  const exportAll = () => exportXlsx("دليل-الوظائف-والتكليفات", ["القسم", "العنوان", "رقم المهمة", "المهمة"],
    [["job", J], ["assignment", A]].flatMap(([t, rs]) => rs.flatMap((r) => dutiesOf(t, r.id).map((d, i) => [t === "job" ? "وظيفة" : KIND[r.kind], r.title, i + 1, d.body]))));

  paint();
}, { title: "دليل الوظائف والتكليفات", desc: "المسميات الوظيفية واللجان وفرق العمل ومهامها حسب الدليل التنظيمي", admin: true });
