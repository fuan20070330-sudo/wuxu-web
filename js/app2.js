/* =========================================================
   物序 web 演示原型 —— 饮食 / 我的 / 拍照流程（第 1 部分）
   ========================================================= */
var MEALS = [
  { key: 'breakfast', label: '早餐', icon: '' },
  { key: 'lunch', label: '午餐', icon: '' },
  { key: 'dinner', label: '晚餐', icon: '' },
  { key: 'snack', label: '加餐', icon: '' }
];
function mealLabel(key) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i].key === key) return MEALS[i].label; return key; }

/* ---------- 饮食视图 ---------- */
function mealTime(key) {
  return { breakfast: '07:30', lunch: '12:00', dinner: '18:30', snack: '21:00' }[key] || '--:--';
}
function renderDiet() {
  var today = todayISO();
  var m = getMeals(today);
  var all = m.breakfast.concat(m.lunch, m.dinner, m.snack);
  var kcal = sumKcal(all);
  var p = sumNut(all, 'p'), f = sumNut(all, 'f'), c = sumNut(all, 'c');
  var target = (DB.profile && DB.profile.targetKcal) || 1800;
  var pct = Math.min(130, Math.round(kcal / target * 100));
  var pCal = Math.round(p * 4 / Math.max(1, kcal) * 100);
  var fCal = Math.round(f * 9 / Math.max(1, kcal) * 100);
  var cCal = Math.max(0, 100 - pCal - fCal);

  var html = '<section class="diet-head">';
  html += '<div><div class="stage-kicker"><span class="eyebrow-code">04</span><span>FUEL LEDGER</span></div>';
  html += '<h2>今天的能量流向</h2><p>' + today + ' / 目标 ' + target + ' kcal</p></div>';
  html += '<div class="diet-actions"><button class="btn btn-primary btn-sm" onclick="openCapture(\'diet\')">拍照记一餐</button><button class="btn btn-ghost btn-sm" onclick="openManualDiet()">手动记一笔</button></div>';
  html += '</section>';

  html += '<div class="diet-dashboard">';
  html += '<section class="kcal-core">';
  html += '<div class="kcal-topline"><span>INTAKE / TODAY</span><span class="' + (kcal > target ? 'over' : '') + '">' + pct + '% OF GOAL</span></div>';
  html += '<div class="kcal-number">' + kcal + '<span>kcal</span></div>';
  html += '<div class="kcal-goal">' + (kcal > target ? '已超出目标 ' + (kcal - target) + ' kcal' : '剩余 ' + Math.max(0, target - kcal) + ' kcal') + '</div>';
  html += '<div class="kcal-progress"><i style="width:' + Math.min(100, pct) + '%" class="' + (kcal > target ? 'over' : '') + '"></i></div>';
  html += '<div class="macro-grid">';
  html += '<div class="macro-cell"><span>PROTEIN</span><b>' + Math.round(p) + 'g</b><div class="macro-bar"><i style="width:' + Math.min(100, pCal) + '%"></i></div><small>' + pCal + '%</small></div>';
  html += '<div class="macro-cell"><span>FAT</span><b>' + Math.round(f) + 'g</b><div class="macro-bar"><i style="width:' + Math.min(100, fCal) + '%"></i></div><small>' + fCal + '%</small></div>';
  html += '<div class="macro-cell"><span>CARBS</span><b>' + Math.round(c) + 'g</b><div class="macro-bar"><i style="width:' + Math.min(100, cCal) + '%"></i></div><small>' + cCal + '%</small></div>';
  html += '</div></section>';

  html += '<section class="trend-panel"><div class="panel-code">7D INTAKE / TARGET ' + target + '</div>' + trendHTML(target) + '</section>';
  html += '</div>';

  html += '<div class="meal-ledger">';
  MEALS.forEach(function (meal) {
    var arr = m[meal.key] || [];
    html += '<section class="meal-block">';
    html += '<header><span class="meal-stamp">' + mealTime(meal.key) + '</span><b>' + meal.label + '</b><span class="kcal">' + sumKcal(arr) + ' kcal</span></header>';
    html += '<div class="meal-items">';
    if (arr.length === 0) {
      html += '<div class="meal-empty">NO ENTRY / 未记录</div>';
    } else {
      arr.forEach(function (d) {
        html += '<div class="diet-row">';
        html += '<div class="pic">' + pixelFoodIcon(d.name, meal.key) + '</div>';
        html += '<div class="meta"><div class="nm">' + esc(d.name) + (d.isEstimated ? ' <span class="tag">AI估算</span>' : '') + '</div>';
        html += '<div class="sb">' + (d.portion || '') + (d.tip ? ' · ' + esc(d.tip) : '') + '</div></div>';
        html += '<div class="kcal">' + d.kcal + ' <span class="muted">kcal</span></div>';
        html += '<button class="btn btn-sm btn-danger" onclick="dietDelete(\'' + meal.key + '\',\'' + d.id + '\')">×</button>';
        html += '</div>';
      });
    }
    html += '</div></section>';
  });
  html += '</div>';

  html += '<section class="advice-strip"><div class="advice-label">NUTRITION NOTE / 仅供生活参考</div><ul>' + adviceItems(kcal, p, f, c, target) + '</ul></section>';
  $('#view').innerHTML = html;
}
function trendHTML(target) {
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var iso = MOCK.iso(d);
    var m = getMeals(iso);
    var kcal = sumKcal(m.breakfast.concat(m.lunch, m.dinner, m.snack));
    days.push({ iso: iso, kcal: kcal, label: (d.getMonth() + 1) + '/' + d.getDate() });
  }
  var max = Math.max(target * 1.2, 100);
  var html = '<div class="trend">';
  days.forEach(function (x) {
    var hgt = Math.max(3, Math.round(x.kcal / max * 100));
    html += '<div class="bar-col"><div class="bar' + (x.kcal > target ? ' hit' : '') + '" style="height:' + hgt + 'px"></div><span class="lbl">' + x.label + '</span></div>';
  });
  html += '</div>';
  return html;
}

