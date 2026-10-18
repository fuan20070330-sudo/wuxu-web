/* =========================================================
   物序 · 相机拍摄模块
   使用浏览器实时摄像头（getUserMedia）在页面内拍照，
   成功后返回图片数据；不支持或被拒绝时由调用方降级为选择照片。
   ========================================================= */
window.Camera = (function () {
  'use strict';
  var stream = null, videoEl = null, resolveFn = null, rejectFn = null;
  var facing = 'environment';

  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function stopStream() {
    if (stream) {
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ }
      stream = null;
    }
    videoEl = null;
  }

  /* 清理并结束当前拍摄流程；cancelled 为真时以“用户取消”拒绝 */
  function cleanup(cancelled, result) {
    stopStream();
    window.__onModalClose = null;
    var r = resolveFn, j = rejectFn;
    resolveFn = null; rejectFn = null;
    if (cancelled) {
      if (j) j(new Error('cancelled'));
    } else if (r) {
      r(result);
    }
  }

  function startCamera() {
    stopStream();
    var constraints = { audio: false, video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } } };
    return navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
      stream = s;
      videoEl = document.getElementById('camVideo');
      if (!videoEl) throw new Error('预览元素缺失');
      videoEl.srcObject = s;
      return videoEl.play().catch(function () { /* 自动播放被拦截时忽略 */ });
    });
  }

  function open() {
    return new Promise(function (resolve, reject) {
      if (!isSupported()) { reject(new Error('浏览器不支持实时拍照')); return; }
      resolveFn = resolve; rejectFn = reject;
      var html = '';
      html += '<div class="modal-head"><h2>拍照</h2><button class="modal-close" onclick="Camera.cancel()">×</button></div>';
      html += '<video id="camVideo" autoplay playsinline muted style="width:100%;max-height:52vh;border-radius:12px;background:#0f172a;object-fit:contain"></video>';
      html += '<div class="muted" style="margin:10px 0 14px">把物品或日期区域放进取景框，画面清晰后点击“拍摄”。</div>';
      html += '<div style="display:flex;gap:8px">';
      html += '<button class="btn btn-primary" style="flex:1" onclick="Camera.shoot()">拍摄</button>';
      html += '<button class="btn btn-ghost" onclick="Camera.flip()">切换镜头</button>';
      html += '</div>';
      openModal(html, true);
      /* 用户点击遮罩关闭时，确保摄像头被释放 */
      window.__onModalClose = function () { if (resolveFn || rejectFn) cleanup(true); };
      startCamera().catch(function (err) {
        window.__onModalClose = null;
        stopStream();
        var j = rejectFn; resolveFn = null; rejectFn = null;
        closeModal();
        if (j) j(err);
      });
    });
  }

  function shoot() {
    if (!videoEl || !videoEl.videoWidth) return;
    var maxSide = 1920;
    var w = videoEl.videoWidth, h = videoEl.videoHeight;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    var dataUrl;
    try { dataUrl = canvas.toDataURL('image/jpeg', 0.92); } catch (e) { dataUrl = null; }
    if (!dataUrl) { return; }
    window.__onModalClose = null;   /* 先解除钩子，避免关闭时被当成取消 */
    closeModal();
    cleanup(false, dataUrl);        /* 返回拍摄结果 */
  }

  function flip() {
    facing = (facing === 'environment') ? 'user' : 'environment';
    startCamera().catch(function () { facing = 'environment'; startCamera().catch(function () { }); });
  }

  function cancel() {
    window.__onModalClose = null;
    closeModal();
    cleanup(true);
  }

  return { open: open, shoot: shoot, flip: flip, cancel: cancel, isSupported: isSupported };
})();
