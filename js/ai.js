/* =========================================================
   物序 · 真实 AI 客户端
   调用 Supabase Edge Function（/functions/v1/ai-recognize），
   密钥保存在服务端；未配置或调用失败时由调用方回退演示数据。
   ========================================================= */
window.AI = (function () {
  'use strict';
  function CFG() { return window.APP_CONFIG || {}; }
  function isReady() { return !!(CFG().SUPABASE_URL && CFG().SUPABASE_ANON_KEY && CFG().AI_ENABLED !== false); }
  function endpoint() {
    if (CFG().AI_ENDPOINT) return String(CFG().AI_ENDPOINT);
    return String(CFG().SUPABASE_URL).replace(/\/+$/, '') + '/functions/v1/ai-recognize';
  }
  function token() {
    try { if (window.Cloud && Cloud.getAccessToken) return Cloud.getAccessToken() || ''; } catch (e) { /* ignore */ }
    return '';
  }
  /* 压缩图片：长边 ≤1280、JPEG 0.8，降低流量与调用成本 */
  function compress(dataUrl, maxSide, quality) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          var s = Math.min(1, (maxSide || 1280) / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * s));
          c.height = Math.max(1, Math.round(h * s));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', quality || 0.8));
        } catch (e) { resolve(dataUrl); }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }
  function recognize(intent, dataUrl, opts) {
    if (!isReady()) return Promise.reject(new Error('AI 未配置'));
    /* 保质期小字需要更高分辨率；物品次之；餐食可更低 */
    var precise = !!(opts && opts.precise);
    var q = precise
      ? (intent === 'expiry' ? { side: 2240, q: 0.95 } : (intent === 'item' ? { side: 1920, q: 0.92 } : { side: 1600, q: 0.88 }))
      : (intent === 'expiry' ? { side: 1920, q: 0.92 } : (intent === 'item' ? { side: 1440, q: 0.85 } : { side: 1280, q: 0.8 }));
    return compress(dataUrl, q.side, q.q).then(function (img) {
      var t = token();
      /* 已登录请求不发送 x-zhiwu-client；兼容尚未更新 CORS 白名单的服务端。体验模式仍发送该标识。 */
      var headers = { 'Content-Type': 'application/json', 'apikey': CFG().SUPABASE_ANON_KEY };
      if (!t) headers['x-zhiwu-client'] = 'web';
      headers['Authorization'] = 'Bearer ' + (t || CFG().SUPABASE_ANON_KEY);
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ } }, 40000);
      var opt = { method: 'POST', headers: headers, body: JSON.stringify({ intent: intent, image: img, precise: precise }) };
      if (ctrl) opt.signal = ctrl.signal;
      return fetch(endpoint(), opt).catch(function (err) {
        if (err && (err.name === 'AbortError' || /aborted/i.test(err.message || ''))) {
          throw new Error('识别超时：网络较慢，请重试或改用更小的照片');
        }
        if (err && err.name === 'TypeError') {
          throw new Error('网络或跨域请求失败：请刷新页面后重试；若仍未恢复，请重新登录后再使用识别');
        }
        throw err;
      }).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
    }).then(function (r) {
      return r.text().then(function (txt) {
        var d = null;
        try { d = JSON.parse(txt); } catch (e) { /* ignore */ }
        if (!r.ok || !d || d.ok === false) throw new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
        try { localStorage.setItem('zhiwu_ai_verified', '1'); } catch (e) { /* ignore */ }
        if (typeof updateModeChip === 'function') updateModeChip();
        return d.data;
      });
    });
  }
  return { isReady: isReady, recognize: recognize, compress: compress };
})();

/* __AI_LOADED_HOOK__ */
if (typeof updateModeChip === 'function') { updateModeChip(); }
