// حسابي: بيانات المنسوب (عرض فقط) وتغيير كلمة المرور.
// السياسة نفسها تُفرض في الخادم (core_password_problem)، وهنا للعرض والتحقق الفوري فقط.
const PW_RULES = [
  ["len", "10 خانات على الأقل", (v) => v.length >= 10],
  ["let", "حرف إنجليزي واحد على الأقل (A–Z أو a–z)", (v) => /[A-Za-z]/.test(v)],
  ["dig", "رقم واحد على الأقل (0–9)", (v) => /[0-9]/.test(v)],
  ["spc", "بلا مسافات", (v) => v.length > 0 && !/\s/.test(v)],
];
const PW_ERR = {
  wrong_current: "كلمة المرور الحالية غير صحيحة.", too_short: "كلمة المرور أقل من 10 خانات.", too_long: "كلمة المرور أطول من المسموح (72 خانة).",
  has_space: "لا تُقبل المسافات في كلمة المرور.", need_letter: "أضف حرفاً إنجليزياً واحداً على الأقل.", need_digit: "أضف رقماً واحداً على الأقل.",
  email_login: "حسابك يدخل بالبريد الإلكتروني، فتغيير البريد من صلاحية إدارة النظام.", invalid_email: "البريد الإلكتروني غير صالح.", invalid_phone: "رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام.", email_taken: "هذا البريد مسجل لمنسوب آخر.",
  is_default: "لا يمكن استخدام كلمة المرور الافتراضية.", is_login: "لا يمكن أن تكون كلمة المرور هي معرّف الدخول (رقم الهوية).", same_as_current: "كلمة المرور الجديدة مطابقة للحالية.",
};

