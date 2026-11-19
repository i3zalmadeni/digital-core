// تغيير كلمة المرور: صفحة مستقلة. السياسة نفسها تُفرض في الخادم (core_password_problem)، وهنا للعرض والتحقق الفوري فقط.
const PW_RULES = [
  ["len", "8 خانات على الأقل", (v) => v.length >= 8],
  ["let", "حرف إنجليزي واحد على الأقل (A–Z أو a–z)", (v) => /[A-Za-z]/.test(v)],
  ["dig", "رقم واحد على الأقل (0–9)", (v) => /[0-9]/.test(v)],
  ["spc", "بلا مسافات", (v) => v.length > 0 && !/\s/.test(v)],
];
const PW_ERR = {
  wrong_current: "كلمة المرور الحالية غير صحيحة.", too_short: "كلمة المرور أقل من 8 خانات.", too_long: "كلمة المرور أطول من المسموح (72 خانة).",
  has_space: "لا تُقبل المسافات في كلمة المرور.", need_letter: "أضف حرفاً إنجليزياً واحداً على الأقل.", need_digit: "أضف رقماً واحداً على الأقل.",
  email_login: "حسابك يدخل بالبريد الإلكتروني، فتغيير البريد من صلاحية إدارة النظام.", invalid_email: "البريد الإلكتروني غير صالح.", invalid_phone: "رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام.", email_taken: "هذا البريد مسجل لمنسوب آخر.",
  is_default: "لا يمكن استخدام كلمة المرور الافتراضية.", is_login: "لا يمكن أن تكون كلمة المرور هي معرّف الدخول (رقم الهوية).", same_as_current: "كلمة المرور الجديدة مطابقة للحالية.",
};

boot("password.html", async (m, c) => {
  const { data: p } = await sb.from("staff_private").select("login_id,must_change_password,password_changed_at").eq("staff_id", c.me.id).maybeSingle().then((r) => ({ data: r.data || {} }));
  const S = 'dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false"';
  m.innerHTML = head("تغيير كلمة المرور", "اختر كلمة مرور جديدة لدخولك إلى النواة الرقمية وبقية الأنظمة.") +
    `<div class="card" id="pw"><h3 class="sec" style="margin-top:0">تغيير كلمة المرور</h3>
      ${p.must_change_password ? '<p class="alert">تدخل الآن بكلمة المرور الافتراضية الموحدة. ننصح بتغييرها الآن.</p>' : `<p class="sub">آخر تغيير: ${p.password_changed_at ? fmtT(p.password_changed_at) : "—"}</p>`}
      <div class="card" style="background:var(--soft);box-shadow:none"><b>شروط كلمة المرور الجديدة</b>
        <ul id="rules" style="margin:8px 0 0;padding-inline-start:20px;line-height:2">${PW_RULES.map(([k, t]) => `<li data-r="${k}">${t}</li>`).join("")}
          <li>ألا تكون كلمة المرور الافتراضية، ولا رقم هويتك</li></ul>
        <small class="sub">لا يُشترط حرف كبير ولا رمز خاص. يمكن أن تكون أطول من 8 خانات (حتى 72)، وكلما طالت كانت أقوى. مثال على الشكل المقبول: <span dir="ltr">Labeed26</span> (لا تستخدم المثال نفسه).</small></div>
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
