// حسابي: بيانات المنسوب وبيانات التواصل. الملف المهني في المجتمع المهني الذكي (رابطه في بطاقة الترحيب). تغيير كلمة المرور في password.html.
// السياسة نفسها تُفرض في الخادم (core_password_problem)، وهنا للعرض والتحقق الفوري فقط.
const PW_ERR = {
  email_login: "حسابك يدخل بالبريد الإلكتروني، فتغيير البريد من صلاحية إدارة النظام.", invalid_email: "البريد الإلكتروني غير صالح.", invalid_phone: "رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام.", email_taken: "هذا البريد مسجل لمنسوب آخر.",
};

boot("profile.html", async (m, c) => {
  const [mr, pr, pfr] = await Promise.all([
    sb.from("staff_members").select("full_name,specialty,qualification,department,employment_status,account_status,joined_on,job_titles(name_ar),staff_categories(name_ar)").eq("id", c.me.id).maybeSingle(),
    sb.from("staff_private").select("login_id,email,phone,must_change_password,password_changed_at").eq("staff_id", c.me.id).maybeSingle(),
    sb.from("pc_profiles").select("avatar_path").eq("staff_id", c.me.id).maybeSingle()
  ]);
  const r = mr.data || {}, p = pr.data || {};
  const S = 'dir="ltr" autocapitalize="none" autocorrect="off" spellcheck="false"';
  m.innerHTML = head("حسابي", "بيانات دخولك وتواصلك. يمكنك تعديل البريد الإلكتروني ورقم الجوال، ولتصحيح غيرها تواصل مع إدارة المدرسة. وتغيير كلمة المرور من قائمة الصورة والاسم أعلى الصفحة.") +
    `<div class="card"><h3 class="sec" style="margin-top:0">بياناتي</h3><div class="fg">
      ${[["الاسم", r.full_name], ["معرّف الدخول (رقم الهوية)", p.login_id], ["المسمى الوظيفي", r.job_titles?.name_ar], ["التخصص", r.specialty]]
        .map(([k, v]) => `<div><small class="sub">${k}</small><br><b>${esc(v || "—")}</b></div>`).join("")}</div></div>
    <div class="card" id="phc"><h3 class="sec" style="margin-top:0">صورتي</h3><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div id="phv" class="pp-av" style="width:84px;height:84px;flex:none;overflow:hidden">${pfr.data?.avatar_path ? `<img alt="" style="width:100%;height:100%;object-fit:cover" src="${APP_CONFIG.supabaseUrl}/storage/v1/object/public/pc-avatars/${esc(pfr.data.avatar_path)}">` : esc((r.full_name || "؟").trim().charAt(0))}</div>
      <div class="grow"><small class="sub">صورة واحدة تظهر في النواة الرقمية وفي ملفك بالمجتمع المهني. JPG أو PNG أو WebP حتى 5 ميجابايت.</small>
        <div class="acts" style="margin-top:8px"><label class="btn sm" for="phf" style="cursor:pointer">تغيير الصورة</label><input id="phf" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>
        <p class="err" id="phe" role="alert"></p></div></div></div>
    <div class="card mt" id="sgc"><h3 class="sec" style="margin-top:0">توقيعي الإلكتروني</h3>
      <p class="sub" style="margin-top:0">ارسم توقيعك مرة واحدة بالإصبع أو الفأرة، فيُضاف تلقائياً إلى التكليفات والتقارير التي تُصدرها أو تُطلب فيها موافقتك. صحة أي تقرير يثبتها رمز التحقق المطبوع عليه.</p>
      <div id="sgNow" class="sg-now"></div>
      <div class="sg-pad"><canvas id="sgCv" width="900" height="300" aria-label="مساحة رسم التوقيع"></canvas><span class="sg-ln" aria-hidden="true"></span></div>
      <div class="acts"><button class="btn" id="sgSv" type="button" disabled>حفظ التوقيع</button><button class="btn sec" id="sgCl" type="button">مسح</button><button class="btn bad" id="sgDl" type="button" hidden>حذف توقيعي المحفوظ</button></div>
      <p class="err" id="sge" role="alert"></p></div>
    <div class="card mt" id="ct"><h3 class="sec" style="margin-top:0">بيانات التواصل</h3>
      <form id="cf"><div class="fg">
        <div><label for="em">البريد الإلكتروني</label><input id="em" type="email" ${S} autocomplete="email" value="${esc(p.email || "")}" placeholder="name@example.com"><small class="sub">للتواصل فقط، ولا يغيّر طريقة دخولك.</small></div>
        <div><label for="ph">رقم الجوال</label><input id="ph" type="tel" ${S} inputmode="tel" autocomplete="tel" value="${esc(p.phone || "")}" placeholder="05xxxxxxxx"><small class="sub">10 أرقام تبدأ بـ 05.</small></div>
      </div><p class="err" id="ce" role="alert"></p><div class="acts"><button class="btn" id="cs" type="submit">حفظ بيانات التواصل</button></div></form></div>`;
  const g = (i) => m.querySelector(i);
  g("#phf").onchange = async (e) => {
    const file = e.target.files[0], er = g("#phe"); er.textContent = ""; if (!file) return;
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("الصور بصيغة JPG أو PNG أو WebP فقط");
      if (file.size > 5 * 1024 * 1024) throw new Error("الصورة أكبر من 5 ميجابايت");
      const path = `${c.me.id}/avatar-${Date.now()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
      const up = await sb.storage.from("pc-avatars").upload(path, file, { contentType: file.type }); if (up.error) throw new Error(up.error.message);
      const { data, error } = await sb.rpc("core_set_my_avatar", { p_path: path }); if (error) throw new Error(mapErr(error)); if (!data?.ok) throw new Error("تعذر حفظ الصورة.");
      if (data.old && data.old !== path) sb.storage.from("pc-avatars").remove([data.old]);
      toast("حُفظت الصورة"); setTimeout(() => location.reload(), 800);
    } catch (x) { er.textContent = x.message || "تعذر رفع الصورة."; }
  };
  // ===== التوقيع الإلكتروني: رسم على لوحة، وقصّ الفراغ حول التوقيع، وحفظه PNG شفافاً =====
  (async () => {
    const cv = g("#sgCv"), cx = cv.getContext("2d"), sv = g("#sgSv"), now = g("#sgNow"), dl = g("#sgDl"), er = g("#sge"); let drawn = false, last = null;
    const show = (img) => { now.innerHTML = img ? `<span class="sub">توقيعك المحفوظ:</span><img alt="توقيعي" src="${img}">` : '<span class="sub">لم تحفظ توقيعاً بعد.</span>'; dl.hidden = !img; };
    try { const r = await sb.rpc("core_my_signature"); show(r.data?.image); } catch (_) { show(null); }
    cx.lineWidth = 5; cx.lineCap = "round"; cx.lineJoin = "round"; cx.strokeStyle = "#0d2b45";
    const pt = (e) => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) * cv.width) / b.width, ((e.clientY - b.top) * cv.height) / b.height]; };
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); last = pt(e); cx.beginPath(); cx.arc(last[0], last[1], 2.4, 0, 7); cx.fillStyle = "#0d2b45"; cx.fill(); drawn = true; sv.disabled = false; });
    cv.addEventListener("pointermove", (e) => { if (!last) return; e.preventDefault(); const p = pt(e); cx.beginPath(); cx.moveTo(last[0], last[1]); cx.lineTo(p[0], p[1]); cx.stroke(); last = p; });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => cv.addEventListener(t, () => (last = null)));
    g("#sgCl").onclick = () => { cx.clearRect(0, 0, cv.width, cv.height); drawn = false; sv.disabled = true; er.textContent = ""; };
    const trimmed = () => { const d = cx.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 - x0 < 20 || y1 - y0 < 10) return null; const pd = 12, w = x1 - x0 + pd * 2, h = y1 - y0 + pd * 2, o = document.createElement("canvas"); o.width = w; o.height = h;
      o.getContext("2d").drawImage(cv, x0 - pd, y0 - pd, w, h, 0, 0, w, h); return o.toDataURL("image/png"); };
    sv.onclick = async () => { er.textContent = ""; if (!drawn) return; const img = trimmed(); if (!img) { er.textContent = "التوقيع صغير جداً، ارسمه بحجم أوضح."; return; }
      sv.disabled = true; const { data, error } = await sb.rpc("core_set_my_signature", { p_image: img });
      if (error || !data?.ok) { er.textContent = error ? mapErr(error) : "تعذر حفظ التوقيع."; sv.disabled = false; return; }
      show(img); g("#sgCl").click(); toast("حُفظ توقيعك"); };
    dl.onclick = async () => { if (!confirm("حذف توقيعك المحفوظ؟ لن يظهر في التقارير التي تصدر بعد الحذف.")) return;
      const { error } = await sb.rpc("core_set_my_signature", { p_image: null }); if (error) { er.textContent = mapErr(error); return; } show(null); toast("حُذف التوقيع"); };
  })();
  g("#cf").onsubmit = async (e) => {
    e.preventDefault(); const er = g("#ce"), b = g("#cs"); er.textContent = ""; b.disabled = true;
    const { data, error } = await sb.rpc("core_update_my_contact", { p_email: g("#em").value, p_phone: g("#ph").value }); b.disabled = false;
    if (error) { er.textContent = mapErr(error); return; }
    if (!data?.ok) { er.textContent = PW_ERR[data?.error] || "تعذر الحفظ."; return; }
    g("#em").value = data.email || ""; g("#ph").value = data.phone || ""; toast("حُفظت بيانات التواصل");
  };
});