// الملف المهني (عرض فقط): نفس بيانات الملف المهني في المجتمع المهني الذكي. التعديل من هناك.
const PP_SK = { skills_pedagogical: "المهارات التربوية", skills_digital: "المهارات الرقمية", skills_specialty: "المهارات التخصصية", skills_leadership: "القيادة", skills_collab: "التواصل والتعاون", skills_ai: "الذكاء الاصطناعي" };
const PP_GK = { course: "دورة", workshop: "ورشة", certificate: "شهادة", award: "تكريم / جائزة", visit: "زيارة", publication: "إنتاج معرفي", other: "أخرى" };
const PP_IS = { qualification: "مؤهل", license: "رخصة" };
const PP_URL = "teachers-community/#/home/profile";
const ppNl = (v) => esc(v).replace(/\n/g, "<br>");
const ppChips = (a) => (a || []).map((x) => `<span class="badge pp-b">${esc(x)}</span>`).join("");
const ppSafe = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
const ppItem = (i) => `<div class="pp-it"><div class="grow"><b>${ppSafe(i.url) ? `<a href="${esc(ppSafe(i.url))}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a>` : esc(i.title)}</b>${PP_IS[i.section] ? ` <span class="badge">${PP_IS[i.section]}</span>` : ""}
  <div class="sub" style="margin:2px 0 0">${[i.organization, i.year_from && i.year_to ? `${i.year_from} – ${i.year_to}` : i.year_to || i.year_from || ""].filter(Boolean).map(esc).join(" · ")}</div>${i.description ? `<div style="margin-top:4px">${ppNl(i.description)}</div>` : ""}</div>
  ${i.verified ? '<span class="badge ok">موثّق</span>' : '<span class="badge">بيان ذاتي</span>'}</div>`;
const ppRec = (r) => `<div class="pp-it"><div class="grow"><b>${esc(r.title)}</b><div class="sub" style="margin:2px 0 0">${[PP_GK[r.kind] || "", r.provider, r.done_on, Number(r.hours) ? Number(r.hours) + " ساعة" : ""].filter(Boolean).map(esc).join(" · ")}</div></div><span class="badge ok">معتمد</span></div>`;
const ppSec = (ico, t, body, n) => `<section class="card pp-s"><h3 class="pp-h"><span class="pp-i">${ico}</span>${t}${n != null ? `<small>${n}</small>` : ""}</h3>${body || '<div class="sub" style="margin:0">لم يُضف شيء بعد.</div>'}</section>`;
const ppList = (a, f) => (a.length ? `<div class="pp-l">${a.map(f).join("")}</div>` : "");
const ppRender = (st, p, items, recs, comp) => {
  const by = (...x) => items.filter((i) => x.includes(i.section)), gr = (f) => recs.filter((r) => f(r.kind));
  const skills = Object.entries(PP_SK).filter(([k]) => (p[k] || []).length);
  const refl = [["نقاط القوة", p.strengths], ["مجالات التطوير", p.development_areas], ["الأهداف المهنية", p.goals], ["تأمل مهني", p.reflection]].filter(([, v]) => v);
  const pct = comp?.percent ?? null;
  const av = p.avatar_path ? `<img class="pp-av" alt="" src="${APP_CONFIG.supabaseUrl}/storage/v1/object/public/pc-avatars/${esc(p.avatar_path)}">` : `<div class="pp-av">${esc((st.full_name || "؟").trim().charAt(0))}</div>`;
  const hero = `<div class="pp-hero"><div class="pp-ring" style="--p:${pct ?? 0}">${av}</div><div class="grow"><h3 style="margin:0;font-size:1.25rem">${esc(st.full_name || "")}</h3>${p.headline ? `<div><b>${esc(p.headline)}</b></div>` : ""}
    <div class="sub" style="margin:2px 0 8px">${[st.job_titles?.name_ar, st.specialty, st.qualification, p.experience_years != null ? p.experience_years + " سنة خبرة" : ""].filter(Boolean).map(esc).join(" · ")}</div>
    ${pct != null ? `<span class="badge ok">اكتمال الملف ${pct}%</span> ` : ""}<span class="badge">${p.is_public ? "منشور في الموقع التعريفي" : "داخل المجتمع فقط"}</span></div>
    <a class="btn sm" href="${PP_URL}">تعديل الملف في المجتمع المهني</a></div>
    ${p.bio ? `<p style="margin:12px 0 0">${ppNl(p.bio)}</p>` : '<p class="sub" style="margin:12px 0 0">لم تُكتب نبذة مهنية بعد.</p>'}
    ${(p.subjects || []).length || (p.grades || []).length || (p.interests || []).length ? `<div class="pp-g">${(p.subjects || []).length ? `<div><small class="sub">المواد</small><div class="chips">${ppChips(p.subjects)}</div></div>` : ""}${(p.grades || []).length ? `<div><small class="sub">الصفوف</small><div class="chips">${ppChips(p.grades)}</div></div>` : ""}${(p.interests || []).length ? `<div><small class="sub">الاهتمامات المهنية</small><div class="chips">${ppChips(p.interests)}</div></div>` : ""}</div>` : ""}`;
  const q = by("qualification", "license"), ex = by("experience"), pr = by("practice"), dev = gr((k) => !["award", "certificate", "publication"].includes(k)), ach = gr((k) => ["award", "certificate"].includes(k)), pub = gr((k) => k === "publication");
  return `<h3 class="sec">ملفي المهني</h3><div class="card pp-top">${hero}</div>
  <div class="pp-grid">
  ${ppSec("★", "المؤهلات والتراخيص", ppList(q, ppItem), q.length)}
  ${ppSec("✦", "المهارات والكفايات", skills.length ? skills.map(([k, n]) => `<div class="pp-sk"><small class="sub">${n}</small><div class="chips">${ppChips(p[k])}</div></div>`).join("") : "")}
  ${ppSec("◆", "الخبرات المهنية", ppList(ex, ppItem), ex.length)}
  ${ppSec("▲", "الممارسات التعليمية", ppList(pr, ppItem), pr.length)}
  ${ppSec("●", "التطوير المهني", ppList(dev, ppRec), dev.length)}
  ${ppSec("♛", "الإنجازات والشهادات", ppList(ach, ppRec), ach.length)}
  ${ppSec("✎", "الإنتاج المعرفي", ppList(pub, ppRec), pub.length)}
  ${ppSec("❖", "التأمل المهني", refl.length ? refl.map(([n, v]) => `<div class="pp-sk"><small class="sub">${n}</small><div>${ppNl(v)}</div></div>`).join("") : "")}
  </div>`;
};
boot("profile.html", async (m, c) => {
  const [mr, pr, pfr, itr, rcr, cmr] = await Promise.all([
    sb.from("staff_members").select("full_name,specialty,qualification,department,employment_status,account_status,joined_on,job_titles(name_ar),staff_categories(name_ar)").eq("id", c.me.id).maybeSingle(),
    sb.from("staff_private").select("login_id,email,phone,must_change_password,password_changed_at").eq("staff_id", c.me.id).maybeSingle(),
    sb.from("pc_profiles").select("*").eq("staff_id", c.me.id).maybeSingle(),
    sb.from("pc_profile_items").select("*").eq("staff_id", c.me.id).order("year_to", { ascending: false, nullsFirst: false }),
    sb.from("pc_growth_records").select("*").eq("staff_id", c.me.id).eq("status", "approved").order("done_on", { ascending: false, nullsFirst: false }),
    sb.rpc("pc_profile_completion", { p_staff: c.me.id })
  ]);
  const r = mr.data || {}, p = pr.data || {};
  const S = 'dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false"';
  m.innerHTML = head("حسابي", "بيانات دخولك وتواصلك. يمكنك تعديل البريد الإلكتروني ورقم الجوال وكلمة المرور، ولتصحيح غيرها تواصل مع إدارة المدرسة.") +
    `<div class="card"><h3 class="sec" style="margin-top:0">بياناتي</h3><div class="fg">
      ${[["الاسم", r.full_name], ["معرّف الدخول (رقم الهوية)", p.login_id], ["المسمى الوظيفي", r.job_titles?.name_ar], ["التخصص", r.specialty]]
        .map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div>
    ${pfr.error && itr.error ? "" : `<div id="ppw">${ppRender(r, pfr.data || {}, itr.data || [], rcr.data || [], cmr.data)}</div>`}
    <div class="card mt" id="ct"><h3 class="sec" style="margin-top:0">بيانات التواصل</h3>
      <form id="cf"><div class="fg">
        <div><label for="em">البريد الإلكتروني</label><input id="em" type="email" ${S} autocomplete="email" value="${esc(p.email || "")}" placeholder="name@example.com"><small class="sub">للتواصل فقط، ولا يغيّر طريقة دخولك.</small></div>
        <div><label for="ph">رقم الجوال</label><input id="ph" type="tel" ${S} inputmode="tel" autocomplete="tel" value="${esc(p.phone || "")}" placeholder="05xxxxxxxx"><small class="sub">10 أرقام تبدأ بـ 05.</small></div>
      </div><p class="err" id="ce" role="alert"></p><div class="acts"><button class="btn" id="cs" type="submit">حفظ بيانات التواصل</button></div></form></div>
    <div class="card mt" id="pw"><h3 class="sec" style="margin-top:0">تغيير كلمة المرور</h3>
      ${p.must_change_password ? '<p class="alert">تدخل الآن بكلمة المرور الافتراضية الموحدة. ننصح بتغييرها الآن.</p>' : `<p class="sub">آخر تغيير: ${p.password_changed_at ? fmtT(p.password_changed_at) : "—"}</p>`}
      <div class="card" style="background:var(--soft);box-shadow:none"><b>شروط كلمة المرور الجديدة</b>
        <ul id="rules" style="margin:8px 0 0;padding-inline-start:20px;line-height:2">${PW_RULES.map(([k, t]) => `<li data-r="${k}">${t}</li>`).join("")}
          <li>ألا تكون كلمة المرور الافتراضية، ولا رقم هويتك</li></ul>
        <small class="sub">لا يُشترط حرف كبير ولا رمز خاص. يمكن أن تكون أطول من 10 خانات (حتى 72)، وكلما طالت كانت أقوى. مثال على الشكل المقبول: <span dir="ltr">Labeed2026x</span> (لا تستخدم المثال نفسه).</small></div>
      <form id="pf" class="mt" autocomplete="on"><input type="text" name="username" value="${esc(p.login_id || "")}" autocomplete="username" hidden>
        <div class="fg">
          <div class="full"><label for="cp">كلمة المرور الحالية</label><input id="cp" type="password" ${S} autocomplete="current-password" required></div>
          <div><label for="np">كلمة المرور الجديدة</label><input id="np" type="password" ${S} autocomplete="new-password" required></div>
          <div><label for="np2">تأكيد كلمة المرور الجديدة</label><input id="np2" type="password" ${S} autocomplete="new-password" required></div>
        </div>
        <label class="mt" style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" id="sh" style="width:auto"> إظهار كلمات المرور</label>
        <p class="err" id="pe" role="alert"></p>
        <div class="acts"><button class="btn" id="sv" type="submit">حفظ كلمة المرور</button></div></form></div>`;
  const g = (i) => m.querySelector(i), np = g("#np");
  const paint = () => PW_RULES.forEach(([k, , f]) => { const li = g(`[data-r="${k}"]`), ok = f(np.value); li.style.color = np.value ? (ok ? "var(--c4f)" : "var(--c5f)") : ""; li.textContent = (np.value ? (ok ? "✓ " : "✗ ") : "") + PW_RULES.find((x) => x[0] === k)[1]; });
  np.addEventListener("input", paint);
  g("#sh").onchange = (e) => ["#cp", "#np", "#np2"].forEach((i) => (g(i).type = e.target.checked ? "text" : "password"));
  g("#cf").onsubmit = async (e) => {
    e.preventDefault(); const er = g("#ce"), b = g("#cs"); er.textContent = ""; b.disabled = true;
    const { data, error } = await sb.rpc("core_update_my_contact", { p_email: g("#em").value, p_phone: g("#ph").value }); b.disabled = false;
    if (error) { er.textContent = mapErr(error); return; }
    if (!data?.ok) { er.textContent = PW_ERR[data?.error] || "تعذر الحفظ."; return; }
    g("#em").value = data.email || ""; g("#ph").value = data.phone || ""; toast("حُفظت بيانات التواصل");
  };
  g("#pf").onsubmit = async (e) => {
    e.preventDefault(); const er = g("#pe"); er.textContent = "";
    const cur = g("#cp").value, nv = np.value;
    const bad = PW_RULES.find(([, , f]) => !f(nv)); if (bad) { er.textContent = "كلمة المرور الجديدة لا تحقق الشرط: " + bad[1]; return; }
    if (nv !== g("#np2").value) { er.textContent = "تأكيد كلمة المرور غير مطابق."; return; }
    const b = g("#sv"); b.disabled = true; b.textContent = "جارٍ الحفظ…";
    const { data, error } = await sb.rpc("core_change_my_password", { p_current: cur, p_new: nv });
    b.disabled = false; b.textContent = "حفظ كلمة المرور";
    if (error) { er.textContent = mapErr(error); return; }
    if (!data?.ok) { er.textContent = PW_ERR[data?.error] || "تعذر تغيير كلمة المرور."; return; }
    toast("تم تغيير كلمة المرور. استخدمها في دخولك القادم.");
    setTimeout(() => location.reload(), 1200);
  };
});