function adviceItems(kcal, p, f, c, target) {
  var out = [];
  if (kcal === 0) {
    out.push('今天还没有饮食记录，记得拍一拍或手动记一笔哦。');
    return out.map(function (s) { return '<li>' + s + '</li>'; }).join('');
  }
  var diff = kcal - target;
  if (diff > 0) out.push('今日摄入 ' + Math.round(diff) + ' kcal 超出目标，建议晚餐/加餐选择清淡蔬果，或多走动消耗。');
  else out.push('今日距目标还差 ' + Math.round(-diff) + ' kcal，注意不要用高糖零食补差。');
  var pKcal = p * 4;
  var pRatio = Math.round(pKcal / Math.max(1, kcal) * 100);
  if (pRatio < 15) out.push('蛋白质占比偏低（约 ' + pRatio + '%），可增加鸡蛋、鸡胸、豆制品或牛奶。');
  var fKcal = f * 9;
  if (fKcal / Math.max(1, kcal) > 0.35) out.push('脂肪占比偏高，留意油炸与酱料，多用蒸煮代替煎炸。');
  if (c > 0 && c > 180) out.push('碳水偏多（约 ' + Math.round(c) + 'g），可把部分精制主食换成粗粮。');
  if (out.length === 0) out.push('今日整体均衡，继续保持规律三餐和足量饮水。');
  return out.map(function (s) { return '<li>' + s + '</li>'; }).join('');
}

/* 删除一条饮食记录 */
function dietDelete(meal, id) {
  var m = getMeals(todayISO());
  m[meal] = (m[meal] || []).filter(function (x) { return x.id !== id; });
  saveDB(); render(); toast('已删除');
}

/* 手动记一笔 */
function openManualDiet() {
  var html = modalHead('手动记一笔');
  html += '<div class="field"><label>食物名称 *</label><input id="md_name" placeholder="如：苹果（1 个）" /></div>';
  html += '<div class="form-grid">';
  html += '<div class="field"><label>热量（千卡）*</label><input id="md_kcal" type="number" min="0" placeholder="如：95" /></div>';
  html += '<div class="field"><label>餐次</label><select id="md_meal">';
  MEALS.forEach(function (x) { html += '<option value="' + x.key + '">' + x.label + '</option>'; });
  html += '</select></div>';
  html += '</div>';
  html += '<button class="btn btn-primary btn-block" onclick="saveManualDiet()">保存</button>';
  openModal(html, true);
}
function saveManualDiet() {
  var name = ($('#md_name').value || '').trim();
  var kcal = parseFloat($('#md_kcal').value);
  if (!name || isNaN(kcal)) { toast('请填写名称与热量'); return; }
  var meal = $('#md_meal').value;
  var m = getMeals(todayISO());
  m[meal].push({ id: uid(), name: name, portion: '1 份', kcal: kcal, p: 0, f: 0, c: 0, isEstimated: false });
  saveDB(); closeModal(); render(); toast('已记录：' + name);
}

/* =========================================================
   第 2 部分：我的 / 拍照识别流程 / 初始化
   ========================================================= */
