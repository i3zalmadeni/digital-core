// إسناد التدريس: لكل مادة في كل فصل من فصول العام الحالي معلّم واحد.
// مرجع تقرؤه الأنظمة المستقلة (قيمي وغيره) لمعرفة المتعلمين الذين يدرّسهم كل معلم.
boot("teaching.html", async (m, c) => {
  const $ = (q, r = document) => r.querySelector(q), $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const canEdit = c.can("school:edit");
  const yQ = await sb.from("academic_years").select("id,name").eq("status", "current").maybeSingle();
  const year = yQ.data;
  if (!year) { m.innerHTML = `<div class="card"><p class="sub" style="margin:0">لا يوجد عام دراسي حالي. حدّده أولاً من «المدرسة» ← الأعوام الدراسية.</p></div>`; return; }
  const [sjQ, scQ, gQ, stQ, aQ] = await Promise.all([
    sb.from("subjects").select("*").eq("is_active", true).order("sort_order"),
    sb.from("class_sections").select("id,name,grade_code").eq("year_id", year.id).eq("is_active", true).order("name"),
    sb.from("grade_levels").select("code,name_ar,sort_order").order("sort_order"),
    sb.from("staff_members").select("id,full_name,specialty,category").eq("is_active", true).order("full_name"),
    sb.from("teaching_assignments").select("id,section_id,subject_code,staff_id").eq("year_id", year.id)]);
  for (const q of [sjQ, scQ, gQ, stQ, aQ]) if (q.error) throw q.error;
  const SJ = sjQ.data, G = gQ.data, ST = stQ.data, gs = (code) => G.find((g) => g.code === code)?.sort_order ?? 99;
  const SC = scQ.data.sort((a, b) => gs(a.grade_code) - gs(b.grade_code) || a.name.localeCompare(b.name, "ar"));
  const A = new Map(aQ.data.map((a) => [a.section_id + "|" + a.subject_code, a.staff_id]));
  const nameOf = (id) => ST.find((s) => s.id === id)?.full_name || "";
  const short = (n) => { const p = String(n || "").trim().split(/\s+/).filter((w) => w !== "بن"); return p.length > 2 ? p[0] + " " + p[p.length - 1] : p.join(" "); };
  const gName = (code) => G.find((g) => g.code === code)?.name_ar || code;
  // المعلمون المقترحون لكل مادة: من تخصصهم يقابل المادة أولاً، ثم بقية المعلمين، ثم بقية المنسوبين
  const teachers = ST.filter((s) => s.category === "teaching"), others = ST.filter((s) => s.category !== "teaching");
  const options = (sj, cur) => { const fit = teachers.filter((s) => sj.specialty && s.specialty === sj.specialty), rest = teachers.filter((s) => !fit.includes(s));
    const o = (s) => `<option value="${s.id}" ${s.id === cur ? "selected" : ""}>${esc(s.full_name)}</option>`;
    return `<option value="">— لم يُسند —</option>${fit.length ? `<optgroup label="تخصص ${esc(sj.specialty)}">${fit.map(o).join("")}</optgroup>` : ""}${rest.length ? `<optgroup label="معلمون آخرون">${rest.map(o).join("")}</optgroup>` : ""}${others.length ? `<optgroup label="منسوبون آخرون">${others.map(o).join("")}</optgroup>` : ""}`; };
  let view = qs("v") === "t" ? "t" : "s";

  async function save(section, subject, staff) {
    const k = section + "|" + subject;
    const r = staff ? await sb.from("teaching_assignments").upsert({ section_id: section, subject_code: subject, staff_id: staff }, { onConflict: "section_id,subject_code" })
      : await sb.from("teaching_assignments").delete().eq("section_id", section).eq("subject_code", subject);
    if (r.error) throw r.error;
    staff ? A.set(k, staff) : A.delete(k);
  }

  function paint() {
    const total = SC.length * SJ.length, done = A.size, who = new Set(A.values());
    m.innerHTML = head("إسناد التدريس", `العام الدراسي ${year.name}. لكل مادة في كل فصل معلّم واحد، وتعتمد عليه الأنظمة المستقلة في إظهار متعلمي كل معلم فقط (مثل منح النقاط والأوسمة في قيمي).`) +
      `<div class="grid ta-k"><div class="stat"><b>${done} / ${total}</b><span>مادة مُسندة في الفصول</span></div><div class="stat"><b>${total ? Math.round(done / total * 100) : 0}%</b><span>اكتمال الإسناد</span></div><div class="stat"><b>${who.size}</b><span>معلماً لهم إسناد</span></div><div class="stat"><b>${SC.length}</b><span>فصلاً في العام الحالي</span></div></div>
      ${canEdit ? `<div class="card mt ta-q"><h3 style="margin:0 0 10px">إسناد سريع</h3><div class="ta-qf">
        <label>المعلم<select id="qT"><option value="">اختر المعلم</option>${teachers.map((s) => `<option value="${s.id}">${esc(s.full_name)}${s.specialty ? " — " + esc(s.specialty) : ""}</option>`).join("")}</select></label>
        <label>المادة<select id="qS">${SJ.map((s) => `<option value="${s.code}">${esc(s.name_ar)}</option>`).join("")}</select></label></div>
        <div class="ta-qs" id="qC">${G.filter((g) => SC.some((s) => s.grade_code === g.code)).map((g) => `<div><b>${esc(g.name_ar)}</b>${SC.filter((s) => s.grade_code === g.code).map((s) => `<label class="ta-ch"><input type="checkbox" value="${s.id}">${esc(s.name)}</label>`).join("")}</div>`).join("")}</div>
        <div class="acts"><button class="btn" id="qGo" type="button">إسناد للفصول المحددة</button><span class="sub" id="qN" style="margin:0"></span></div></div>` : ""}
      <div class="tabs mt" role="tablist"><button type="button" data-v="s" class="${view === "s" ? "on" : ""}">حسب الفصول</button><button type="button" data-v="t" class="${view === "t" ? "on" : ""}">حسب المعلمين</button></div>
      <div id="tv"></div>`;
    $$("[data-v]", m).forEach((b) => (b.onclick = () => { view = b.dataset.v; history.replaceState(null, "", "teaching.html" + (view === "t" ? "?v=t" : "")); paint(); }));
    view === "s" ? bySection() : byTeacher();
    if (!canEdit) return;
    // الإسناد السريع: معلم ومادة لعدة فصول دفعة واحدة، مع تنبيه قبل استبدال إسناد قائم
    const qInfo = () => { const s = $("#qS").value, n = $$("#qC input:checked").length, taken = $$("#qC input:checked").filter((x) => A.has(x.value + "|" + s) && A.get(x.value + "|" + s) !== $("#qT").value).length;
      $("#qN").textContent = n ? `${n} فصل${taken ? ` · ${taken} منها مُسند لمعلم آخر وسيُستبدل` : ""}` : ""; };
    $("#qS").onchange = () => { $$("#qC input").forEach((x) => { x.checked = A.get(x.value + "|" + $("#qS").value) === $("#qT").value && !!$("#qT").value; }); qInfo(); };
    $("#qT").onchange = $("#qS").onchange; $$("#qC input").forEach((x) => (x.onchange = qInfo));
    $("#qGo").onclick = async () => {
      const t = $("#qT").value, s = $("#qS").value, secs = $$("#qC input:checked").map((x) => x.value);
      if (!t || !secs.length) { toast("اختر المعلم والفصول.", true); return; }
      $("#qGo").disabled = true;
      try { for (const id of secs) await save(id, s, t); toast(`أُسندت ${SJ.find((x) => x.code === s).name_ar} إلى ${short(nameOf(t))} في ${secs.length} فصل`); paint(); }
      catch (e) { toast(mapErr(e), true); $("#qGo").disabled = false; }
    };
  }

  // حسب الفصول: جدول الفصول × المواد، وكل خانة قائمة اختيار المعلم
  function bySection() {
    const tv = $("#tv");
    tv.innerHTML = `<div class="tw ta-w"><table class="ta"><thead><tr><th>الفصل</th>${SJ.map((s) => `<th>${esc(s.name_ar)}</th>`).join("")}</tr></thead><tbody>
      ${G.filter((g) => SC.some((s) => s.grade_code === g.code)).map((g) => `<tr class="ta-g"><td colspan="${SJ.length + 1}">${esc(g.name_ar)}</td></tr>` + SC.filter((s) => s.grade_code === g.code).map((sc) => `<tr><th scope="row">${esc(sc.name)}</th>${SJ.map((sj) => { const v = A.get(sc.id + "|" + sj.code) || "";
        return `<td class="${v ? "on" : ""}">${canEdit ? `<select data-sec="${sc.id}" data-sj="${sj.code}" aria-label="${esc(sj.name_ar)} – ${esc(sc.name)}" title="${esc(nameOf(v))}">${options(sj, v)}</select>` : v ? esc(short(nameOf(v))) : '<span class="sub">—</span>'}</td>`; }).join("")}</tr>`).join("")).join("")}
      </tbody></table></div>${SC.length ? "" : '<p class="sub">لا فصول في العام الحالي. أضفها من «المدرسة» ← المراحل والفصول.</p>'}`;
    $$("select[data-sec]", tv).forEach((el) => (el.onchange = async () => {
      const prev = A.get(el.dataset.sec + "|" + el.dataset.sj) || ""; el.disabled = true;
      try { await save(el.dataset.sec, el.dataset.sj, el.value || null); el.closest("td").classList.toggle("on", !!el.value); el.title = nameOf(el.value); toast(el.value ? "حُفظ الإسناد" : "أُلغي الإسناد"); }
      catch (e) { el.value = prev; toast(mapErr(e), true); }
      el.disabled = false;
    }));
  }

  // حسب المعلمين: لكل معلم مواده وفصوله، ومن لا إسناد له من المعلمين
  function byTeacher() {
    const by = new Map(); for (const [k, t] of A) { const [sec, sj] = k.split("|"); if (!by.has(t)) by.set(t, []); by.get(t).push({ sec, sj }); }
    const rows = [...by.entries()].sort((a, b) => nameOf(a[0]).localeCompare(nameOf(b[0]), "ar"));
    const none = teachers.filter((s) => !by.has(s.id));
    $("#tv").innerHTML = `<div class="ta-tl">${rows.map(([t, L]) => { const subs = [...new Set(L.map((x) => x.sj))];
      return `<div class="card ta-t"><div class="ta-th"><b>${esc(nameOf(t))}</b><small>${esc(ST.find((s) => s.id === t)?.specialty || "")}</small><span class="ta-n">${L.length} ${L.length > 10 ? "فصلاً" : L.length > 2 ? "فصول" : "فصل"}</span></div>
        ${subs.map((sj) => `<div class="ta-r"><span>${esc(SJ.find((x) => x.code === sj)?.name_ar || sj)}</span><div>${L.filter((x) => x.sj === sj).map((x) => SC.find((s) => s.id === x.sec)).filter(Boolean).map((s) => `<i>${esc(s.name)}</i>`).join("")}</div></div>`).join("")}</div>`; }).join("") || '<p class="sub">لا إسناد بعد. ابدأ من «حسب الفصول» أو «الإسناد السريع».</p>'}</div>
      ${none.length ? `<div class="card mt"><h3 style="margin:0 0 8px">معلمون بلا إسناد (${none.length})</h3><p class="sub" style="margin:0">${none.map((s) => esc(s.full_name)).join("، ")}</p></div>` : ""}`;
  }
  paint();
}, { perm: "school:view" });
