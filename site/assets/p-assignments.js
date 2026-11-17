// التكليفات: القائمة، وملف تكليفات الموظف (?staff=)
boot("assignments.html", async (m, c) => {
  const mgr = c.can("assignments:manage"), sid = qs("staff");
  const [aQ, sQ] = await Promise.all([
    sb.from("assignments").select("*,assignment_versions(*)").order("created_at", { ascending: false }),
    sb.from("staff_members").select("id,full_name,job_title,is_active,job_titles(name_ar)").order("full_name")]);
  for (const q of [aQ, sQ]) if (q.error) throw q.error;
  const A = aQ.data, ST = sQ.data, S = (i) => ST.find((s) => s.id === i), nm = (i) => S(i)?.full_name || "—";
  const link = (a, t) => `<a href="assignment.html?id=${a.id}">${esc(t)}</a>`;
  const supOf = (a) => { const v = ASG.issued(a) || ASG.latest(a); return v?.supervisor_id; };

  // ملف تكليفات موظف
  if (sid) {
    if (!mgr && sid !== c.me.id) { location.replace("assignments.html"); return; }
    const s = S(sid), L = A.filter((a) => a.staff_id === sid);
    const cur = L.filter((a) => ["active", "pending", "draft"].includes(ASG.state(a)[2])), old = L.filter((a) => !cur.includes(a));
    const sec = (list, empty) => list.length ? `<div class="tw"><table><thead><tr><th>الرقم</th><th>المسمى</th><th>النوع</th><th>المدة</th><th>المتابع</th><th>الحالة</th><th>الإقرار</th><th>الإصدارات</th></tr></thead><tbody>${list.map((a) => { const v = ASG.issued(a) || ASG.latest(a);
      return `<tr><td>${esc(a.assignment_no)}</td><td>${link(a, v?.title || a.title)}</td><td>${a.kind === "primary" ? "أساسي" : "فرعي"}</td><td>${ASG.period(v)}</td><td>${esc(nm(supOf(a)))}</td><td>${ASG.badge(a)}</td><td>${v?.ack_at ? fmtT(v.ack_at) : "—"}</td><td>${a.assignment_versions.filter((x) => x.issued_at).length}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="sub">${empty}</p>`;
    const prim = cur.filter((a) => a.kind === "primary"), subs = cur.filter((a) => a.kind === "secondary");
    m.innerHTML = head("ملف تكليفات الموظف", s ? `${s.full_name} – ${s.job_titles?.name_ar || ""}` : "") +
      `<div class="acts noprint">${mgr ? `<a class="btn" href="assignment.html?new=1&staff=${sid}">تكليف جديد</a>` : ""}<a class="btn sec" href="assignments.html">كل التكليفات</a><button class="btn sec" id="pr" type="button">طباعة</button></div>
       <div class="card mt"><h3 class="sec" style="margin-top:0">الوظيفة الأساسية</h3>${sec(prim, "لا يوجد تكليف أساسي مسجّل لهذا الموظف.")}</div>
       <div class="card mt"><h3 class="sec" style="margin-top:0">التكليفات الفرعية الحالية</h3>${sec(subs, "لا توجد تكليفات فرعية حالية.")}</div>
       <div class="card mt"><h3 class="sec" style="margin-top:0">التكليفات السابقة والمنتهية</h3>${sec(old, "لا توجد تكليفات سابقة.")}</div>`;
    m.querySelector("#pr").onclick = () => window.print(); return;
  }

  let tab = mgr ? "all" : "mine", q = "", kind = "";
  const isSup = (a) => a.assignment_versions.some((v) => v.issued_at && v.supervisor_id === c.me.id);
  const TABS = [...(mgr ? [["all", "الكل"], ["pending", "بانتظار الاطلاع"], ["active", "جارية"], ["closed", "منتهية وملغاة"], ["draft", "مسودات"]] : []), ["mine", "تكليفاتي"], ["sup", "أتابعها"]];
  const pick = () => A.filter((a) => {
    const g = ASG.state(a)[2], v = ASG.issued(a) || ASG.latest(a);
    if (tab === "mine" ? a.staff_id !== c.me.id : tab === "sup" ? !isSup(a) : tab !== "all" && g !== tab) return false;
    if (kind && a.kind !== kind) return false;
    return !q || [a.assignment_no, a.title, nm(a.staff_id), nm(v?.supervisor_id)].join(" ").includes(q); });
  function paint() {
    const L = pick();
    m.innerHTML = head(c.staffOnly ? "تكليفاتي" : "التكليفات", "إدارة التكليفات الأساسية والفرعية وتوثيق اطلاع الموظف وإقراره ومتابعة التنفيذ.") +
      `<div class="acts noprint">${mgr ? `<a class="btn" href="assignment.html?new=1">تكليف جديد</a><button class="btn sec" id="ti" type="button">مسميات التكليفات الفرعية</button>` : ""}<button class="btn sec" id="ex" type="button">تصدير Excel</button></div>
       <div class="tabs mt" role="tablist">${TABS.map(([k, n]) => `<button type="button" data-t="${k}" class="${tab === k ? "on" : ""}">${n}${["all", "pending", "active", "closed", "draft"].includes(k) ? ` (${A.filter((a) => k === "all" || ASG.state(a)[2] === k).length})` : ""}</button>`).join("")}</div>
       <div class="card mt"><div class="fg"><div><label for="sq">بحث</label><input id="sq" value="${esc(q)}" placeholder="الرقم أو المسمى أو الموظف أو المتابع"></div>
         <div><label for="sk">النوع</label><select id="sk"><option value="">الكل</option><option value="primary" ${kind === "primary" ? "selected" : ""}>أساسي</option><option value="secondary" ${kind === "secondary" ? "selected" : ""}>فرعي</option></select></div></div></div>
       <div class="tw mt"><table><thead><tr><th>الرقم</th><th>الموظف</th><th>النوع</th><th>المسمى</th><th>المدة</th><th>المتابع</th><th>الحالة</th></tr></thead><tbody>${L.map((a) => { const v = ASG.issued(a) || ASG.latest(a);
        return `<tr><td>${link(a, a.assignment_no)}</td><td><a href="assignments.html?staff=${a.staff_id}">${esc(nm(a.staff_id))}</a></td><td>${a.kind === "primary" ? "أساسي" : "فرعي"}</td><td>${esc(v?.title || a.title)}</td><td>${ASG.period(v)}</td><td>${esc(nm(v?.supervisor_id))}</td><td>${ASG.badge(a)}</td></tr>`; }).join("") || '<tr><td colspan="7">لا توجد تكليفات في هذا العرض.</td></tr>'}</tbody></table></div>`;
    m.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { tab = b.dataset.t; paint(); }));
    m.querySelector("#sq").oninput = (e) => { q = e.target.value.trim(); const p = e.target.selectionStart; paint(); const n = m.querySelector("#sq"); n.focus(); n.setSelectionRange(p, p); };
    m.querySelector("#sk").onchange = (e) => { kind = e.target.value; paint(); };
    m.querySelector("#ex").onclick = () => exportXlsx("التكليفات", ["الرقم", "الموظف", "النوع", "المسمى", "البداية", "النهاية", "المتابع", "الحالة", "تاريخ الإقرار"], L.map((a) => { const v = ASG.issued(a) || ASG.latest(a);
      return [a.assignment_no, nm(a.staff_id), ASG.kind[a.kind], v?.title || a.title, v?.start_date || "", v?.end_date || "", nm(v?.supervisor_id), ASG.state(a)[0], v?.ack_at ? fmtT(v.ack_at) : ""]; }));
    const ti = m.querySelector("#ti"); if (ti) ti.onclick = titles;
  }
  // مسميات التكليفات الفرعية: إضافة وتعديل وإخفاء
  async function titles() {
    const { data, error } = await sb.from("assignment_titles").select("*").order("sort_order").order("name");
    if (error) { toast(mapErr(error), true); return; }
    const md = modal(`<h3>مسميات التكليفات الفرعية</h3><div id="tl">${data.map((t) => `<div class="row2 item"><span><input data-n="${t.id}" value="${esc(t.name)}" style="min-width:240px"> <select data-k="${t.id}">${opts(ASG.nature, t.nature)}</select></span><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-a="${t.id}" style="width:auto" ${t.is_active ? "checked" : ""}>فعّال</label></div>`).join("")}</div>
      <h3 class="sec">إضافة مسمى</h3><div class="fg"><div><input id="nn" placeholder="مثال: منسق الأنشطة الطلابية"></div><div><select id="nk">${opts(ASG.nature)}</select></div></div><p class="err" id="te" role="alert"></p>
      <div class="acts mt"><button class="btn" id="ad" type="button">إضافة</button><button class="btn sec" id="cx" type="button">إغلاق</button></div>`, true);
    const e = md.el, up = async (id, patch) => { const r = await sb.from("assignment_titles").update(patch).eq("id", id); r.error ? toast(mapErr(r.error), true) : toast("حُفظ"); };
    e.querySelectorAll("[data-n]").forEach((x) => (x.onchange = () => x.value.trim() && up(x.dataset.n, { name: x.value.trim() })));
    e.querySelectorAll("[data-k]").forEach((x) => (x.onchange = () => up(x.dataset.k, { nature: x.value })));
    e.querySelectorAll("[data-a]").forEach((x) => (x.onchange = () => up(x.dataset.a, { is_active: x.checked })));
    e.querySelector("#ad").onclick = async () => { const n = e.querySelector("#nn").value.trim(); if (!n) return; const r = await sb.from("assignment_titles").insert({ name: n, nature: e.querySelector("#nk").value, sort_order: 99 });
      if (r.error) { e.querySelector("#te").textContent = /duplicate/.test(r.error.message) ? "المسمى موجود." : mapErr(r.error); return; } md.close(); titles(); };
    e.querySelector("#cx").onclick = md.close;
  }
  paint();
});
