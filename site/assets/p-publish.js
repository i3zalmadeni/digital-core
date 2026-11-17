boot("publish.html", async (m) => { m.innerHTML = head("النشر في الموقع العام", "تحكم مدير النواة بما يظهر في الموقع العام: المفتاح العام للمدرسة ونشر المنسوبين.") + '<div id="pubpanel"></div>'; await publishPanel(m.querySelector("#pubpanel")); }, { admin: true });

// النشر في الموقع العام (لمدير النواة): المفتاح العام للمدرسة + نشر المنسوبين فرداً أو جماعياً
async function publishPanel(host) {
  let P = {}, rows = [], q = "", flt = "all"; const sel = new Set();
  const load = async () => {
    const [a, b] = await Promise.all([sb.from("school_profile").select("publish_public").maybeSingle(),
      sb.from("staff_members").select("id,full_name,specialty,photo_path,public_photo_path,publish_public,job_titles(name_ar)").eq("is_active", true).order("full_name")]);
    P = a.data || {}; rows = b.data || [];
  };
  const vis = () => rows.filter((r) => (!q || r.full_name.includes(q) || (r.specialty || "").includes(q)) && (flt === "all" || (flt === "pub" ? r.publish_public : !r.publish_public)));
  function draw() {
    const pub = rows.filter((r) => r.publish_public).length, V = vis(), on = !!P.publish_public;
    host.innerHTML = `<div class="card">
      <div class="bar"><div><b>المفتاح العام للمدرسة:</b> <span class="badge ${on ? "ok" : ""}">${on ? "مفعّل" : "متوقف"}</span><br><small class="sub">${on ? "الموقع العام يعرض ملخص المدرسة والمنسوبين المنشورين." : "لن يظهر أي منسوب ولا ملخص المدرسة في الموقع العام حتى تفعّل هذا المفتاح."}</small></div>
        <button class="btn ${on ? "sec" : ""}" id="pg" style="flex:0 0 auto">${on ? "إيقاف النشر العام" : "تفعيل النشر العام"}</button></div>
      <p class="sub">منشور من المنسوبين: <b>${pub}</b> من <b>${rows.length}</b> منسوباً على رأس العمل. لا يظهر في الموقع إلا من فُعّل نشره هنا (الاسم والصورة والوظيفة والتخصص فقط).</p>
      <div class="bar"><input id="pq" placeholder="بحث بالاسم أو التخصص" value="${esc(q)}"><select id="pf"><option value="all" ${flt === "all" ? "selected" : ""}>الكل</option><option value="no" ${flt === "no" ? "selected" : ""}>غير المنشورين</option><option value="pub" ${flt === "pub" ? "selected" : ""}>المنشورون</option></select>
        <button class="btn" id="bp">نشر المحدد (${sel.size})</button><button class="btn sec" id="bu">إلغاء نشر المحدد</button><button class="btn gold" id="ba">نشر كل غير المنشورين</button></div>
      <div class="tw"><table><thead><tr><th><input type="checkbox" id="ck" style="width:auto" aria-label="تحديد الكل"></th><th>الاسم</th><th>المسمى</th><th>التخصص</th><th>الحالة</th></tr></thead><tbody>${V.map((r) => `<tr><td><input type="checkbox" data-i="${r.id}" style="width:auto" ${sel.has(r.id) ? "checked" : ""}></td><td>${esc(r.full_name)}</td><td>${esc(r.job_titles?.name_ar || "—")}</td><td>${esc(r.specialty || "—")}</td><td><span class="badge ${r.publish_public ? "ok" : ""}">${r.publish_public ? "منشور" : "غير منشور"}</span></td></tr>`).join("") || '<tr><td colspan="5">لا توجد نتائج.</td></tr>'}</tbody></table></div>
      <p class="sub"><a href="people.html">معاينة صفحة المنسوبين</a> · <a href="index.html">معاينة الرئيسية</a></p></div>`;
    host.querySelector("#pg").onclick = async () => {
      const r = await sb.from("school_profile").update({ publish_public: !on }).eq("id", true); if (r.error) { toast(mapErr(r.error), true); return; }
      toast(on ? "أُوقف النشر العام" : "فُعّل النشر العام"); await load(); draw();
    };
    host.querySelector("#pq").oninput = (e) => { q = e.target.value.trim(); const pos = e.target.selectionStart; draw(); const i = host.querySelector("#pq"); i.focus(); i.setSelectionRange(pos, pos); };
    host.querySelector("#pf").onchange = (e) => { flt = e.target.value; draw(); };
    host.querySelector("#ck").onchange = (e) => { V.forEach((r) => (e.target.checked ? sel.add(r.id) : sel.delete(r.id))); draw(); };
    host.querySelectorAll("[data-i]").forEach((x) => (x.onchange = () => { x.checked ? sel.add(x.dataset.i) : sel.delete(x.dataset.i); host.querySelector("#bp").textContent = `نشر المحدد (${sel.size})`; }));
    host.querySelector("#bp").onclick = () => run(rows.filter((r) => sel.has(r.id) && !r.publish_public), true);
    host.querySelector("#bu").onclick = () => run(rows.filter((r) => sel.has(r.id) && r.publish_public), false);
    host.querySelector("#ba").onclick = () => run(rows.filter((r) => !r.publish_public), true);
  }
  async function run(list, publish) {
    if (!list.length) { toast("لا يوجد منسوبون مطابقون للإجراء", true); return; }
    if (!confirm(publish ? `نشر ${list.length} منسوباً في الموقع العام؟ تأكد من موافقتهم على ظهور الاسم والصورة والوظيفة والتخصص.` : `إلغاء نشر ${list.length} منسوباً من الموقع العام؟`)) return;
    let bad = 0;
    for (const r of list) {
      try {
        const patch = { publish_public: publish };
        if (!publish) { if (r.public_photo_path) { await sb.storage.from("public-photos").remove([r.public_photo_path]); patch.public_photo_path = null; } }
        else if (r.photo_path && !r.public_photo_path) {
          const d = await sb.storage.from("registry-media").download(r.photo_path);
          if (!d.error) { const type = d.data.type || "image/jpeg", path = `personnel/${r.id}/${Date.now()}.${type.split("/")[1]}`; const u = await sb.storage.from("public-photos").upload(path, d.data, { contentType: type }); if (!u.error) patch.public_photo_path = path; }
        }
        const res = await sb.from("staff_members").update(patch).eq("id", r.id); if (res.error) throw res.error;
      } catch (x) { console.error(x); bad++; }
    }
    sel.clear(); toast(bad ? `تم مع تعذّر ${bad} سجل` : publish ? "تم النشر" : "تم إلغاء النشر", !!bad); await load(); draw();
  }
  await load(); draw();
}