/* ---------- 我的视图 ---------- */
function renderProfile() {
  var p = DB.profile;
  var s = DB.settings;
  var html = '<section class="settings-head">';
  html += '<div><div class="stage-kicker"><span class="eyebrow-code">05</span><span>SYSTEM PROFILE</span></div><h2>系统设置</h2><p>云端身份 / 健康参数 / 提醒策略 / 数据操作</p></div>';
  html += '</section>';
  html += '<div class="settings-grid">';
  html += accountCardHTML();

  html += '<section class="setting-block"><div class="setting-title"><span>PROFILE</span><h3>健康档案</h3></div>';
  html += '<div class="form-grid">';
  html += '<div class="field"><label>性别</label><select id="p_gender" onchange="saveProfile()">';
  html += '<option value="男"' + (p.gender === '男' ? ' selected' : '') + '>男</option>';
  html += '<option value="女"' + (p.gender === '女' ? ' selected' : '') + '>女</option></select></div>';
  html += '<div class="field"><label>年龄</label><input id="p_age" type="number" min="10" max="100" value="' + (p.age || 22) + '" onchange="saveProfile()" /></div>';
  html += '<div class="field"><label>身高 cm</label><input id="p_height" type="number" value="' + (p.height || 170) + '" onchange="saveProfile()" /></div>';
  html += '<div class="field"><label>体重 kg</label><input id="p_weight" type="number" value="' + (p.weight || 60) + '" onchange="saveProfile()" /></div>';
  html += '<div class="field"><label>活动量</label><select id="p_activity" onchange="saveProfile()">';
  var acts = [[1.2, '久坐（几乎不运动）'], [1.375, '轻度（每周1-3次）'], [1.55, '中度（每周3-5次）'], [1.725, '高度（每周6-7次）']];
  acts.forEach(function (a) {
    html += '<option value="' + a[0] + '"' + (String(p.activity) === String(a[0]) ? ' selected' : '') + '>' + a[1] + '</option>';
  });
  html += '</select></div>';
  html += '<div class="field"><label>目标</label><select id="p_goal" onchange="saveProfile()">';
  var goals = ['减脂', '保持', '增肌'];
  goals.forEach(function (g) { html += '<option' + (p.goal === g ? ' selected' : '') + '>' + g + '</option>'; });
  html += '</select></div>';
  html += '</div>';
  html += '<button class="btn btn-ghost btn-block" onclick="recalcTarget()">按档案重新计算每日目标</button>';
  html += '<div class="muted" id="targetMeta" style="margin-top:8px"></div>';
  html += '</section>';

  html += '<section class="setting-block"><div class="setting-title"><span>ALERT</span><h3>提醒策略</h3></div>';
  html += '<div class="setting-line"><span>提前提醒</span><b>' + (s.remindDays || [30, 7, 3]).join(' / ') + ' 天</b></div>';
  html += '<label class="setting-toggle"><input type="checkbox" id="p_notify"' + (s.notify ? ' checked' : '') + ' onchange="updateNotify(this.checked)" /><span>开启临期提醒（角标 + 时间轴高亮）</span></label>';
  html += '<div class="setting-line"><span>日历输出</span><b>ICS / 到期前 3 天与 1 天</b></div>';
  html += '</section>';

  html += '<section class="setting-block wide"><div class="setting-title"><span>LOCAL DATA</span><h3>数据操作</h3></div>';
  html += '<div class="settings-actions"><button class="btn btn-ghost" onclick="exportData()">导出数据 JSON</button><button class="btn btn-danger" onclick="resetDemo()">重置演示数据</button></div>';
  html += '<div class="muted">本地数据会在登录后自动同步到云端；重置前请先导出备份。</div>';
  html += '</section>';
  html += '</div>';

  $('#view').innerHTML = html;
  var ct = computeTarget(p);
  $('#targetMeta').textContent = '基础代谢 ' + ct.bmr + ' kcal · TDEE ' + ct.tdee + ' kcal · 当前目标 ' + ct.target + ' kcal';
}
function saveProfile() {
  var p = DB.profile;
  p.gender = $('#p_gender').value;
  p.age = parseInt($('#p_age').value, 10) || 22;
  p.height = parseInt($('#p_height').value, 10) || 170;
  p.weight = parseInt($('#p_weight').value, 10) || 60;
  p.activity = parseFloat($('#p_activity').value) || 1.4;
  p.goal = $('#p_goal').value;
  saveDB();
}
function recalcTarget() {
  saveProfile();
  var ct = computeTarget(DB.profile);
  DB.profile.targetKcal = ct.target;
  saveDB(); render(); toast('每日目标更新为 ' + ct.target + ' kcal');
}
function updateNotify(v) { DB.settings.notify = !!v; saveDB(); toast(v ? '已开启提醒' : '已关闭提醒'); }

function exportData() {
  var blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  var d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = '物序-数据备份-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  toast('已导出数据');
}
function resetDemo() {
  if (!window.confirm('确定重置为演示数据？当前数据将丢失。')) return;
  DB = MOCK.seed(); markSynced(nowUTC()); render(); toast('已重置演示数据');
}

/* ---------- 拍照识别流程 ---------- */
function openCapture(intent) {
  if (intent) { pickSource(intent); return; }
  var html = modalHead('拍一下，智能识别');
  html += '<div class="muted" style="margin-bottom:12px">选择识别类型，系统将调用（演示为模拟）视觉大模型理解图片内容：</div>';
  html += '<div class="intent-grid">';
  html += '<button class="intent" onclick="pickSource(\'item\')"><div class="ic">' + pixelIntentIcon('item') + '</div><div class="nm">物品入库</div><div class="ds">识别分类并记录位置</div></button>';
  html += '<button class="intent" onclick="pickSource(\'expiry\')"><div class="ic">' + pixelIntentIcon('expiry') + '</div><div class="nm">记录保质期</div><div class="ds">OCR 日期 + 到期提醒</div></button>';
  html += '<button class="intent" onclick="pickSource(\'diet\')"><div class="ic">' + pixelIntentIcon('diet') + '</div><div class="nm">记一餐</div><div class="ds">识别菜品并估算热量</div></button>';
  html += '</div>';
  openModal(html, true);
}
function pickSource(intent) {
  var html = modalHead('选择图片来源');
  html += '<div style="display:flex;flex-direction:column;gap:10px">';
  html += '<button class="btn btn-primary" onclick="startPick(\'' + intent + '\',\'camera\')">拍照（调用摄像头）</button>';
  html += '<button class="btn btn-ghost" onclick="startPick(\'' + intent + '\',\'album\')">从相册选择</button>';
  html += '</div>';
  html += '<div class="muted" style="margin-top:12px">浏览器会请求相机/文件权限；本演示选择图片后进入“AI 识别（模拟）”。</div>';
  openModal(html, true);
}
function isTouch() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; }

