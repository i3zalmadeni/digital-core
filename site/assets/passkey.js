// الدخول بالبصمة (بصمة الوجه أو الإصبع) عبر WebAuthn. التحقق يتم داخل الجهاز ولا يُرسل أي شيء بيومتري.
// يحتاج: APP_CONFIG (config.js). المفتاح مرتبط بنطاق i3zalmadeni.github.io فيصلح لجميع الأنظمة.
(function () {
  const FN = APP_CONFIG.supabaseUrl + "/functions/v1/core-api";
  const toB = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); const b = atob(s.padEnd(Math.ceil(s.length / 4) * 4, "=")); return Uint8Array.from(b, (c) => c.charCodeAt(0)).buffer; };
  const toS = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const ERR = {
    unauthorized: "انتهت الجلسة. سجّل الدخول ثم أعد المحاولة.", too_many_passkeys: "وصلت إلى الحد الأقصى من الأجهزة. احذف جهازاً قديماً أولاً.",
    already_registered: "هذا الجهاز مفعّل مسبقاً.", challenge_expired: "انتهت مهلة العملية. حاول مرة أخرى.", unknown_passkey: "هذا الجهاز غير مفعّل للدخول بالبصمة. ادخل بكلمة المرور وفعّله.",
    verification_failed: "تعذر التحقق من البصمة.", banned: "هذا الحساب موقوف. راجع مدير النواة.", inactive: "حسابك غير مفعّل في النواة الرقمية. راجع مدير النواة.",
    no_account: "تعذر العثور على الحساب.", session_failed: "تعذر إنشاء الجلسة. حاول مرة أخرى.",
  };
  async function call(path, body, token) {
    let r;
    try {
      r = await fetch(FN + path, { method: "POST", headers: { "content-type": "application/json", apikey: APP_CONFIG.supabaseKey, authorization: "Bearer " + (token || APP_CONFIG.supabaseKey) }, body: JSON.stringify(body || {}) });
    } catch (_) { throw new Error("تعذر الاتصال بالخادم، حاول مرة أخرى."); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(ERR[j.error] || "تعذر إتمام العملية.");
    return j;
  }
  const domErr = (e) => e && e.name === "NotAllowedError" ? "أُلغيت العملية أو لم يتعرف الجهاز على الوجه." : e && e.name === "InvalidStateError" ? "هذا الجهاز مفعّل مسبقاً." : (e && e.message) || "تعذر إتمام العملية.";
  const FLAG = "dc_pk_device", DECL = "dc_pk_declined";
  window.PK = {
    // الجهاز يملك تحققاً بيومترياً (Face ID، Windows Hello، فتح الوجه…) والصفحة في سياق آمن وغير مضمّنة في إطار
    async available() {
      try {
        if (!window.PublicKeyCredential || !window.isSecureContext || window.self !== window.top) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (_) { return false; }
    },
    enrolledHere: () => { try { return localStorage.getItem(FLAG) === "1"; } catch (_) { return false; } },
    declined: () => { try { return localStorage.getItem(DECL) === "1"; } catch (_) { return false; } },
    decline() { try { localStorage.setItem(DECL, "1"); } catch (_) {} },
    async register(sb, label) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error(ERR.unauthorized);
      const o = await call("/passkey/register-options", {}, session.access_token);
      o.challenge = toB(o.challenge); o.user.id = toB(o.user.id);
      o.excludeCredentials = (o.excludeCredentials || []).map((c) => ({ ...c, id: toB(c.id) }));
      let c;
      try { c = await navigator.credentials.create({ publicKey: o }); } catch (e) { throw new Error(domErr(e)); }
      const res = c.response;
      await call("/passkey/register-verify", { label, response: { id: c.id, rawId: toS(c.rawId), type: c.type, authenticatorAttachment: c.authenticatorAttachment, clientExtensionResults: c.getClientExtensionResults(),
        response: { clientDataJSON: toS(res.clientDataJSON), attestationObject: toS(res.attestationObject), transports: res.getTransports ? res.getTransports() : [] } } }, session.access_token);
      try { localStorage.setItem(FLAG, "1"); localStorage.removeItem(DECL); } catch (_) {}
    },
    // يعيد true عند نجاح الدخول (الجلسة تُنشأ في supabase-js ثم تُشارَك بين الأنظمة)
    async login(sb) {
      const o = await call("/passkey/login-options", {});
      o.challenge = toB(o.challenge); o.allowCredentials = [];
      let a;
      try { a = await navigator.credentials.get({ publicKey: o }); } catch (e) { throw new Error(domErr(e)); }
      const res = a.response;
      const v = await call("/passkey/login-verify", { response: { id: a.id, rawId: toS(a.rawId), type: a.type, authenticatorAttachment: a.authenticatorAttachment, clientExtensionResults: a.getClientExtensionResults(),
        response: { clientDataJSON: toS(res.clientDataJSON), authenticatorData: toS(res.authenticatorData), signature: toS(res.signature), userHandle: res.userHandle ? toS(res.userHandle) : undefined } } });
      const { error } = await sb.auth.verifyOtp({ token_hash: v.token_hash, type: "magiclink" });
      if (error) throw new Error(ERR.session_failed);
      try { localStorage.setItem(FLAG, "1"); } catch (_) {}
      return true;
    },
    deviceLabel() {
      const u = navigator.userAgent;
      const os = /iPhone|iPad/.test(u) ? "آيفون/آيباد" : /Android/.test(u) ? "أندرويد" : /Windows/.test(u) ? "ويندوز" : /Mac/.test(u) ? "ماك" : "جهاز";
      return os + " · " + new Date().toLocaleDateString("ar-SA");
    },
  };
})();
