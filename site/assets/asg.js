// أدوات مشتركة لوحدة التكليفات: المسميات وحساب الحالة المعروضة.
const ASG = {
  kind: { primary: "أساسي", secondary: "فرعي" },
  nature: { official_post: "تكليف بمهمة أو منصب رسمي", extra_task: "تكليف بمهمة إضافية" },
  exec: { not_started: "لم يبدأ", in_progress: "جارٍ التنفيذ", completed: "مكتمل" },
  vers(a) { return [...(a.assignment_versions || [])].sort((x, y) => y.version_no - x.version_no); },
  latest(a) { const v = this.vers(a); return v.find((x) => x.version_no === a.current_version) || v[0]; },
  issued(a) { return this.vers(a).find((x) => x.issued_at); },
  // الإقرار منفصل عن التنفيذ: الحالة المعروضة تجمعهما للقراءة فقط
  state(a) {
    const iv = this.issued(a), t = new Date().toISOString().slice(0, 10);
    if (a.status === "cancelled") return ["ملغى", "bad", "closed"];
    if (a.status === "draft" || !iv) return ["مسودة", "", "draft"];
    if (a.status === "ended") return ["منتهٍ", "bad", "closed"];
    if (!iv.ack_at) return ["صادر بانتظار اطلاع الموظف", "warn", "pending"];
    if (a.exec_status === "completed") return ["مكتمل", "ok", "closed"];
    if (iv.end_date < t) return ["منتهٍ", "bad", "closed"];
    if (a.exec_status === "in_progress") return ["جارٍ التنفيذ", "ok", "active"];
    return ["تم الاطلاع والإقرار", "ok", "active"];
  },
  badge(a) { const [l, c] = this.state(a); return `<span class="badge ${c}">${esc(l)}</span>`; },
  period(v) { return v ? `${fmt(v.start_date)} – ${fmt(v.end_date)}` : "—"; },
  // يعرض المهام سطراً سطراً
  tasks(t) { const L = String(t || "").split("\n").map((x) => x.trim()).filter(Boolean); return L.length ? `<ol class="asg-ol">${L.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : '<span class="sub">—</span>'; },
};