function startPick(intent, mode) {
  closeModal();
  /* 优先使用页面内实时摄像头拍照；不支持、被拒绝或无摄像头时降级为选择照片 */
  if (mode === 'camera' && typeof Camera !== 'undefined' && Camera.isSupported()) {
    Camera.open().then(function (dataUrl) {
      handleDataUrl(dataUrl, intent);
    }).catch(function (err) {
      if (err && err.message === 'cancelled') return;   /* 用户主动取消，不提示 */
      toast('无法调用摄像头，已切换为选择照片');
      pickFile(intent, true);
    });
    return;
  }
  pickFile(intent, mode === 'camera');
}

function pickFile(intent, preferCamera) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  if (preferCamera && isTouch()) input.setAttribute('capture', 'environment');
  /* 挂载到页面再触发点击：部分浏览器（含自动化环境）对游离节点不弹选择框 */
  document.body.appendChild(input);
  function cleanup() { try { input.remove(); } catch (e) { /* ignore */ } }
  input.onchange = function () {
    var f = input.files && input.files[0];
    cleanup();
    if (f) handleFile(f, intent);
  };
  window.addEventListener('focus', function once() {
    window.removeEventListener('focus', once);
    setTimeout(function () { if (document.body.contains(input)) cleanup(); }, 1500);
  });
  input.click();
}

function handleFile(file, intent) {
  var reader = new FileReader();
  reader.onload = function (ev) { handleDataUrl(ev.target.result, intent); };
  reader.readAsDataURL(file);
}

function handleDataUrl(dataUrl, intent) {
  var usingAI = (typeof AI !== 'undefined' && AI.isReady && AI.isReady());
  showAnalyzing(dataUrl, usingAI);
  produce(dataUrl, intent);
}

/* 优先调用真实 AI（Supabase Edge Function）；未配置或失败则回退演示数据 */
function produce(dataUrl, intent) {
  window.__lastAiCapture = { dataUrl: dataUrl, intent: intent };
  function finish(res, usedAI) {
    if (!res) {
      toast('AI 未返回结果，已使用演示数据');
      return produceMock(dataUrl, intent);
    }
    if (usedAI) toast('AI 识别完成 ');
    if (intent === 'expiry') openExpiryConfirm(dataUrl, res);
    else if (intent === 'diet') openDietConfirm(dataUrl, res.dishes || res);
    else openItemConfirm(dataUrl, res.items || res);
  }
  if (typeof AI === 'undefined' || !AI.isReady()) return finish(null, false);
  AI.recognize(intent, dataUrl)
    .then(function (res) { setAiStatus(true); finish(res, true); })
    .catch(function (e) {
      window.__aiLastError = (e && e.message) || '未知错误';
      console.warn('AI 识别失败，回退演示数据：', window.__aiLastError);
      setAiStatus(false, window.__aiLastError);
      toast('AI 调用失败：' + String(window.__aiLastError).slice(0, 60));
      produceMock(dataUrl, intent);
    });
}
function showAnalyzing(preview, usingAI) {
  var html = '<div class="analyzing"><div class="spinner"></div><div class="t1" style="font-weight:700">AI 正在识别…</div>';
  html += '<div class="muted">' + (usingAI ? '正在调用视觉大模型 / OCR，请稍候' : '演示模式：正在生成示例识别结果') + '</div>';
  html += '<img class="preview-img" src="' + preview + '" alt="preview" />';
  html += '</div>';
  openModal(html, true);
}
function produceMock(preview, intent) {
  if (intent === 'expiry') openExpiryConfirm(preview);
  else if (intent === 'diet') openDietConfirm(preview);
  else openItemConfirm(preview);
}

