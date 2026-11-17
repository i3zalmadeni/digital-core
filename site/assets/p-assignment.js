// نموذج تكليف واحد: إنشاء/تحديث، إصدار، إقرار الموظف، إصدارات، متابعة، طباعة
boot("assignment.html", async (m, c) => {
  const $ = (q, r = m) => r.querySelector(q), id = qs("id"), mgr = c.can("assignments:manage");
  const stQ = await sb.from("staff_members").select("id,full_name,job_title,is_active,job_titles(name_ar)").order("full_name");
  if (stQ.error) throw stQ.error;
  const ST = stQ.data, nm = (i) => ST.find((s) => s.id === i)?.full_name || "—";
  const rpc = async (fn, args) => { const r = await sb.rpc(fn, args); if (r.error) throw r.error; return r.data; };
  const staffOpts = (sel, onlyActive) => `<option value="">— اختر —</option>${ST.filter((s) => !onlyActive || s.is_active || s.id === sel).map((s) => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc(s.full_name)}${s.job_titles?.name_ar ? " — " + esc(s.job_titles.name_ar) : ""}</option>`).join("")}`;

  if (!id) { if (!mgr) { location.replace("assignments.html"); return; } await form(null); return; }
  await show();

  async function load() {
    const [a, f] = await Promise.all([sb.from("assignments").select("*,assignment_versions(*)").eq("id", id).maybeSingle(), sb.from("assignment_followups").select("*").eq("assignment_id", id).order("created_at", { ascending: false })]);
    if (a.error) throw a.error; return { a: a.data, F: f.data || [] };
  }

  // نموذج الإنشاء والتعديل (التعديل بعد الإصدار ينشئ إصداراً جديداً)
  async function form(a) {
    const v = a ? ASG.latest(a) : null, tQ = await sb.from("assignment_titles").select("*").eq("is_active", true).order("sort_order");
    const T = tQ.data || []; let atts = [...(v?.attachments || [])];
    // الدليل التنظيمي (للتعبئة التلقائية) والعام الدراسي الحالي (للتواريخ الافتراضية)
    const [gjQ, gaQ, gdQ, yrQ] = a ? [{}, {}, {}, {}] : await Promise.all([sb.from("guide_jobs").select("id,code,title,subtitle,objective").order("sort_order"), sb.from("guide_assignments").select("id,title,full_title,objective").order("sort_order"),
      sb.from("guide_duties").select("job_id,assignment_id,seq,body").order("seq"), sb.from("academic_years").select("starts_on,ends_on").eq("status", "current").maybeSingle()]);
    const GJ = gjQ.data || [], GA = gaQ.data || [], GD = gdQ.data || [], YR = yrQ.data || null;
    const newVer = a && v?.issued_at, pre = qs("staff") || "";
    m.innerHTML = head(a ? (newVer ? `تحديث التكليف ${a.assignment_no}` : `تعديل مسودة ${a.assignment_no}`) : "تكليف جديد", newVer ? "سيُنشأ إصدار جديد ويُحفظ السابق كاملاً، ولا يسري إلا بعد اطلاع الموظف وإقراره." : "احفظه مسودة ثم أصدره ليصل إشعاراً للموظف.") +
      `<form class="card" id="f"><div class="fg">
        <div><label>نوع التكليف</label><select id="kd" ${a ? "disabled" : ""}><option value="primary" ${a?.kind === "primary" ? "selected" : ""}>أساسي (الوظيفة)</option><option value="secondary" ${a?.kind !== "primary" ? "selected" : ""}>فرعي (مهمة إضافية)</option></select></div>
        <div id="nw"><label>طبيعة التكليف الفرعي</label><select id="nt">${opts(ASG.nature, a?.nature || "extra_task")}</select></div>
        <div><label>الموظف المكلف</label><select id="st" ${a ? "disabled" : ""} required>${staffOpts(a?.staff_id || pre, true)}</select></div>
        <div><label>المسمى الوظيفي الأساسي</label><input id="jt" disabled></div>
        ${a ? "" : `<div class="full"><label id="gl">الوظيفة من الدليل التنظيمي</label><select id="gp"></select><small class="sub">عند الاختيار يُعبَّأ المسمى والوصف والأهداف والمهام تلقائيًا من الدليل، ويمكنك تعديلها قبل الحفظ.</small></div>`}
        <div class="full"><label>مسمى التكليف</label><input id="ti" list="tl" value="${esc(v?.title || "")}" required><datalist id="tl">${T.map((t) => `<option value="${esc(t.name)}" data-n="${t.nature}">`).join("")}</datalist></div>
        <div class="full"><label>وصف التكليف وأهدافه</label><textarea id="ds" rows="3">${esc(v?.description || "")}</textarea></div>
        <div class="full"><label>المهام والمسؤوليات (كل مهمة في سطر)</label><textarea id="tk" rows="7">${esc(v?.tasks || "")}</textarea></div>
        <div><label>تاريخ البداية</label><input id="sd" type="date" value="${v?.start_date || ""}" required></div>
        <div><label>تاريخ النهاية</label><input id="ed" type="date" value="${v?.end_date || ""}" required></div>
        <div class="full"><label>المسؤول المباشر عن المتابعة</label><select id="sp" required>${staffOpts(v?.supervisor_id, true)}</select></div>
        <div class="full"><label>التوجيهات والملاحظات</label><textarea id="nn" rows="2">${esc(v?.notes || "")}</textarea></div>
        <div class="full"><label>المرفقات والقرارات والمستندات</label>${a ? `<input type="file" id="fl" accept=".pdf,.png,.jpg,.jpeg,.docx" style="width:auto"><div id="al"></div>` : '<p class="sub" style="margin:0">تُرفع المرفقات بعد حفظ المسودة الأولى.</p>'}</div>
      </div><p class="err" id="fe" role="alert"></p>
      <div class="acts mt"><button class="btn" id="sv" type="submit">${newVer ? "حفظ كإصدار جديد" : "حفظ كمسودة"}</button><a class="btn sec" href="${a ? "assignment.html?id=" + a.id : "assignments.html"}">إلغاء</a></div></form>`;
    const gp = $("#gp"), dutyLines = (key, id) => GD.filter((d) => d[key] === id).sort((x, y) => x.seq - y.seq).map((d) => d.body.replace(/\s+/g, " ").trim()).join("\n");
    const gOpts = () => { const p = $("#kd").value === "primary"; $("#gl").textContent = p ? "الوظيفة من الدليل التنظيمي" : "التكليف أو اللجنة من الدليل التنظيمي";
      gp.innerHTML = '<option value="">— بدون تعبئة تلقائية —</option>' + (p ? GJ.map((g) => `<option value="${g.code}">${esc(g.title)}</option>`) : GA.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`)).join(""); };
    const gFill = () => { if (!gp || !gp.value) return; const p = $("#kd").value === "primary";
      if (p) { const g = GJ.find((x) => x.code === gp.value); if (!g) return; $("#ti").value = g.title; $("#ds").value = [g.subtitle, g.objective].filter(Boolean).join("\n\n"); $("#tk").value = dutyLines("job_id", g.id); }
      else { const g = GA.find((x) => x.id === gp.value); if (!g) return; $("#ti").value = g.title; $("#ds").value = [g.full_title && g.full_title !== g.title ? g.full_title : "", g.objective].filter(Boolean).join("\n\n"); $("#tk").value = dutyLines("assignment_id", g.id); } };
    const sync = (fromStaff) => { const p = $("#kd").value === "primary"; $("#nw").style.display = p ? "none" : ""; const s = ST.find((x) => x.id === $("#st").value); $("#jt").value = s?.job_titles?.name_ar || "";
      if (p && s && !$("#ti").value) $("#ti").value = s.job_titles?.name_ar || "";
      // اختيار وظيفة الموظف من الدليل تلقائيًا إن وُجدت مطابقة لها
      if (gp && fromStaff === true && p && s && GJ.some((g) => g.code === s.job_title)) { gp.value = s.job_title; gFill(); } };
    if (gp) { gOpts(); gp.onchange = gFill; if (YR) { $("#sd").value = $("#sd").value || YR.starts_on; $("#ed").value = $("#ed").value || YR.ends_on; } }
    $("#kd").onchange = () => { if (gp) { gOpts(); } sync(true); }; $("#st").onchange = () => sync(true); sync();
    $("#ti").onchange = () => { const t = T.find((x) => x.name === $("#ti").value); if (t) $("#nt").value = t.nature; };
    const paintA = async () => { const h = $("#al"); if (!h) return; h.innerHTML = (await Promise.all(atts.map(async (x, i) => { const u = (await sb.storage.from("assignment-files").createSignedUrl(x.path, 3600)).data?.signedUrl; return `<div class="row2 item"><a href="${esc(u || "#")}" target="_blank" rel="noopener">${esc(x.name)}</a><button type="button" class="btn sm bad" data-rm="${i}">إزالة</button></div>`; }))).join("");
      h.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { atts.splice(+b.dataset.rm, 1); paintA(); })); };
    if (a) { paintA(); $("#fl").onchange = async (e) => { const f = e.target.files[0]; if (!f) return;
      if (f.size > 10 * 1024 * 1024) { toast("الملف أكبر من 10 ميجابايت", true); return; }
      const path = `${a.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${(f.name.split(".").pop() || "bin").toLowerCase()}`;
      const r = await sb.storage.from("assignment-files").upload(path, f, { contentType: f.type || undefined }); if (r.error) { toast(mapErr(r.error), true); return; }
      atts.push({ name: f.name, path }); e.target.value = ""; paintA(); }; }
    $("#f").onsubmit = async (e) => { e.preventDefault(); const b = $("#sv"), er = $("#fe"); er.textContent = ""; b.disabled = true;
      const prim = $("#kd").value === "primary", title = $("#ti").value.trim();
      try {
        const nid = await rpc("assignment_save", { p_id: a?.id || null, p: { kind: $("#kd").value, nature: prim ? "" : $("#nt").value, staff_id: $("#st").value, title, description: $("#ds").value, tasks: $("#tk").value, start_date: $("#sd").value, end_date: $("#ed").value, supervisor_id: $("#sp").value, notes: $("#nn").value, attachments: atts } });
        if (!prim && !T.some((t) => t.name === title)) await sb.from("assignment_titles").insert({ name: title, nature: $("#nt").value, sort_order: 99 });
        toast("حُفظ التكليف"); location.href = "assignment.html?id=" + nid;
      } catch (x) { er.textContent = /assignments_one_primary/.test(x.message) ? "للموظف تكليف أساسي قائم. أغلقه أولاً أو عدّله." : mapErr(x); b.disabled = false; } };
  }

  async function show() {
    const { a, F } = await load();
    if (!a) { m.innerHTML = '<div class="card"><p class="sub" style="margin:0">التكليف غير موجود أو لا تملك صلاحية عرضه.</p><div class="acts mt"><a class="btn" href="assignments.html">العودة للتكليفات</a></div></div>'; return; }
    if (qs("edit") && mgr && !["cancelled", "ended"].includes(a.status)) { await form(a); return; }
    const V = ASG.vers(a), iv = ASG.issued(a), lat = ASG.latest(a), want = Number(qs("v")) || (mgr ? lat.version_no : iv?.version_no);
    const v = V.find((x) => x.version_no === want) || V[0], me = c.me.id, isStaff = a.staff_id === me, isSup = V.some((x) => x.issued_at && x.supervisor_id === me);
    const pendingAck = isStaff && a.status === "issued" && iv && !iv.ack_at, closed = ["cancelled", "ended"].includes(a.status), drafting = mgr && lat && !lat.issued_at;
    const anyAck = V.some((x) => x.ack_at), canFollow = (mgr || isSup) && a.status === "issued" && anyAck;
    const att = await Promise.all((v.attachments || []).map(async (x) => `<li><a href="${esc((await sb.storage.from("assignment-files").createSignedUrl(x.path, 3600)).data?.signedUrl || "#")}" target="_blank" rel="noopener">${esc(x.name)}</a></li>`));
    const stf = ST.find((s) => s.id === a.staff_id);
    m.innerHTML = head(`${a.kind === "primary" ? "تكليف أساسي" : "تكليف فرعي"}: ${v.title}`, `رقم ${a.assignment_no} · ${stf?.full_name || ""}`) +
      `<div class="acts noprint"><a class="btn sec" href="assignments.html">كل التكليفات</a><a class="btn sec" href="assignments.html?staff=${a.staff_id}">ملف الموظف</a><button class="btn sec" id="pr" type="button">طباعة</button>
        ${mgr && !closed ? `<a class="btn" href="assignment.html?id=${a.id}&edit=1">${a.status === "draft" ? "تعديل" : "تحديث (إصدار جديد)"}</a>` : ""}
        ${drafting ? `<button class="btn" id="is" type="button">${a.status === "draft" ? "إصدار التكليف" : "إصدار التحديث"}</button>` : ""}
        ${mgr && a.status === "issued" ? '<button class="btn sec" id="en" type="button">إنهاء</button>' : ""}${mgr && !closed ? '<button class="btn bad" id="cn" type="button">إلغاء</button>' : ""}${mgr && a.status === "draft" ? '<button class="btn bad" id="dl" type="button">حذف المسودة</button>' : ""}</div>
      ${drafting && a.status === "issued" ? '<div class="alert mt noprint">يوجد إصدار محدّث لم يُصدر بعد؛ لا يراه الموظف ولا يسري حتى يُصدر ويقرّ به.</div>' : ""}
      ${a.status === "cancelled" ? `<div class="alert mt">أُلغي هذا التكليف${a.cancelled_reason ? ": " + esc(a.cancelled_reason) : ""}.</div>` : ""}
      <div class="card mt asg-doc"><div class="row2"><h3 style="margin:0">${esc(v.title)}</h3>${ASG.badge(a)}</div>
        <div class="fg mt">${[["الموظف المكلف", nm(a.staff_id)], ["المسمى الوظيفي الأساسي", stf?.job_titles?.name_ar || "—"], ["نوع التكليف", ASG.kind[a.kind] + (a.nature ? " – " + ASG.nature[a.nature] : "")], ["المدة", ASG.period(v)], ["المسؤول المباشر عن المتابعة", nm(v.supervisor_id)], ["حالة التنفيذ", ASG.exec[a.exec_status]], ["الإصدار", `${v.version_no}${v.issued_at ? " · صدر " + fmtT(v.issued_at) : " · مسودة"}`], ["الإقرار", v.ack_at ? "أقرّ " + fmtT(v.ack_at) : v.issued_at ? "لم يقرّ بعد" : "—"]].map(([k, x]) => `<div><small class="sub">${k}</small><br><b>${esc(x)}</b></div>`).join("")}</div>
        <h3 class="sec">الوصف والأهداف</h3><p>${esc(v.description || "—")}</p><h3 class="sec">المهام والمسؤوليات</h3>${ASG.tasks(v.tasks)}
        ${v.notes ? `<h3 class="sec">التوجيهات والملاحظات</h3><p>${esc(v.notes)}</p>` : ""}${att.length ? `<h3 class="sec">المرفقات</h3><ul>${att.join("")}</ul>` : ""}
        <div class="asg-sign"><span>اعتماد المدير: ${esc(v.issued_by ? nm(v.issued_by) : "—")}</span><span>إقرار الموظف: ${v.ack_at ? esc(nm(a.staff_id)) + " – " + fmtT(v.ack_at) : "—"}</span></div></div>
      ${pendingAck && v.version_no === iv.version_no ? `<div class="card mt noprint" id="ak"><h3 class="sec" style="margin-top:0">إقرار الاطلاع والالتزام</h3><p class="sub">يُسجَّل تاريخ ووقت إقرارك وإصدار التكليف الذي اطلعت عليه.</p>
        ${["اطلعت على محتوى التكليف كاملاً.", "أوافق على ما ورد فيه.", "أقرّ بالتزامي بتنفيذ المهام والمسؤوليات المحددة.", "علمت بمدة التكليف والمسؤول المباشر عن متابعته."].map((t) => `<label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" class="ck" style="width:auto">${t}</label>`).join("")}
        <p class="err" id="ae" role="alert"></p><div class="acts mt"><button class="btn" id="ok" type="button" disabled>أقرّ وأوافق</button></div></div>` : pendingAck ? `<div class="alert mt noprint">يوجد إصدار أحدث بانتظار إقرارك. <a href="assignment.html?id=${a.id}"><b>افتحه</b></a>.</div>` : ""}
      ${canFollow ? `<div class="card mt noprint"><h3 class="sec" style="margin-top:0">متابعة التنفيذ</h3><div class="fg"><div><label>حالة التنفيذ</label><select id="fx"><option value="">بدون تغيير</option>${opts(ASG.exec, "")}</select></div><div><label>مستوى الإنجاز %</label><input id="fp" type="number" min="0" max="100"></div><div class="full"><label>ملاحظة أو توجيه</label><textarea id="fn" rows="2"></textarea></div></div><p class="err" id="fe" role="alert"></p><div class="acts mt"><button class="btn" id="fs" type="button">تسجيل المتابعة</button></div></div>` : ""}
      ${F.length ? `<div class="card mt"><h3 class="sec" style="margin-top:0">سجل المتابعة</h3>${F.map((x) => `<div class="item"><small class="sub">${fmtT(x.created_at)} · ${esc(nm(x.author_id))} · الإصدار ${x.version_no}</small><div>${x.exec_status ? `<span class="badge">${esc(ASG.exec[x.exec_status])}</span> ` : ""}${x.progress != null ? `<b>${x.progress}%</b> ` : ""}${esc(x.note || "")}</div></div>`).join("")}</div>` : ""}
      <div class="card mt noprint"><h3 class="sec" style="margin-top:0">سجل الإصدارات</h3><div class="tw"><table><thead><tr><th>الإصدار</th><th>المسمى</th><th>المدة</th><th>أصدره</th><th>تاريخ الإصدار</th><th>إقرار الموظف</th><th></th></tr></thead><tbody>${V.map((x) => `<tr><td>${x.version_no}</td><td>${esc(x.title)}</td><td>${ASG.period(x)}</td><td>${esc(x.issued_by ? nm(x.issued_by) : "—")}</td><td>${x.issued_at ? fmtT(x.issued_at) : "مسودة"}</td><td>${x.ack_at ? fmtT(x.ack_at) : x.issued_at ? "بانتظار الإقرار" : "—"}</td><td><a href="assignment.html?id=${a.id}&v=${x.version_no}">${x.version_no === v.version_no ? "معروض" : "عرض"}</a></td></tr>`).join("")}</tbody></table></div></div>`;
    $("#pr").onclick = () => window.print();
    const act = (sel, fn, ok) => { const b = $(sel); if (b) b.onclick = async () => { b.disabled = true; try { await fn(); toast(ok); show(); } catch (e) { toast(mapErr(e), true); b.disabled = false; } }; };
    act("#is", () => rpc("assignment_issue", { p_id: a.id }), "أُصدر التكليف وأُرسل إشعار للموظف");
    act("#en", () => { if (!confirm("إنهاء هذا التكليف؟")) throw new Error("لم يُنفَّذ"); return rpc("assignment_close", { p_id: a.id, p_action: "end", p_reason: null }); }, "أُنهي التكليف");
    act("#cn", () => { const r = prompt("سبب الإلغاء (اختياري)"); if (r === null) throw new Error("لم يُنفَّذ"); return rpc("assignment_close", { p_id: a.id, p_action: "cancel", p_reason: r }); }, "أُلغي التكليف");
    const dl = $("#dl"); if (dl) dl.onclick = async () => { if (!confirm("حذف المسودة نهائياً؟")) return; try { await rpc("assignment_delete_draft", { p_id: a.id }); location.href = "assignments.html"; } catch (e) { toast(mapErr(e), true); } };
    const ok = $("#ok"); if (ok) { const cks = [...m.querySelectorAll(".ck")]; cks.forEach((k) => (k.onchange = () => (ok.disabled = !cks.every((x) => x.checked))));
      ok.onclick = async () => { ok.disabled = true; try { await rpc("assignment_acknowledge", { p_id: a.id }); toast("سُجّل إقرارك"); show(); } catch (e) { $("#ae").textContent = mapErr(e); ok.disabled = false; } }; }
    const fs = $("#fs"); if (fs) fs.onclick = async () => { fs.disabled = true; try { await rpc("assignment_followup", { p_id: a.id, p_note: $("#fn").value, p_progress: $("#fp").value === "" ? null : Number($("#fp").value), p_exec: $("#fx").value || null }); toast("سُجّلت المتابعة"); show(); } catch (e) { $("#fe").textContent = mapErr(e); fs.disabled = false; } };
  }
}, { title: "التكليف", desc: "نموذج التكليف وإصداراته وإقرار الموظف ومتابعة التنفيذ" });
