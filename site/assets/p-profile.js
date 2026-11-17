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
boot("profile.html", async (m, c) => {
  const [mr, pr] = await Promise.all([
    sb.from("staff_members").select("full_name,specialty,qualification,department,employment_status,account_status,joined_on,job_titles(name_ar),staff_categories(name_ar)").eq("id", c.me.id).maybeSingle(),
    sb.from("staff_private").select("login_id,email,phone,must_change_password,password_changed_at").eq("staff_id", c.me.id).maybeSingle()
  ]);
  const r = mr.data || {}, p = pr.data || {};
  const S = 'dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false"';
  m.innerHTML = head("حسابي", "بيانات دخولك وتواصلك. يمكنك تعديل البريد الإلكتروني ورقم الجوال وكلمة المرور، ولتصحيح غيرها تواصل مع إدارة المدرسة.") +
    `<div class="card"><h3 class="sec" style="margin-top:0">بياناتي</h3><div class="fg">
      ${[["الاسم", r.full_name], ["معرّف الدخول (رقم الهوية)", p.login_id], ["المسمى الوظيفي", r.job_titles?.name_ar], ["التخصص", r.specialty]]
        .map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div>
    <div class="card mt" id="ct"><h3 class="sec" style="margin-top:0">بيانات التواصل</h3>
      <form id="cf"><div class="fg">
        <div><label for="em">البريد الإلكتروني</label><input id="em" type="email" ${S} autocomplete="email" value="${esc(p.email || "")}" placeholder="name@example.com"><small class="sub">للتواصل فقط، ولا يغيّر طريقة دخولك.</small></div>
        <div><label for="ph">رقم الجوال</label><input id="ph" type="tel" ${S} inputmode="tel" autocomplete="tel" value="${esc(p.phone || "")}" placeholder="05xxxxxxxx"><small class="sub">10 أرقام تبدأ بـ 05.</small></div>
      </div><p class="err" id="ce" role="alert"></p><div class="acts"><button class="btn" id="cs" type="submit">حفظ بيانات التواصل</button></div></form></div>
    <div class="card mt" id="pk" hidden><h3 class="sec" style="margin-top:0">الدخول ببصمة الوجه</h3>
      <p class="sub">فعّل الدخول بلمسة واحدة على أجهزتك الشخصية. يتحقق الجهاز من وجهك أو بصمتك، ولا تُحفظ لدينا أي صورة أو بيانات بيومترية. يعمل المفتاح الواحد على جميع أنظمة النواة.</p>
      <div id="pkl"></div><p class="err" id="pke" role="alert"></p>
      <div class="acts"><button class="btn" id="pka" type="button">تفعيل البصمة على هذا الجهاز</button></div></div>
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
  // الدخول ببصمة الوجه
  PK.available().then((ok) => { if (!ok) return; g("#pk").hidden = false; pkList(); });
  async function pkList() {
    const { data } = await sb.from("passkeys").select("id,device_label,created_at,last_used_at").order("created_at");
    g("#pkl").innerHTML = (data || []).length ? `<div class="tw"><table><thead><tr><th>الجهاز</th><th>أُضيف</th><th>آخر دخول</th><th></th></tr></thead><tbody>${data.map((k) => `<tr><td>${esc(k.device_label || "جهاز")}</td><td>${fmtT(k.created_at)}</td><td>${k.last_used_at ? fmtT(k.last_used_at) : "—"}</td><td><button class="btn ghost" data-del="${k.id}" type="button">حذف</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="sub">لا توجد أجهزة مفعّلة بعد.</p>';
    g("#pkl").querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => { if (!confirm("حذف هذا الجهاز من الدخول بالبصمة؟")) return; await sb.from("passkeys").delete().eq("id", b.dataset.del); PK.forget(); pkList(); }));
  }
  g("#pka").onclick = async () => {
    const b = g("#pka"), er = g("#pke"); er.textContent = ""; b.disabled = true;
    try { await PK.register(sb, PK.deviceLabel()); toast("تم تفعيل الدخول ببصمة الوجه"); pkList(); } catch (e) { er.textContent = e.message; }
    b.disabled = false;
  };
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