/* ---------- 物品识别结果确认 ---------- */
function openItemConfirm(preview, cands) {
  cands = (cands && cands.length) ? cands : MOCK.recognizeItems();
  window.pendingItemCands = cands;
  var locs = listLocations();
  var opt = locs.map(function (l) { return '<option value="' + esc(l) + '"></option>'; }).join('');
  var html = modalHead('物品识别结果');
  html += '<div class="muted" style="margin-bottom:8px">演示识别到 ' + cands.length + ' 件物品，请核对后入库（名称/分类可修改）：</div>';
  html += '<img class="preview-img" src="' + preview + '" alt="preview" />';
  cands.forEach(function (c, i) {
    html += '<div class="card" id="crow' + i + '" style="padding:12px;margin-bottom:10px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>物品 ' + (i + 1) + '</b><span class="muted">置信 ' + Math.round(c.confidence * 100) + '%</span></div>';
    html += '<div class="form-grid">';
    html += '<div class="field full"><label>名称</label><input class="cname" value="' + esc(c.name) + '" />';
    var candNames = (c.candidates && c.candidates.length) ? c.candidates : [];
    if (candNames.length) {
      html += '<div class="chips" style="margin-top:6px">';
      candNames.forEach(function (n, j) {
        html += '<button class="chip" onclick="pickName(' + i + ',' + j + ')">' + esc(String(n)) + '</button>';
      });
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="field"><label>分类</label><select class="ccat">';
    CATS.forEach(function (x) { html += '<option' + (x === c.category ? ' selected' : '') + '>' + x + '</option>'; });
    html += '</select></div>';
    html += '<div class="field"><label>数量</label><input class="ccount" type="number" min="1" value="' + (c.count || 1) + '" /></div>';
    html += '<div class="field full"><label>存放位置</label><input class="cloc" list="clocList" value="' + esc(c.location || '') + '" /><datalist id="clocList">' + opt + '</datalist></div>';
    html += '<div class="field full"><label>备注</label><input class="cnote" value="' + esc(c.note || '') + '" /></div>';
    html += '</div>';
    html += '<button class="btn btn-sm btn-danger" onclick="removeCand(' + i + ')">移除这项</button>';
    html += '</div>';
  });
  html += '<button class="btn btn-ghost btn-block" onclick="reRecognize(\'item\')">识别不准？重新细看</button>';
  html += '<button class="btn btn-primary btn-block" onclick="saveItemConfirm()">确认入库 ' + cands.length + ' 件</button>';
  openModal(html, true);
}
function removeCand(i) {
  var el = document.getElementById('crow' + i);
  if (el) el.remove();
}
function saveItemConfirm() {
  var rows = $$('.cand-row, [id^="crow"]').filter(function (el) { return el.style.display !== 'none'; });
  var added = 0;
  rows.forEach(function (row) {
    var name = (row.querySelector('.cname').value || '').trim();
    if (!name) return;
    DB.items.push({
      id: uid(), name: name, kind: 'object', status: 'active', icon: '',
      category: row.querySelector('.ccat').value || '其他',
      count: Math.max(1, parseInt(row.querySelector('.ccount').value, 10) || 1),
      location: (row.querySelector('.cloc').value || '').trim() || '未设置位置',
      note: (row.querySelector('.cnote').value || '').trim(),
      createdAt: todayISO(), expireDate: '', storage: '', remind: false
    });
    added++;
  });
  if (added === 0) { toast('请至少保留一项'); return; }
  saveDB(); closeModal(); go('items'); toast('已入库 ' + added + ' 件物品');
}

/* ---------- 保质期识别结果确认 ---------- */
function openExpiryConfirm(preview, e) {
  e = e || MOCK.recognizeExpiry();
  var html = modalHead('保质期识别结果');
  html += '<div class="muted" style="margin-bottom:8px">OCR + 大模型识别（演示），请核对字段后保存，系统将自动开启到期提醒：</div>';
  html += '<img class="preview-img" src="' + preview + '" alt="preview" />';
  html += '<div class="advice-card" style="margin-bottom:12px"><b>识别结论：</b>' + esc(e.name) + '，预计到期日 ' + esc(e.expireDate) + '（' + (e.daysLeft < 0 ? '已过期' + Math.abs(e.daysLeft) + ' 天' : '剩 ' + e.daysLeft + ' 天') + '）</div>';
  html += '<div class="field"><label>名称 *</label><input id="ex_name" value="' + esc(e.name) + '" /></div>';
  html += '<div class="form-grid">';
  html += '<div class="field"><label>类型</label><select id="ex_kind">';
  html += '<option value="food"' + (e.kind === 'food' ? ' selected' : '') + '>食品</option>';
  html += '<option value="medicine"' + (e.kind === 'medicine' ? ' selected' : '') + '>药品</option>';
  html += '</select></div>';
  html += '<div class="field"><label>保存条件</label><select id="ex_storage">';
  var storages = ['常温避光', '冷藏 2-6', '冷冻', '阴凉干燥', '开封后冷藏'];
  storages.forEach(function (s) { html += '<option' + (s === e.storage ? ' selected' : '') + '>' + s + '</option>'; });
  html += '</select></div>';
  html += '<div class="field"><label>到期日</label><input id="ex_expire" type="date" value="' + esc(e.expireDate) + '" /></div>';
  html += '<div class="field"><label>数量</label><input id="ex_count" type="number" min="1" value="' + (e.count || 1) + '" /></div>';
  html += '</div>';
  html += '<button class="btn btn-ghost btn-block" onclick="reRecognize(\'expiry\')">日期不准？重新细看</button>';
  html += '<button class="btn btn-primary btn-block" onclick="saveExpiryConfirm()">保存并开启提醒</button>';
  openModal(html, true);
}
function saveExpiryConfirm() {
  var name = ($('#ex_name').value || '').trim();
  var expire = $('#ex_expire').value;
  if (!name) { toast('请填写名称'); return; }
  if (!expire) { toast('请选择到期日'); return; }
  var kind = $('#ex_kind').value;
  DB.items.push({
    id: uid(), name: name, kind: kind, status: 'active', icon: '',
    category: kind === 'medicine' ? '药品' : '食品',
    count: Math.max(1, parseInt($('#ex_count').value, 10) || 1),
    location: kind === 'medicine' ? '药箱' : '冰箱·冷藏层',
    storage: $('#ex_storage').value,
    expireDate: expire, note: '', createdAt: todayISO(), remind: true
  });
  saveDB(); closeModal(); go('expiry'); toast('已保存并开启到期提醒');
}

/* ---------- 饮食识别结果确认 ---------- */
function defaultMealByHour() {
  var h = new Date().getHours();
  if (h < 9) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}
function openDietConfirm(preview, dishes) {
  dishes = (dishes && dishes.length) ? dishes : MOCK.recognizeDiet();
  window.pendingDishCands = dishes;
  window.dietCands = dishes;
  var html = modalHead('拍照记一餐（识别结果）');
  html += '<div class="muted" style="margin-bottom:8px">识别到 ' + dishes.length + ' 项（演示），可修改菜名 / 份量 / 热量后保存：</div>';
  html += '<img class="preview-img" src="' + preview + '" alt="preview" />';
  html += '<div class="field"><label>餐次</label><select id="dc_meal">';
  MEALS.forEach(function (x) { html += '<option value="' + x.key + '"' + (x.key === defaultMealByHour() ? ' selected' : '') + '>' + x.label + '</option>'; });
  html += '</select></div>';
  dishes.forEach(function (d, i) {
    html += '<div class="card" id="drow' + i + '" data-idx="' + i + '" style="padding:12px;margin-bottom:10px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>' + esc(d.name) + '</b><span class="tag">AI估算</span></div>';
    html += '<div class="form-grid">';
    html += '<div class="field full"><label>菜名</label><input class="dname" value="' + esc(d.name) + '" />';
    var dishCands = (d.candidates && d.candidates.length) ? d.candidates : [];
    if (dishCands.length) {
      html += '<div class="chips" style="margin-top:6px">';
      dishCands.forEach(function (n, j) {
        html += '<button class="chip" onclick="pickDishName(' + i + ',' + j + ')">' + esc(String(n)) + '</button>';
      });
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="field"><label>份量</label><select class="dportion">';
    var ps = ['少', '中', '多'];
    ps.forEach(function (x) { html += '<option' + (x === d.portion ? ' selected' : '') + '>' + x + '</option>'; });
    html += '</select></div>';
    html += '<div class="field"><label>热量 kcal</label><input class="dkcal" type="number" min="0" value="' + d.kcal + '" /></div>';
    html += '</div>';
    html += '<button class="btn btn-sm btn-danger" onclick="removeDrow(' + i + ')">移除这项</button>';
    html += '</div>';
  });
  html += '<button class="btn btn-ghost btn-block" onclick="reRecognize(\'diet\')">菜品不准？重新细看</button>';
  html += '<button class="btn btn-primary btn-block" onclick="saveDietConfirm()">保存 ' + dishes.length + ' 项</button>';
  openModal(html, true);
}
function removeDrow(i) {
  var el = document.getElementById('drow' + i);
  if (el) el.remove();
}
function saveDietConfirm() {
  var meal = $('#dc_meal').value;
  var rows = $$('[id^="drow"]').filter(function (el) { return el.parentNode; });
  var added = 0;
  rows.forEach(function (row) {
    var name = (row.querySelector('.dname').value || '').trim();
    var kcal = parseFloat(row.querySelector('.dkcal').value);
    if (!name || isNaN(kcal)) return;
    var idx = parseInt(row.getAttribute('data-idx'), 10) || 0;
    var base = (window.dietCands && window.dietCands[idx]) || {};
    getMeals(todayISO())[meal].push({
      id: uid(), name: name, portion: row.querySelector('.dportion').value,
      kcal: Math.round(kcal), p: base.p || 0, f: base.f || 0, c: base.c || 0,
      isEstimated: true, tip: base.tip || '', icon: base.icon || ''
    });
    added++;
  });
  if (added === 0) { toast('请至少保留一项'); return; }
  saveDB(); closeModal(); go('diet'); toast('已记入' + mealLabel(meal) + ' ' + added + ' 项');
}

function reRecognize(intent) {
  var cap = window.__lastAiCapture;
  if (!cap || !cap.dataUrl || typeof AI === 'undefined' || !AI.isReady()) {
    toast('当前图片不可重新识别，请重新拍摄');
    return;
  }
  var originalIntent = cap.intent || intent || 'item';
  showAnalyzing(cap.dataUrl, true);
  AI.recognize(originalIntent, cap.dataUrl, { precise: true }).then(function (res) {
    setAiStatus(true); toast('精准重看完成 ');
    if (originalIntent === 'expiry') openExpiryConfirm(cap.dataUrl, res);
    else if (originalIntent === 'diet') openDietConfirm(cap.dataUrl, res.dishes || res);
    else openItemConfirm(cap.dataUrl, res.items || res);
  }).catch(function (e) {
    var msg = (e && e.message) || '识别失败';
    setAiStatus(false, msg); toast('精准重看失败：' + String(msg).slice(0, 50));
    if (originalIntent === 'expiry') openExpiryConfirm(cap.dataUrl, window.pendingExpiryCands || undefined);
    else if (originalIntent === 'diet') openDietConfirm(cap.dataUrl, window.pendingDishCands || undefined);
    else openItemConfirm(cap.dataUrl, window.pendingItemCands || undefined);
  });
}

/* ---------- 初始化 ---------- */
window.addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', '#home');
render();
cloudAuto();
window.addEventListener('online', function () {
  if (typeof Cloud !== 'undefined' && Cloud.isReady && Cloud.isLoggedIn()) {
    if (typeof toast === 'function') toast('网络已恢复，正在同步云端数据');
    cloudSyncNow(false);
  }
});
window.addEventListener('offline', function () {
  if (typeof toast === 'function') toast('网络已断开，当前使用本地数据');
});



/* =========================================================
   第 3 部分：账号与云同步（依赖 js/cloud.js）
   ========================================================= */
function accountCardHTML() {
  var cfgReady = (typeof Cloud !== 'undefined') && Cloud.isReady();
  var logged = cfgReady && Cloud.isLoggedIn();
  var h = '<section class="setting-block account-block wide"><div class="setting-title"><span>CLOUD ID</span><h3>账号与云同步</h3></div>';
  if (!cfgReady) {
    h += '<div class="muted" style="margin-bottom:10px">云端尚未配置：账号与多端同步未启用。</div>';
    h += '<div class="actions"><button class="btn btn-sm btn-ghost" onclick="toast(\'请先配置云端\')">配置说明</button></div>';
  } else if (!logged) {
    h += '<div class="muted" style="margin-bottom:10px">登录后数据自动备份并支持多端同步；不登录也可以使用拍照识别。</div>';
    h += '<button class="btn btn-primary btn-block" onclick="openAuthModal()">登录 / 注册</button>';
  } else {
    h += '<div class="setting-line"><span>状态</span><b>已登录</b></div>';
    h += '<div class="setting-line"><span>账号</span><b>' + esc(Cloud.currentEmail()) + '</b></div>';
    h += '<div class="setting-line"><span>同步</span><b>本地改动后自动上传</b></div>';
    var rt = (Cloud.realtimeStatus && Cloud.realtimeStatus()) || 'idle';
    var rtText = rt === 'connected' ? 'WebSocket 已连接'
      : (rt === 'connecting' ? '正在连接实时通道'
      : (rt === 'fallback' ? '轮询兜底（30 秒/次）' : '未连接'));
    h += '<div class="setting-line"><span>实时通道</span><b>' + rtText + '</b></div>';
    h += '<div class="actions"><button class="btn btn-sm btn-primary" onclick="cloudSyncNow(true)">立即同步</button><button class="btn btn-sm btn-ghost" onclick="cloudLogout()">退出登录</button></div>';
  }
  h += '</section>';
  return h;
}
function openAuthModal() {
  if (typeof Cloud === 'undefined' || !Cloud.isReady()) { toast('请先配置 web/config.js 中的 Supabase 信息'); return; }
  var html = modalHead('登录 / 注册');
  html += '<div class="field"><label>邮箱</label><input id="au_email" type="email" placeholder="you@example.com" /></div>';
  html += '<div class="field"><label>密码（至少 6 位）</label><input id="au_pass" type="password" autocomplete="current-password" placeholder="••••••••" />';
  html += '<label style="display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12.5px;color:var(--muted)"><input type="checkbox" id="au_show" onchange="togglePwd()" /> 显示密码</label>';
  html += '<div class="muted" style="margin-top:4px">注意区分大小写，密码首尾不要带空格。</div></div>';
  html += '<div class="field"><label>操作</label><select id="au_mode"><option value="login">登录</option><option value="signup">注册新账号</option></select></div>';
    html += '<div class="muted" style="margin-bottom:10px">提示：<b>不登录也可以直接拍照识别</b>（体验模式，每台设备每小时 60 次）；登录后额外获得云端备份与多端同步。若登录缓慢或失败，通常是网络无法访问云端，可先用体验模式。</div>';
  html += '<button class="btn btn-primary btn-block" onclick="authSubmit()">提交</button>';
  openModal(html, true);
}
function authSubmit() {
  var email = ($('#au_email').value || '').trim();
  var pass = ($('#au_pass').value || '').trim();   /* 去掉自动填充/输入法带来的首尾空格 */
  var mode = $('#au_mode').value;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('邮箱格式不正确'); return; }
  if (pass.length < 6) { toast('密码至少 6 位'); return; }
  var btn = document.querySelector('#modal-root .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '请稍候…'; }
  var settled = false;
  function done() {
    settled = true;
    if (timer) { clearTimeout(timer); timer = null; }
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = '提交'; }
  }
  /* 安全计时器：网络极慢时避免按钮一直停在“请稍候” */
  var timer = setTimeout(function () {
    if (settled) return;
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = '提交'; }
    toast('登录响应超时，请检查网络后重试');
  }, 25000);
  if (mode === 'signup') {
    Cloud.signUp(email, pass).then(function () {
      return Cloud.signIn(email, pass).catch(function () { return null; });
    }).then(function (sess) {
      done();
      if (sess) { toast('注册成功，已自动登录'); afterLogin(); }
      else { toast('注册成功，请查收验证邮件后登录'); closeModal(); }
    }).catch(function (e) { done(); toast(friendlyErr('注册失败：', e)); });
  } else {
    Cloud.signIn(email, pass).then(function () {
      done(); toast('登录成功'); afterLogin();
    }).catch(function (e) { done(); toast(friendlyErr('登录失败：', e)); });
  }
}
function afterLogin() { closeModal(); render(); if (typeof Cloud !== 'undefined' && Cloud.startRealtime) Cloud.startRealtime(); cloudSyncNow(true); }
function cloudSyncNow(showToast) {
  if (typeof Cloud === 'undefined' || !Cloud.isReady()) { toast('云端未配置'); return; }
  if (!Cloud.isLoggedIn()) { toast('请先登录'); return; }
  if (showToast) toast('同步中…');
  Cloud.syncNow(true).then(function (res) {
    if (!res.ok) {
      if (res.reason === 'noauth') toast('登录已失效，请重新登录');
      else if (res.reason === 'noconfig') toast('云端未配置');
      else if (res.reason === 'offline') toast('云端暂不可达，已保留登录状态，本地数据不受影响');
      return;
    }
    render();
    var map = { uploaded: '已上传到云端', downloaded: '已从云端拉取最新数据', insync: '数据已是最新' };
    toast(map[res.action] || '同步完成');
  }).catch(function (e) { toast('同步失败：' + (e && e.message)); });
}
function cloudLogout() {
  if (typeof Cloud === 'undefined') return;
  Cloud.signOut().then(function () { toast('已退出登录（本地数据保留）'); render(); });
}
/* 页面启动时：若已登录则静默拉取一次云端（不打扰） */
function cloudAuto() {
  if (typeof Cloud !== 'undefined' && Cloud.isReady && Cloud.isLoggedIn()) {
    if (Cloud.startRealtime) Cloud.startRealtime();
    Cloud.syncNow(true).catch(function () { /* 静默 */ });
  }
}



