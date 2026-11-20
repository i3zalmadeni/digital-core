const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
async function doLogout(to) {
  try { await Promise.race([sb.auth.signOut({ scope: "local" }), new Promise((r) => setTimeout(r, 2500))]); } catch (_) {}
  try { Object.keys(localStorage).filter((k) => /^sb-.*-auth-token/.test(k)).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch (_) {}
  location.replace(to || "index.html");
}
const FN = APP_CONFIG.supabaseUrl + "/functions/v1/core-api";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const qs = (k) => new URLSearchParams(location.search).get(k);
const fmt = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "short", day: "numeric" }) : "—");
const fmtT = (d) => (d ? new Date(d).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "—");
const L = {
  acct: { none: "بلا حساب", invited: "مدعو", active: "نشط", suspended: "موقوف" },
  emp: { active: "على رأس العمل", on_leave: "في إجازة", transferred: "منقول", ended: "منتهية خدمته", retired: "متقاعد", archived: "مؤرشف" },
  stu: { enrolled: "منتظم", transferred_out: "منقول", graduated: "متخرج", withdrawn: "منسحب" },
  etype: { new: "مستجد", transfer_in: "منقول إلينا", returning: "عائد" },
  fstatus: { operational: "يعمل", limited: "جزئي", closed: "مغلق" },
  year: { planned: "مخطط", current: "حالي", closed: "مغلق" },
  gender: { boys: "بنين", girls: "بنات", mixed: "مختلط" },
  rel: { father: "الأب", mother: "الأم", brother: "الأخ", uncle: "العم أو الخال", other: "آخر" },
  rkind: { functional: "وظيفي", organizational: "تنظيمي", technical: "تقني" },
  level: { view: "اطلاع", add: "إضافة", edit: "تعديل", approve: "اعتماد" },
  reg: { school: "المدرسة", personnel: "المنسوبين", students: "المتعلمين", facilities: "المرافق" },
  act: { INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف", rotate_key: "تجديد مفتاح", change_password: "تغيير كلمة المرور", reset_password: "استعادة كلمة المرور الافتراضية", update_contact: "تحديث بيانات التواصل", bulk_accounts: "إنشاء حسابات المنسوبين" },
};
const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? "selected" : ""}>${esc(v)}</option>`).join("");
const head = (t, s) => `<h2>${esc(t)}</h2>${s ? `<p class="sub">${esc(s)}</p>` : ""}`;
const today = () => new Date().toISOString().slice(0, 10);
const nn = (v) => (v === "" || v === undefined || v === null ? null : typeof v === "string" ? v.trim() || null : v);
const num = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
const FIELD_AR = { full_name: "الاسم", category: "الفئة", job_title: "المسمى", specialty: "التخصص", qualification: "المؤهل", employment_status: "الحالة الوظيفية", department: "القسم", photo_path: "الصورة", account_status: "الحساب", student_no: "رقم الطالب", study_status: "الحالة الدراسية", birth_date: "تاريخ الميلاد", nationality: "الجنسية", grade_code: "الصف", section_id: "الفصل", status: "الحالة", name: "الاسم", type_code: "النوع", building: "المبنى", floor: "الدور", room_no: "رقم الغرفة", area_m2: "المساحة", capacity: "الطاقة الاستيعابية", description: "الوصف", primary_staff_id: "المسؤول الرئيسي", backup_staff_id: "المسؤول البديل", official_name: "الاسم الرسمي", ministry_no: "الرقم الوزاري", phone: "الجوال", email: "البريد", employee_no: "الرقم الوظيفي", address: "العنوان", quantity: "الكمية" };

function toast(msg, bad) { const d = document.createElement("div"); d.className = "toast" + (bad ? " bad" : ""); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }
const MX_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
// زر إغلاق (×) في أعلى كل نافذة منبثقة، مع بقاء أزرار الإغلاق السفلية؛ يُعاد إدراجه إذا أُعيد رسم محتوى النافذة
function modalX(md, close) { const sync = () => { const cur = md.querySelector(":scope>.mx"), f = [...md.children].find((c) => !c.classList.contains("mx")), has = f && (f.hasAttribute("data-x") || f.querySelector("[data-x]")); if (has) { if (cur) cur.remove(); return; } if (cur) return; const b = document.createElement("button"); b.type = "button"; b.className = "mx"; b.setAttribute("aria-label", "إغلاق"); b.innerHTML = MX_SVG; b.onclick = close; md.prepend(b); }; sync(); new MutationObserver(sync).observe(md, { childList: true }); }
function modal(html, wide) {
  const ov = document.createElement("div"); ov.className = "ov"; ov.innerHTML = `<div class="md" role="dialog" aria-modal="true" ${wide ? 'style="max-width:860px"' : ""}>${html}</div>`;
  const close = () => ov.remove(); ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
  modalX(ov.firstChild, close);
  document.body.appendChild(ov); return { el: ov.firstChild, close };
}
function mapErr(e) {
  const m = e?.message || String(e);
  if (/staff_private_login_id/.test(m)) return "معرّف الدخول مستخدم لمنسوب آخر.";
  if (/staff_private_email|staff_private_employee/.test(m)) return "البريد أو الرقم الوظيفي مستخدم لمنسوب آخر.";
  if (/students_student_no_key/.test(m)) return "رقم الطالب مستخدم لطالب آخر.";
  if (/student_enrollments_student_id_year_id_key/.test(m)) return "للمتعلم تسجيل في هذا العام بالفعل.";
  if (/class_sections_year_id_grade_code_name_key/.test(m)) return "اسم الفصل مكرر في هذه المرحلة.";
  if (/academic_years_name_key/.test(m)) return "اسم العام مستخدم.";
  if (/academic_years_one_current/.test(m)) return "يوجد عام دراسي حالي بالفعل.";
  if (/ministry_no/.test(m)) return "الرقم الوزاري مستخدم.";
  if (/العام الدراسي مغلق/.test(m)) return "العام الدراسي مغلق ولا يمكن تعديل بياناته.";
  if (/row-level security/.test(m)) return "لا تملك صلاحية تنفيذ هذه العملية.";
  if (/violates foreign key/.test(m)) return "السجل مرتبط ببيانات أخرى ولا يمكن حذفه.";
  return m;
}
async function api(path, body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(FN + path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token, apikey: APP_CONFIG.supabaseKey }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(({ account_exists: "للمنسوب حساب بالفعل", password_too_short: "كلمة المرور أقصر من 8 أحرف", invalid_email: "بريد غير صالح", invalid_login_id: "المعرّف من 3 إلى 40 خانة: أرقام أو حروف إنجليزية، ويمكن استخدام . _ -", login_id_taken: "هذا المعرّف مستخدم لحساب آخر", email_taken: "هذا البريد مستخدم لحساب آخر", email_required: "لا يمكن حذف بريد حساب يدخل بالبريد؛ حوّله إلى معرّف أولاً", no_account: "لا حساب لهذا المنسوب", admin_protected: "هذا حساب محمي: يعدّله مدير النواة فقط", forbidden: "غير مصرح" })[j.error] || j.error || "فشل الطلب"); return j;
}

// تصدير جدول إلى Excel
function exportXlsx(name, headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "البيانات"); XLSX.writeFile(wb, `${name}-${today()}.xlsx`);
}
// رابط موقّع لملف في حاوية الوسائط الخاصة
async function signed(path) { if (!path) return null; const r = await sb.storage.from("registry-media").createSignedUrl(path, 3600); return r.data?.signedUrl || null; }
// صورة المنسوب الموحّدة: صورة الملف المهني (pc-avatars) أولاً، وإلا صورة سجل النواة
async function avatarMap() { const { data } = await sb.from("pc_profiles").select("staff_id,avatar_path").not("avatar_path", "is", null); return new Map((data || []).map((x) => [x.staff_id, x.avatar_path])); }
async function staffPhoto(r, map) { const ap = map && map.get(r.id); return ap ? `${APP_CONFIG.supabaseUrl}/storage/v1/object/public/pc-avatars/${ap.split("/").map(encodeURIComponent).join("/")}` : signed(r.photo_path); }
async function uploadMedia(folder, id, file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("الصور بصيغة JPG أو PNG أو WebP فقط");
  if (file.size > 5 * 1024 * 1024) throw new Error("الصورة أكبر من 5 ميجابايت");
  const path = `${folder}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${file.type.split("/")[1]}`;
  const r = await sb.storage.from("registry-media").upload(path, file, { contentType: file.type }); if (r.error) throw new Error(r.error.message.includes("row-level") ? "لا تملك صلاحية رفع الصور" : r.error.message); return path;
}
// سجل التغييرات لسجل واحد (يظهر وفق صلاحيات القراءة على جدول التدقيق)
async function showHistory(table, id, title) {
  let q = sb.from("audit_logs").select("*").eq("table_name", table); if (id) q = q.eq("record_id", id);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(60);
  const diff = (a) => {
    if (a.action !== "UPDATE") return a.action === "INSERT" ? "إنشاء السجل" : "حذف السجل";
    const o = a.old_data || {}, n = a.new_data || {}; const ch = Object.keys(n).filter((k) => !["updated_at", "is_active"].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
    return ch.map((k) => `${esc(FIELD_AR[k] || k)}: ${esc(o[k] ?? "—")} ← ${esc(n[k] ?? "—")}`).join("<br>") || "—";
  };
  const md = modal(`<h3>سجل التغييرات: ${esc(title)}</h3>${error ? '<p class="err">لا تملك صلاحية عرض السجل.</p>' : `<div class="tw"><table><thead><tr><th>التاريخ</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>${(data || []).map((a) => `<tr><td>${fmtT(a.created_at)}</td><td>${L.act[a.action] || a.action}</td><td>${diff(a)}</td></tr>`).join("") || '<tr><td colspan="3">لا توجد تغييرات مسجلة.</td></tr>'}</tbody></table></div>`}<div class="acts mt"><button class="btn sec" id="cx">إغلاق</button></div>`, true);
  md.el.querySelector("#cx").onclick = md.close;
}

ICONS.assign = '<path d="M9 3h6l1 2h3v16H5V5h3zM9 13l2 2 4-4"/>';
ICONS.book = '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 20.5V5.5M8 7h8M8 11h6"/>';
ICONS.flag = '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>';
ICONS.cal = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>';
ICONS.eye = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
ICONS.pulse = '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>';
// القائمة: 7 تبويبات في ثلاث مجموعات (الرئيسية · السجلات الأربعة · العمل والإدارة). [href, الاسم, الأيقونة, الوصف, الصلاحية, الشارة, المجموعة]
const NAV = [["lbeed.html", "الرئيسية", "home", "مؤشرات المدرسة وما يجري في أنظمتها الآن", null, null, "home"],
  ["school.html", "المدرسة", "school", "الملف والقيادة والأعوام والمراحل والفصول وإسناد التدريس", null, null, "reg"],
  ["staff.html", "المنسوبون", "users", "سجل المنسوبين وحساباتهم وأدوارهم وصلاحياتهم ونشرهم في الموقع", "personnel:view|users:manage", "personnel_total", "reg"],
  ["students.html", "المتعلمون", "cap", "الهوية والتسجيل لكل عام", "students:view", "students_total", "reg"], ["facilities.html", "المرافق", "building", "الموقع والمسؤولون والتجهيزات", null, "facilities_total", "reg"],
  ["assignments.html", "التكليفات", "assign", "التكليفات الأساسية والفرعية والإقرار والمتابعة، ودليل الوظائف المرجعي", null, null, "work"], ["profile.html", "حسابي", "user", "بياناتي وتغيير كلمة المرور", null, null, "work"],
  ["settings.html", "إدارة البوابة", "gear", "الأنظمة المرتبطة والمفاتيح والسجلات والتكامل", "admin", null, "work"]];
// الصفحات الفرعية: تبويبات داخل تبويب رئيسي واحد. [href, الاسم, الصلاحية, الأيقونة]
const SUBNAV = {
  "school.html": [["school.html#profile", "بيانات المدرسة", null, "school"], ["school.html#lead", "القيادة المدرسية", null, "flag"], ["school.html#years", "الأعوام الدراسية", null, "cal"], ["school.html#classes", "المراحل والفصول", null, "grid"], ["teaching.html", "إسناد التدريس", "school:view", "book"]],
  "staff.html": [["access.html", "المنسوبون والحسابات", "users:manage", "users"], ["staff.html", "سجل المنسوبين", "personnel:view", "users"], ["publish.html", "النشر في الموقع", "admin", "globe"]],
  "assignments.html": [["assignments.html", "التكليفات", null, "assign"], ["guide.html", "الدليل المرجعي", "admin", "book"]] };
const NAV_PARENT = { "teaching.html": "school.html", "access.html": "staff.html", "publish.html": "staff.html", "guide.html": "assignments.html", "assignment.html": "assignments.html" };
// مؤشرات المدرسة (كانت في «مكتبي الإلكتروني»): تظهر أعلى الرئيسية للوحة المنسق
async function kpiStrip(host, c) {
  const P = { users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.9.7 3.2 2.3 3.5 5.2"/>', cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    building: '<path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M16 9h2a2 2 0 012 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>', seat: '<path d="M5 11V8a3 3 0 013-3h8a3 3 0 013 3v3M3 14a2 2 0 014 0v2h10v-2a2 2 0 014 0v4H3zM6 18v2M18 18v2"/>' };
  const { data: s } = await sb.rpc("school_stats"); const d = s || {};
  const k = (i, v, t, n, h) => `<a class="kpi k${n}" href="${h}" style="text-decoration:none;color:inherit"><div class="ic"><svg viewBox="0 0 24 24">${P[i]}</svg></div><div><b>${v ?? 0}</b><span>${t}</span></div></a>`;
  const sv = c.can("personnel:view") || c.can("users:manage");
  host.innerHTML = (d.current_year || !c.isAdmin ? "" : '<div class="alert"><a href="school.html#years">إنشاء العام الدراسي الأول ←</a></div>') +
    `<div class="grid kp-home">${k("users", d.personnel_total, "إجمالي المنسوبين", 0, sv ? "staff.html" : "#")}${k("cap", d.students_total, "المتعلمون المنتظمون", 1, c.can("students:view") ? "students.html" : "#")}${k("grid", d.classes_total, "الفصول الدراسية", 2, "school.html#classes")}${k("building", d.facilities_total, "المرافق", 3, "facilities.html")}${k("seat", d.capacity, "الطاقة الاستيعابية", 4, "facilities.html")}</div>`;
}
async function boot(page, render, o = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return; }
  // خطأ في القراءة (صلاحيات/شبكة) لا يعني أن الحساب غير مرتبط: لا نُخرج المستخدم بسببه.
  const fail = (err) => {
    console.error(err);
    const msg = /permission denied|row-level security/i.test(err?.message || "") ? "لا تملك حسابك صلاحية قراءة بياناتك من النواة. تواصل مع مدير النظام." : "تعذر الاتصال بالخادم أو التحقق من حسابك.";
    document.getElementById("shell").innerHTML = `<main class="wrap"><div class="card" style="max-width:520px;margin:48px auto"><h3 style="margin-top:0">تعذر فتح لوحة التحكم</h3><p class="err">${esc(msg)}</p><div class="acts mt"><button class="btn" id="rt">إعادة المحاولة</button><button class="btn sec" id="lo">تسجيل الخروج</button></div></div></main>`;
    document.getElementById("rt").onclick = () => location.reload();
    document.getElementById("lo").onclick = () => doLogout();
  };
  const { data: me, error: meErr } = await sb.from("staff_members").select("id,full_name,category,job_title").eq("user_id", session.user.id).maybeSingle();
  if (meErr) { fail(meErr); return; }
  if (!me) { await doLogout("login.html?e=nostaff"); return; }
  const { data: adm, error: admErr } = await sb.rpc("is_core_admin"); if (admErr) { fail(admErr); return; } let isAdmin = adm === true;
  const { data: pr, error: prErr } = await sb.from("staff_permissions").select("permission_code").eq("staff_id", me.id); if (prErr) { fail(prErr); return; }
  const have = new Set((pr || []).map((x) => x.permission_code));
  let can = (code) => {
    if (isAdmin) return true; const [r, l] = code.split(":");
    return ({ view: [`${r}:view`, `${r}:add`, `${r}:edit`], add: [`${r}:add`, `${r}:edit`] }[l] || [code]).some((x) => have.has(x));
  };
  // المنسوب بلا صلاحيات على سجلات النواة: لوحته «حسابي» فقط (ما يُنشر موجود في الموقع العام)
  let staffOnly = !isAdmin && !["school:view", "personnel:view", "personnel_contact:view", "students:view", "facilities:view", "users:manage"].some(can);
  // تبديل الدور: من يدير سجلات النواة يختار بين لوحة المنسق (السجلات والإدارة) ولوحة المعلم (حسابي وتكليفاتي ويحدث في لبيد)
  const rvCan = !staffOnly, rvView = window.RoleSwitch ? RoleSwitch.view("core", session.user.id, rvCan) : "coord", asCoord = rvCan && rvView === "coord";
  if (rvCan && !asCoord) { isAdmin = false; can = () => false; staffOnly = true; }
  if (staffOnly && !["profile.html", "password.html", "inbox.html", "assignments.html", "assignment.html", "lbeed.html"].includes(page)) { location.replace("profile.html"); return; }
  if ((o.admin && !isAdmin) || (o.perm && !can(o.perm))) { location.replace("lbeed.html"); return; }
  // من يدير المستخدمين يجد السجل كاملاً مع التعديل في «المنسوبون والحسابات»، فلا يُعرض له سجل الاطلاع المكرر
  if (page === "staff.html" && can("users:manage")) { location.replace("access.html" + location.search); return; }
  const ctx = { me, isAdmin, can, staffOnly, uid: session.user.id, rvCan, asCoord };
  const allow = (p) => !p || (p === "admin" ? isAdmin : p.split("|").some(can));
  const subsOf = (h) => (SUBNAV[h] || []).filter((x) => allow(x[2]) && !(x[0] === "staff.html" && can("users:manage")));
  const items = staffOnly ? NAV.filter((n) => n[0] === "profile.html" || n[0] === "assignments.html" || n[0] === "lbeed.html").map((n) => n[0] === "assignments.html" ? [n[0], "تكليفاتي", ...n.slice(2)] : n[0] === "lbeed.html" ? [n[0], "يحدث في لبيد", n[2], "نافذة موحدة لما يجري في أنظمة المدرسة (قراءة فقط)", ...n.slice(4)] : n)
    : NAV.filter((n) => allow(n[4]) && !(asCoord && n[0] === "profile.html")).map((n) => { const f = subsOf(n[0])[0]; return f ? [f[0], ...n.slice(1), n[0]] : [...n, n[0]]; });
  const parent = staffOnly ? page : (NAV_PARENT[page] || page);
  const cur = items.find((n) => (n[7] || n[0]) === parent) || NAV.find((n) => n[0] === page) || [page, o.title || "لوحة التحكم", "grid", o.desc || "لوحة تحكم النواة الرقمية"];
  const subs = staffOnly ? [] : subsOf(parent), subHTML = subs.length > 1 ? `<div class="subnav" role="navigation" aria-label="${esc(cur[1])}">${subs.map(([h, n, , e]) => `<a href="${h}">${ico(e)}${esc(n)}</a>`).join("")}</div>` : "";
  // التبويب الفرعي النشط: الصفحة نفسها، أو الصفحة مع القسم (#) في صفحة «المدرسة»
  const subMark = () => { const L = [...document.querySelectorAll(".subnav a")], at = page + location.hash, hit = L.find((a) => a.getAttribute("href") === at) || L.find((a) => a.getAttribute("href").split("#")[0] === page);
    L.forEach((a) => { const on = a === hit; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
    if (hit) { const w = hit.parentElement; w.scrollLeft += hit.getBoundingClientRect().left - w.getBoundingClientRect().left - (w.clientWidth - hit.offsetWidth) / 2; } };
  const navHTML = items.map(([h, n, e, t, , bd, g, key], i) => `${i && g !== items[i - 1][6] ? '<span class="dsep" aria-hidden="true"></span>' : ""}<a href="${h}" title="${esc(t)}" class="${(key || h) === parent ? "on" : ""}" ${(key || h) === parent ? 'aria-current="page"' : ""}>${ico(e)}${n}</a>`).join("");
  document.getElementById("shell").innerHTML =
    `<header class="dash"><div class="wrap top">${brandHTML(staffOnly ? "profile.html" : "lbeed.html")}<div class="idl"><a class="sitelink" href="index.html">الموقع الإلكتروني</a>${headMoe}</div></div>
     <div class="strip" aria-hidden="true"></div>
     <div class="dnav"><div class="wrap dn"><button type="button" class="dmb" id="dmb" aria-expanded="false" aria-controls="dnavIn">${ico("menu")}<span class="dmb-t">القائمة</span><svg class="dmb-ch" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="dnav-in" id="dnavIn">${navHTML}</div>
     <div class="dwho">${ubBarHTML(me.full_name, "profile.html", "password.html")}</div></div></div></header>
     <div class="pagebar"><div class="wrap pb"><div class="pb-t"><small>${isAdmin ? "مدير النواة الرقمية" : "لوحة التحكم"}</small><h1>${ico(cur[2])}${esc(cur[1])}</h1></div><p class="pb-d">${esc(cur[3])}</p>
     <div class="pb-u"><span id="pbTime"></span><button class="btn sec sm" id="pbRefresh" type="button">${ico("refresh")}تحديث</button></div></div></div>
     <div class="wrap" id="topnote"></div>${subHTML ? `<div class="wrap subnav-w">${subHTML}</div>` : ""}<main class="wrap" id="main"></main>${footerHTML}`; bindNav();
  subMark(); addEventListener("hashchange", subMark);
  // قائمة الجوال: زر «القائمة» يفتح لائحة عمودية بكل التبويبات (على الشاشات العريضة يبقى الشريط الأفقي كما هو)
  (() => { const d = document.querySelector(".dnav"), b = document.getElementById("dmb"); if (!d || !b) return;
    const set = (o) => { d.classList.toggle("open", o); b.setAttribute("aria-expanded", o); };
    b.onclick = (e) => { e.stopPropagation(); set(!d.classList.contains("open")); };
    d.querySelector(".dnav-in").addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("click", (e) => { if (!d.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && d.classList.contains("open")) { set(false); b.focus(); } });
    matchMedia("(min-width:761px)").addEventListener("change", (m) => { if (m.matches) set(false); });
  })();
  if (window.PK && page === "settings.html") PK.mountAdminSection({ sb, system: "core", central: true, after: "#main" });
  if (window.PK) { PK.fitNav(document.querySelector(".dnav-in"));
    PK.mountAnnouncements({ sb, system: "core", page: (page === "lbeed.html" && !staffOnly) || (staffOnly && page === "profile.html") ? "home" : "all", before: ".pagebar" });
    if ((page === "lbeed.html" && !staffOnly) || (staffOnly && page === "profile.html")) { const wc = PK.welcome("#main", { mode: "before", sb, name: me.full_name, role: isAdmin ? "مدير النواة الرقمية" : can("users:manage") ? "مدير المستخدمين والصلاحيات" : staffOnly ? "منسوب" : "مشرف على سجلات النواة" });
      // لوحة المعلم: رابط الملف المهني (في المجتمع المهني الذكي) بجانب «منسوب»
      const rp = staffOnly && wc && wc.querySelector(".pk-wc-t p"); if (rp) rp.insertAdjacentHTML("afterend", '<a class="pk-wc-pf" href="/teachers-community/#/home/profile">زيارة الملف المهني <span aria-hidden="true">←</span></a>'); } }
  document.getElementById("pbTime").textContent = "حُدِّثت " + new Date().toLocaleTimeString("ar-SA-u-ca-gregory-nu-latn", { hour: "numeric", minute: "2-digit" });
  document.getElementById("pbRefresh").onclick = () => location.reload();
  document.getElementById("out").onclick = (e) => { e.preventDefault(); doLogout(); };
  // الإشعارات: كلمة المرور الافتراضية لكل منسوب، ولمدير النواة آخر العمليات على سجلات النواة من غيره (مجمّعة)، و«مشاهدة الكل» سجل العمليات
  if (window.RoleSwitch) RoleSwitch.mount({ sys: "core", uid: session.user.id, can: rvCan, view: rvView, home: { coord: "lbeed.html", teacher: "profile.html" }, teacherDesc: "حسابي وتكليفاتي", coordDesc: "سجلات النواة والصلاحيات والإدارة" });
  ubMount({ key: "core", uid: session.user.id, allUrl: "inbox.html", load: async () => {
    const N = [];
    const { data: pv } = await sb.from("staff_private").select("must_change_password").eq("staff_id", me.id).maybeSingle();
    if (pv?.must_change_password) N.push({ id: "pw", tone: "warn", icon: "lock", href: "password.html", title: "غيّر كلمة المرور الافتراضية", body: "تدخل بكلمة المرور الموحدة. غيّرها من «حسابي» لحماية حسابك." });
    const { data: ap } = await sb.from("assignments").select("id,title,assignment_no,status,assignment_versions(version_no,issued_at,ack_at)").eq("staff_id", me.id).eq("status", "issued");
    (ap || []).forEach((x) => { const v = (x.assignment_versions || []).filter((y) => y.issued_at).sort((p, q) => q.version_no - p.version_no)[0];
      if (v && !v.ack_at) N.push({ id: "asg:" + x.id + ":" + v.version_no, t: v.issued_at, tone: "warn", icon: "file", href: "assignment.html?id=" + x.id, title: v.version_no > 1 ? "تحديث على تكليفك بانتظار إقرارك" : "تكليف جديد بانتظار اطلاعك وإقرارك", body: x.title }); });
    if (isAdmin) {
      const { data: L } = await sb.from("audit_logs").select("id,actor_id,action,table_name,created_at").neq("actor_id", session.user.id).not("table_name", "like", "mirat.%").order("created_at", { ascending: false }).limit(400);
      const T = { students: "المتعلمين", student_enrollments: "قيود المتعلمين", student_private: "بيانات تواصل المتعلمين", student_guardians: "أولياء الأمور", guardians: "أولياء الأمور", staff_members: "المنسوبين", staff_private: "البيانات الخاصة للمنسوبين", staff_roles: "الأدوار", staff_permissions: "الصلاحيات", teaching_assignments: "إسناد التدريس", assignments: "التكليفات", assignment_versions: "إصدارات التكليفات", subjects: "المواد الدراسية", facilities: "المرافق", facility_equipment: "تجهيزات المرافق", class_sections: "الفصول", academic_years: "الأعوام الدراسية", school_profile: "بيانات المدرسة", school_leadership: "المواقع القيادية", systems: "الأنظمة" };
      const AC = { INSERT: ["إضافة", "ok", "inbox"], UPDATE: ["تعديل", "info", "file"], DELETE: ["حذف", "bad", "x"] };
      const rows = (L || []).filter((r) => T[r.table_name] && AC[r.action]);
      const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))];
      const nm = {}; if (ids.length) { const { data: S } = await sb.from("staff_members").select("user_id,full_name").in("user_id", ids); (S || []).forEach((x) => (nm[x.user_id] = x.full_name)); }
      const G = new Map();
      rows.forEach((r) => { const day = new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }), k = [r.actor_id, r.table_name, r.action, day].join("|");
        const g = G.get(k); if (g) g.n++; else G.set(k, { r, n: 1, day }); });
      [...G.values()].slice(0, 12).forEach(({ r, n, day }) => N.push({ id: "a:" + r.id + ":" + n, t: r.created_at, tone: AC[r.action][1], icon: AC[r.action][2], href: "settings.html?tab=audit",
        title: `${AC[r.action][0]} في ${T[r.table_name]}${n > 1 ? ` (${n === 2 ? "سجلان" : n <= 10 ? n + " سجلات" : n + " سجلاً"})` : ""}`, body: `بواسطة ${nm[r.actor_id] || "النظام"}` }));
    }
    return N;
  } });
  const main = document.getElementById("main");
  // تنبيه دائم ما دامت كلمة المرور هي الافتراضية (يختفي بعد تغييرها من «حسابي»)
  sb.from("staff_private").select("must_change_password").eq("staff_id", me.id).maybeSingle().then(({ data }) => {
    if (!data?.must_change_password || page === "profile.html" || page === "password.html") return;
    const a = document.createElement("div"); a.className = "alert"; a.setAttribute("role", "status");
    a.innerHTML = 'تدخل بكلمة المرور الافتراضية. غيّرها من <a href="password.html"><b>تغيير كلمة المرور</b></a> لحماية حسابك.';
    a.style.marginTop = "14px"; document.getElementById("topnote").appendChild(a);
  });
  try { await render(main, ctx); } catch (e) { console.error(e); main.innerHTML = '<p class="err">تعذر تحميل الصفحة.</p>'; }
}

// واجهة استيراد Excel مشتركة بين السجلات. cfg: { registry, table, label, fields:[[key,label,[synonyms]]], sample:[...], prepare(), plan(get,ctx,seen,i)->{errs,mid,rec,name}, create(rec,ctx,uid)->id, update(id,rec,ctx), noRollback }
function importUI(host, cfg, c, onDone) {
  const nrm = (s) => String(s ?? "").trim();
  host.innerHTML = `<div class="card"><h3 class="sec" style="margin-top:0">استيراد ${esc(cfg.label)} من Excel</h3><p class="sub">معاينة ومطابقة وفحص التكرار قبل التنفيذ، وتُستورد الصفوف الصحيحة فقط.</p>
    <div class="acts"><button class="btn sec" id="tpl">تنزيل القالب</button><input type="file" id="fl" accept=".xlsx,.xls,.csv" style="width:auto"></div><div id="map" class="mt"></div><div id="prev" class="mt"></div></div>`;
  host.querySelector("#tpl").onclick = () => exportXlsx(`قالب-${cfg.label}`, cfg.fields.map((f) => f[1].replace(" *", "")), [cfg.sample]);
  let data = [], plan = [], fname = "", cx = null;
  host.querySelector("#fl").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return; fname = f.name;
    if (f.size > 5 * 1024 * 1024) { toast("الملف أكبر من 5 ميجابايت", true); return; }
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }); if (!data.length) { toast("الملف فارغ", true); return; }
    const cols = Object.keys(data[0]);
    host.querySelector("#map").innerHTML = `<h3 class="sec">مطابقة الأعمدة (${data.length} صف)</h3><div class="fg">${cfg.fields.map(([k, l, syn]) => {
      const g = cols.find((x) => syn.some((s) => nrm(x) === s));
      return `<div><label>${esc(l)}</label><select data-f="${k}"><option value="">—</option>${cols.map((x) => `<option ${x === g ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>`;
    }).join("")}</div><div class="acts mt"><button class="btn" id="pv">معاينة وفحص</button></div>`;
    host.querySelector("#prev").innerHTML = ""; host.querySelector("#pv").onclick = preview;
  };
  async function preview() {
    const map = Object.fromEntries([...host.querySelectorAll("[data-f]")].map((s) => [s.dataset.f, s.value]));
    const req = cfg.fields.filter((f) => f[1].includes("*") && !map[f[0]]); if (req.length) { toast("حدد عمود: " + req.map((f) => f[1].replace(" *", "")).join("، "), true); return; }
    cx = await cfg.prepare(); const seen = new Set();
    plan = data.map((r, i) => { const get = (k) => (map[k] ? r[map[k]] : ""); const p = cfg.plan(get, cx, seen, i); return { i: i + 2, ...p }; });
    const ok = plan.filter((p) => !p.errs.length), nw = ok.filter((p) => !p.mid).length, bad = plan.length - ok.length;
    host.querySelector("#prev").innerHTML = `<h3 class="sec">نتيجة الفحص</h3><div class="grid"><div class="card stat"><b>${nw}</b><span>جديد</span></div><div class="card stat"><b>${ok.length - nw}</b><span>تحديث لسجل قائم</span></div><div class="card stat"><b>${bad}</b><span>أخطاء (لن تُستورد)</span></div></div>
      ${bad ? `<div class="tw mt"><table><thead><tr><th>الصف</th><th>الاسم</th><th>الخطأ</th></tr></thead><tbody>${plan.filter((p) => p.errs.length).map((p) => `<tr><td>${p.i}</td><td>${esc(p.name)}</td><td class="err">${esc(p.errs.join("، "))}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="acts mt"><button class="btn" id="go" ${ok.length ? "" : "disabled"}>استيراد الصحيح فقط (${ok.length})</button></div>`;
    host.querySelector("#go").onclick = () => run(ok);
  }
  async function run(ok) {
    const btn = host.querySelector("#go"); btn.disabled = true; btn.textContent = "جارٍ الاستيراد…";
    const created = [], errors = []; let upd = 0;
    for (const p of ok) {
      try { if (p.mid) { await cfg.update(p.mid, p.rec, cx); upd++; } else created.push(await cfg.create(p.rec, cx, c.uid)); } catch (e) { errors.push({ row: p.i, error: mapErr(e) }); }
    }
    const skipped = plan.length - ok.length + errors.length;
    await sb.from("import_jobs").insert({ registry: cfg.registry, file_name: fname, status: errors.length && !created.length && !upd ? "failed" : "completed", total_rows: plan.length, created_count: created.length, updated_count: upd, skipped_count: skipped, error_report: [...plan.filter((p) => p.errs.length).map((p) => ({ row: p.i, error: p.errs.join("، ") })), ...errors], created_ids: created, created_by: c.uid });
    toast(`أُنشئ ${created.length} وحُدّث ${upd} وتُجوهل ${skipped}`); host.innerHTML = ""; onDone && onDone();
  }
}