/* 把常见云端错误翻译成友好中文提示 */
function friendlyErr(prefix, e) {
  var msg = (e && e.message) || '';
  var low = String(msg).toLowerCase();
  if (low.indexOf('rate limit') >= 0) return prefix + '注册太频繁：请约 1 小时后再试，或换个邮箱注册';
  if (low.indexOf('not confirmed') >= 0) return prefix + '该邮箱尚未确认：请到邮箱点确认链接，或到 Supabase 关闭邮箱验证';
  if (low.indexOf('invalid login credentials') >= 0 || low.indexOf('invalid credentials') >= 0) return prefix + '邮箱或密码不正确';
  if (low.indexOf('user already registered') >= 0) return prefix + '该邮箱已注册，请直接登录';
  if (low.indexOf('failed to fetch') >= 0 || low.indexOf('network') >= 0 || low.indexOf('fetch') >= 0) return prefix + '云端暂不可达，请稍后重试；本地数据不会丢失';
  return prefix + (msg || '未知错误');
}

/* 记录最近一次识别结果，供顶栏状态标识使用（失败状态只保留 10 分钟） */
function setAiStatus(ok, msg) {
  try {
    localStorage.setItem('zhiwu_ai_status', JSON.stringify({ ok: !!ok, msg: msg || '', at: Date.now() }));
    if (ok) localStorage.setItem('zhiwu_ai_verified', '1');
  } catch (e) { /* ignore */ }
}

/* 顶栏标签：未配置显示演示模式；配置后默认显示“AI 已接入”；仅最近一次调用失败时提示失败 */
function updateModeChip() {
  var el = document.getElementById('modeChip');
  if (!el) return;
  var configured = (typeof AI !== 'undefined' && AI.isReady && AI.isReady());
  var st = null;
  try { st = JSON.parse(localStorage.getItem('zhiwu_ai_status') || 'null'); } catch (e) { st = null; }
  var recentFail = !!(st && st.ok === false && st.at && (Date.now() - st.at < 10 * 60 * 1000));
  var text, title;
  if (!configured) {
    text = '演示模式';
    title = '未配置云端 AI 服务，当前使用演示数据';
  } else if (recentFail) {
    text = 'AI 调用失败';
    title = '上次识别失败：' + (st.msg || '未知原因') + '（再次拍照可重试）';
  } else {
    text = 'AI 已接入';
    title = '真实 AI 识别已启用';
  }
  el.textContent = text;
  el.title = title;
}
updateModeChip();

/* 点击候选名称 → 填入对应输入框 */
function pickName(rowIdx, candIdx) {
  var c = (window.pendingItemCands || [])[rowIdx];
  if (!c) return;
  var val = (c.candidates && c.candidates[candIdx]) || c.name || '';
  var row = document.getElementById('crow' + rowIdx);
  if (row && row.querySelector('.cname')) row.querySelector('.cname').value = val;
}
function pickDishName(rowIdx, candIdx) {
  var d = (window.pendingDishCands || [])[rowIdx];
  if (!d) return;
  var val = (d.candidates && d.candidates[candIdx]) || d.name || '';
  var row = document.getElementById('drow' + rowIdx);
  if (row && row.querySelector('.dname')) row.querySelector('.dname').value = val;
}

/* 显示/隐藏密码，避免大小写与空格输错 */
function togglePwd() {
  var inp = document.getElementById('au_pass');
  var chk = document.getElementById('au_show');
  if (inp && chk) inp.type = chk.checked ? 'text' : 'password';
}
