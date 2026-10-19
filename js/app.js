/* =========================================================
   物序 web 演示原型 —— 核心逻辑（第 1 部分）
   依赖 js/mock.js（window.MOCK）
   ========================================================= */
var KEY = 'zhiwu_v1';
var DB = loadDB();

/* ---------- 工具 ---------- */
function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function todayISO() { return MOCK.iso(new Date()); }
function daysUntil(dateISO) {
  if (!dateISO) return null;
  var t0 = new Date(); t0.setHours(0, 0, 0, 0);
  var d = new Date(dateISO + 'T00:00:00');
  return Math.round((d - t0) / 86400000);
}
function fmt(days) {
  if (days === null || days === undefined) return '';
  if (days < 0) return '已过期 ' + Math.abs(days) + ' 天';
  if (days === 0) return '今天到期';
  return '剩 ' + days + ' 天';
}
function pixelSvg(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' + inner + '</svg>';
}
function pixelIcon(kind) {
  var cut = 'transparent';
  var d = '';
  switch (kind) {
    case 'device':
      d = '<rect x="3" y="4" width="18" height="12" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="16" width="4" height="2"/><rect x="7" y="18" width="10" height="2"/><rect x="6" y="7" width="12" height="2" opacity=".45"/>';
      break;
    case 'pencil':
      d = '<rect x="4" y="16" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="13" y="7" width="6" height="4"/><rect x="17" y="4" width="3" height="3"/>';
      break;
    case 'pill':
      d = '<rect x="7" y="4" width="10" height="16" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7" y="10" width="10" height="4"/><rect x="9" y="2" width="6" height="2" opacity=".45"/>';
      break;
    case 'bottle':
      d = '<rect x="9" y="3" width="6" height="3"/><rect x="8" y="6" width="8" height="14"/><rect x="10" y="9" width="4" height="6" fill="' + cut + '"/>';
      break;
    case 'tool':
      d = '<rect x="4" y="14" width="6" height="6"/><rect x="9" y="5" width="2" height="10"/><rect x="8" y="3" width="4" height="2"/>';
      break;
    case 'pan':
      d = '<rect x="3" y="9" width="14" height="3"/><rect x="5" y="12" width="10" height="5"/><rect x="16" y="10" width="5" height="2"/>';
      break;
    case 'shirt':
      d = '<rect x="8" y="4" width="8" height="3"/><rect x="5" y="6" width="4" height="4"/><rect x="15" y="6" width="4" height="4"/><rect x="8" y="7" width="8" height="13"/>';
      break;
    case 'card':
      d = '<rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="8" width="14" height="2"/><rect x="6" y="12" width="5" height="4"/><rect x="13" y="12" width="4" height="2"/><rect x="13" y="15" width="4" height="2"/>';
      break;
    case 'sport':
      d = '<rect x="9" y="4" width="6" height="2"/><rect x="6" y="6" width="12" height="2"/><rect x="4" y="9" width="16" height="6"/><rect x="6" y="15" width="12" height="2"/><rect x="9" y="17" width="6" height="2"/><rect x="10" y="9" width="4" height="6" fill="' + cut + '"/>';
      break;
    case 'plug':
      d = '<rect x="6" y="4" width="2" height="6"/><rect x="16" y="4" width="2" height="6"/><rect x="7" y="9" width="10" height="8"/><rect x="10" y="17" width="4" height="4"/>';
      break;
    case 'calendar':
      d = '<rect x="4" y="5" width="16" height="14" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="8" width="16" height="2"/><rect x="8" y="12" width="2" height="2"/><rect x="12" y="12" width="2" height="2"/><rect x="8" y="15" width="2" height="2"/>';
      break;
    case 'cup':
      d = '<rect x="6" y="7" width="12" height="12"/><rect x="8" y="4" width="8" height="3" opacity=".45"/><rect x="9" y="10" width="6" height="6" fill="' + cut + '"/>';
      break;
    case 'leaf':
      d = '<rect x="5" y="9" width="4" height="4"/><rect x="8" y="6" width="4" height="4"/><rect x="11" y="9" width="4" height="4"/><rect x="14" y="12" width="4" height="4"/><rect x="8" y="15" width="4" height="4"/><rect x="12" y="10" width="2" height="6" fill="' + cut + '"/>';
      break;
    case 'plate':
      d = '<rect x="4" y="10" width="16" height="2"/><rect x="6" y="12" width="12" height="6"/><rect x="9" y="18" width="6" height="2"/><rect x="10" y="6" width="4" height="4" opacity=".45"/>';
      break;
    case 'breakfast':
      d = '<rect x="9" y="4" width="6" height="2"/><rect x="6" y="6" width="12" height="2"/><rect x="4" y="9" width="16" height="8"/><rect x="6" y="17" width="12" height="2"/><rect x="9" y="8" width="6" height="8" fill="' + cut + '"/>';
      break;
    case 'snack':
      d = '<rect x="7" y="6" width="10" height="2"/><rect x="5" y="8" width="14" height="8"/><rect x="7" y="16" width="10" height="2"/><rect x="8" y="10" width="2" height="2" fill="' + cut + '"/><rect x="14" y="12" width="2" height="2" fill="' + cut + '"/>';
      break;
    case 'bowl':
      d = '<rect x="3" y="10" width="18" height="2"/><rect x="5" y="12" width="14" height="6"/><rect x="8" y="18" width="8" height="2"/><rect x="9" y="5" width="2" height="4" opacity=".45"/><rect x="14" y="6" width="2" height="3" opacity=".45"/>';
      break;
    default:
      d = '<rect x="4" y="7" width="16" height="12"/><rect x="6" y="4" width="12" height="3" opacity=".65"/><rect x="10" y="7" width="4" height="12" fill="' + cut + '"/>';
  }
  return pixelSvg(d);
}
var CATEGORY_ICON = { '数码': 'device', '文具': 'pencil', '药品': 'pill', '食品': 'bowl', '日用品': 'bottle', '工具': 'tool', '厨具': 'pan', '衣物': 'shirt', '证件票据': 'card', '运动户外': 'sport', '小家电': 'plug', '其他': 'box' };
function fallbackIcon(item) {
  return pixelIcon(CATEGORY_ICON[item.category] || 'box');
}
function pixelFoodIcon(name, mealKey) {
  var n = name || '';
  if (mealKey === 'breakfast') return pixelIcon('breakfast');
  if (mealKey === 'snack') return pixelIcon('snack');
  if (/饮|奶|可乐|豆浆|咖啡|茶/.test(n)) return pixelIcon('cup');
  if (/饭|面|粉|粥|米/.test(n)) return pixelIcon('bowl');
  if (/沙拉|菜|蔬/.test(n)) return pixelIcon('leaf');
  if (/蛋|鸡|肉|鱼/.test(n)) return pixelIcon('plate');
  return pixelIcon('bowl');
}
function pixelMealIcon(key) { return pixelFoodIcon('', key); }
function pixelIntentIcon(kind) { return pixelIcon(kind === 'expiry' ? 'calendar' : (kind === 'diet' ? 'bowl' : 'box')); }

/* ---------- 数据存储 ---------- */
var applyingRemote = false;
function deviceId() {
  try {
    var k = 'zhiwu_device';
    var v = localStorage.getItem(k);
    if (!v) { v = 'dev-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, v); }
    return v;
  } catch (e) { return 'dev-anon'; }
}
function nowUTC() { return new Date().toISOString(); }
function ensureMeta() {
  if (!DB.meta) DB.meta = {};
  if (!DB.meta.deviceId) DB.meta.deviceId = deviceId();
  if (!DB.meta.updatedAt) DB.meta.updatedAt = nowUTC();
  if (DB.meta.dirty === undefined) DB.meta.dirty = false;
}
function loadDB() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var d = JSON.parse(raw);
      if (d && d.items && d.dietLog) { if (!d.meta) d.meta = {}; return d; }
    }
  } catch (e) { /* file:// 下可能不可用，退回内存 */ }
  var s = MOCK.seed();
  if (!s.meta) s.meta = {};
  s.meta.deviceId = deviceId();
  s.meta.updatedAt = nowUTC();
  s.meta.dirty = false;
  return s;
}
function saveDB(skipRemote) {
  ensureMeta();
  if (!applyingRemote) { DB.meta.updatedAt = nowUTC(); DB.meta.dirty = true; }
  try { localStorage.setItem(KEY, JSON.stringify(DB)); }
  catch (e) { /* 忽略配额/隐私模式错误 */ }
  if (!skipRemote && !applyingRemote && typeof Cloud !== 'undefined' && Cloud.isReady && Cloud.isReady() && Cloud.isLoggedIn()) {
    Cloud.scheduleSync();
  }
}
/* 云同步成功后：记录服务端时间，标记为已同步（不再触发上传） */
function markSynced(serverTime) {
  applyingRemote = true;
  ensureMeta();
  DB.meta.updatedAt = serverTime || nowUTC();
  DB.meta.dirty = false;
  saveDB(true);
  applyingRemote = false;
}
/* 拉取云端快照并应用到本地 */
function applyRemoteSnapshot(snap) {
  applyingRemote = true;
  DB = snap;
  ensureMeta();
  DB.meta.dirty = false;
  saveDB(true);
  applyingRemote = false;
  render();
}

/* ---------- 数据辅助 ---------- */
function activeItems() { return DB.items.filter(function (i) { return i.status !== 'done'; }); }
function expiringItems() {
  return activeItems().filter(function (i) { return i.expireDate; });
}
function getMeals(dateISO) {
  if (!DB.dietLog[dateISO]) DB.dietLog[dateISO] = { breakfast: [], lunch: [], dinner: [], snack: [] };
  return DB.dietLog[dateISO];
}
function sumKcal(arr) { return arr.reduce(function (s, x) { return s + (Number(x.kcal) || 0); }, 0); }
function sumNut(arr, k) { return arr.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); }
function allTodayMeals() {
  var m = getMeals(todayISO());
  return m.breakfast.concat(m.lunch, m.dinner, m.snack);
}
function expiryLevel(days) {
  if (days === null) return null;
  if (days < 0) return { key: 'expired', label: '已过期', cls: 'red', sort: 0 };
  if (days <= 7) return { key: 'soon7', label: '7 天内到期', cls: 'orange', sort: 1 };
  if (days <= 30) return { key: 'soon30', label: '30 天内到期', cls: 'amber', sort: 2 };
  return { key: 'normal', label: '正常', cls: 'green', sort: 3 };
}
function daysChip(days) {
  var lv = expiryLevel(days);
  if (!lv) return '';
  return '<span class="days ' + lv.cls + '">' + fmt(days) + '</span>';
}
function computeTarget(p) {
  var w = Number(p.weight) || 60, h = Number(p.height) || 170, a = Number(p.age) || 22;
  var bmr = p.gender === '女' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  var tdee = Math.round(bmr * (Number(p.activity) || 1.4));
  var adj = p.goal === '减脂' ? -300 : (p.goal === '增肌' ? 200 : 0);
  var target = Math.max(1200, tdee + adj);
  return { bmr: Math.round(bmr), tdee: tdee, target: target };
}
function listLocations() {
  var set = {};
  DB.items.forEach(function (i) { if (i.location) set[i.location] = 1; });
  var base = ['书桌抽屉', '客厅电视柜·第2层', '卧室床头柜', '冰箱·冷藏层', '厨房橱柜', '药箱', '玄关柜'];
  base.forEach(function (x) { if (!set[x]) set[x] = 1; });
  return Object.keys(set);
}

/* ---------- 导航 / 路由 ---------- */
function go(view) {
  if (('#' + view) === location.hash) { render(); }
  else { location.hash = view; }
}
function currentView() {
  return (location.hash || '#home').replace('#', '') || 'home';
}
function render() {
  var v = currentView();
  document.body.setAttribute('data-view', v);
  var map = {
    home: renderHome,
    items: renderItems,
    expiry: renderExpiry,
    diet: renderDiet,
    profile: renderProfile
  };
  (map[v] || renderHome)();
  $$('#mainnav .nav-item').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-view') === v);
  });
  updateExpiryBadge();
  window.scrollTo(0, 0);
}

/* 底部导航角标：临期(<=7天+过期) 数量 */
function updateExpiryBadge() {
  var n = countUrgent();
  var btn = $('#mainnav .nav-item[data-view="expiry"]');
  if (!btn) return;
  btn.setAttribute('data-badge', n > 0 ? String(n) : '');
}
function countUrgent() {
  return expiringItems().filter(function (i) {
    var d = daysUntil(i.expireDate);
    return d !== null && d <= 7;
  }).length;
}
function statCounts() {
  return {
    items: activeItems().length,
    urgent: countUrgent(),
    expired: expiringItems().filter(function (i) { return daysUntil(i.expireDate) < 0; }).length,
    kcal: sumKcal(allTodayMeals()),
    target: (DB.profile && DB.profile.targetKcal) || 1800
  };
}

/* ---------- 首页视图 ---------- */
function renderHome() {
  var st = statCounts();
  var exp = expiringItems().slice().sort(function (a, b) {
    return (daysUntil(a.expireDate) || 0) - (daysUntil(b.expireDate) || 0);
  }).filter(function (i) { return daysUntil(i.expireDate) <= 30; }).slice(0, 4);
  var recent = activeItems().slice().sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); }).slice(0, 4);
  var pct = Math.min(100, Math.round(st.kcal / st.target * 100));

  var html = '<section class="overview-head">';
  html += '<div class="stage-kicker"><span class="eyebrow-code">01</span><span>SPATIAL OVERVIEW</span></div>';
  html += '<h2>把生活物品，<br />放回可检索的位置。</h2>';
  html += '<p>空间索引 / 临期时间轴 / 每日能量账本</p>';
  html += '</section>';

  html += '<div class="overview-stage">';
  html += '<section class="scan-panel" onclick="openCapture()">';
  html += '<div class="scan-grid"></div>';
  html += '<div class="scan-topline"><span>SCAN.NODE // CAM_IN</span><span>READY</span></div>';
  html += '<div class="scan-reticle"><i></i><i></i><i></i><i></i></div>';
  html += '<div class="scan-copy"><div class="scan-title">拍一下，建立索引</div><div class="scan-sub">物品入库 / 保质期识别 / 饮食记录</div></div>';
  html += '<div class="scan-footer"><span>CAMERA · ALBUM · OCR</span><span class="scan-cta">ENTER CAPTURE →</span></div>';
  html += '</section>';

  html += '<aside class="telemetry">';
  html += '<div class="telemetry-row"><span class="telemetry-code">IN_STOCK</span><strong>' + st.items + '</strong><span class="telemetry-label">在库物件</span></div>';
  html += '<div class="telemetry-row' + (st.urgent > 0 ? ' alert' : '') + '"><span class="telemetry-code">DUE_SOON</span><strong>' + st.urgent + '</strong><span class="telemetry-label">临期 / 过期</span></div>';
  html += '<div class="telemetry-row"><span class="telemetry-code">KCAL_TODAY</span><strong>' + st.kcal + '</strong><span class="telemetry-label">今日摄入</span></div>';
  html += '</aside>';
  html += '</div>';

  html += '<div class="overview-lower">';
  html += '<section class="ledger-panel due-panel">';
  html += '<div class="ledger-head"><div><span class="eyebrow-code">02</span> DUE QUEUE</div><button class="text-link" onclick="go(\'expiry\')">OPEN ALL →</button></div>';
  html += '<div class="queue-list">';
  if (exp.length === 0) {
    html += '<div class="queue-empty">队列为空 / 暂无临期物品</div>';
  } else {
    exp.forEach(function (i) {
      var d = daysUntil(i.expireDate);
      html += '<div class="queue-row" onclick="openItemDetail(\'' + i.id + '\')">';
      html += '<div class="queue-time">' + (d < 0 ? 'EXP' : d + 'D') + '</div>';
      html += '<div class="queue-meta"><b>' + esc(i.name) + '</b><span>' + esc(i.location || '未设置位置') + '</span></div>';
      html += '<div class="queue-state">' + daysChip(d) + '</div>';
      html += '</div>';
    });
  }
  html += '</div></section>';

  html += '<section class="ledger-panel recent-panel">';
  html += '<div class="ledger-head"><div><span class="eyebrow-code">03</span> LAST INDEXED</div><button class="text-link" onclick="go(\'items\')">MATRIX →</button></div>';
  html += '<div class="queue-list">';
  if (recent.length === 0) {
    html += '<div class="queue-empty">尚未建立索引 / 点击扫描节点开始</div>';
  } else {
    recent.forEach(function (i) {
      html += '<div class="queue-row" onclick="openItemDetail(\'' + i.id + '\')">';
      html += '<div class="queue-icon">' + fallbackIcon(i) + '</div>';
      html += '<div class="queue-meta"><b>' + esc(i.name) + '</b><span>' + esc(i.category || '其他') + ' · ' + esc(i.location || '未设置位置') + '</span></div>';
      html += '<div class="queue-code">#' + esc(String(i.id || '').slice(-4).toUpperCase()) + '</div>';
      html += '</div>';
    });
  }
  html += '</div></section></div>';

  html += '<section class="fuel-strip">';
  html += '<div class="fuel-label"><span class="eyebrow-code">04</span><b>DAILY FUEL</b><span>今日饮食账本</span></div>';
  html += '<div class="fuel-main"><div class="fuel-numbers"><strong>' + st.kcal + '</strong><span>/ ' + st.target + ' kcal</span></div><div class="fuel-progress"><i style="width:' + pct + '%" class="' + (st.kcal > st.target ? 'over' : '') + '"></i></div></div>';
  html += '<button class="text-link fuel-link" onclick="go(\'diet\')">OPEN LEDGER →</button>';
  html += '</section>';

  $('#view').innerHTML = html;
}
/* =========================================================
   第 2 部分：物品库 / 保质期 视图与操作
   ========================================================= */
var CATS = ['数码', '文具', '药品', '食品', '日用品', '工具', '厨具', '衣物', '证件票据', '运动户外', '小家电', '其他'];
var itemQ = '';
var itemCat = '全部';
var itemComposing = false;
var itemSelectMode = false;
var itemSelected = {};
var CALENDAR_DAYS = 7;

function catSelect(sel, cur) {
  var s = '<option value="">请选择</option>';
  CATS.forEach(function (c) { s += '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + c + '</option>'; });
  return '<select id="' + sel + '">' + s + '</select>';
}

/* ---------- 物品库视图 ---------- */
function renderItems() {
  var list = filteredItems();
  var cats = ['全部'];
  var selectedCount = Object.keys(itemSelected).length;
  activeItems().forEach(function (i) { if (cats.indexOf(i.category) < 0) cats.push(i.category); });

  var html = '<section class="catalog-head">';
  html += '<div class="stage-kicker"><span class="eyebrow-code">02</span><span>STORAGE MATRIX</span></div>';
  html += '<h2>仓格矩阵</h2><p>按位置、分类和状态检索每一件在库物件。</p>';
  html += '</section>';

  html += '<section class="catalog-controls">';
  html += '<div class="catalog-search-row">';
  html += '<div class="searchbar"><input id="itemSearch" placeholder="检索名称 / 位置 / 分类…" value="' + esc(itemQ) + '" oncompositionstart="itemSearchComposition(true)" oncompositionend="itemSearchComposition(false, this.value)" oninput="itemSearch(this.value)" /></div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="toggleItemSelectMode()">' + (itemSelectMode ? '退出批量' : '批量管理') + '</button>';
  html += '</div>';
  html += '<div class="chips">';
  cats.forEach(function (c) {
    html += '<button class="chip' + (c === itemCat ? ' active' : '') + '" onclick="itemCatFilter(\'' + c + '\')">' + esc(c) + '</button>';
  });
  html += '</div>';
  html += '<div class="catalog-footer"><span class="catalog-count">' + list.length + ' OBJECTS / ' + cats.length + ' TAGS</span><button class="btn btn-primary btn-sm" onclick="openItemForm(null)">＋ 新建索引</button></div>';
  html += '</section>';

  if (itemSelectMode) {
    html += '<div class="batch-bar">';
    html += '<div><b class="batch-count">已选 ' + selectedCount + ' 件</b><div class="muted">点击仓格行进行选择</div></div>';
    html += '<div class="batch-actions">';
    html += '<button class="btn btn-sm btn-ghost" onclick="selectAllVisibleItems()">全选当前</button>';
    html += '<button class="btn btn-sm btn-ghost" onclick="clearItemSelection()">取消选择</button>';
    html += '<button class="btn btn-sm btn-danger" onclick="deleteSelectedItems()"' + (selectedCount ? '' : ' disabled') + '>删除选中（' + selectedCount + '）</button>';
    html += '</div></div>';
  }
  html += '<div id="itemResults">' + itemResultsHTML(list) + '</div>';
  $('#view').innerHTML = html;
}
function itemResultsHTML(list) {
  var html = '';
  if (list.length === 0) {
    html += '<div class="empty"><div class="ic"></div><p>没有匹配的仓格记录</p></div>';
  } else {
    html += '<div class="rack-table">';
    html += '<div class="rack-head"><span>OBJECT</span><span>LOCATION</span><span>STATE</span><span>ID</span></div>';
    list.forEach(function (i) { html += itemCardHTML(i); });
    html += '</div>';
  }
  return html;
}
function filteredItems() {
  var list = activeItems().slice();
  var kw = itemQ.trim().toLowerCase();
  if (kw) {
    list = list.filter(function (i) {
      return (i.name || '').toLowerCase().indexOf(kw) >= 0 ||
        (i.location || '').toLowerCase().indexOf(kw) >= 0 ||
        (i.category || '').toLowerCase().indexOf(kw) >= 0 ||
        (i.note || '').toLowerCase().indexOf(kw) >= 0;
    });
  }
  if (itemCat !== '全部') list = list.filter(function (i) { return (i.category || '其他') === itemCat; });
  list.sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  return list;
}

function renderItemResults() {
  var box = $('#itemResults');
  if (!box) { renderItems(); return; }
  box.innerHTML = itemResultsHTML(filteredItems());
}

function itemSearch(v) {
  itemQ = v;
  /* 中文输入法组合期间不刷新列表，避免输入框和候选词被重建 */
  if (!itemComposing) renderItemResults();
}
function itemSearchComposition(active, v) {
  itemComposing = !!active;
  if (!itemComposing && typeof v === 'string') {
    itemQ = v;
    renderItemResults();
  }
}
function itemCatFilter(c) { itemCat = c; itemSelected = {}; renderItems(); }

function toggleItemSelectMode(force) {
  itemSelectMode = (typeof force === 'boolean') ? force : !itemSelectMode;
  itemSelected = {};
  renderItems();
}

function toggleItemSelect(id) {
  if (itemSelected[id]) delete itemSelected[id];
  else itemSelected[id] = true;
  renderItems();
}

function selectAllVisibleItems() {
  filteredItems().forEach(function (i) { itemSelected[i.id] = true; });
  renderItems();
}

function clearItemSelection() {
  itemSelected = {};
  renderItems();
}

function goBatchItems() {
  itemQ = '';
  itemCat = '全部';
  itemSelected = {};
  itemSelectMode = true;
  go('items');
  if (currentView() === 'items') renderItems();
}

function deleteSelectedItems() {
  var ids = Object.keys(itemSelected);
  if (!ids.length) { toast('请先选择物品'); return; }
  if (!window.confirm('确定删除选中的 ' + ids.length + ' 件物品？此操作不可恢复。')) return;
  var drop = {};
  ids.forEach(function (id) { drop[id] = true; });
  DB.items = DB.items.filter(function (i) { return !drop[i.id]; });
  itemSelected = {};
  itemSelectMode = false;
  saveDB();
  render();
  toast('已删除 ' + ids.length + ' 件物品');
}

function itemCardHTML(i) {
  var d = i.expireDate ? daysUntil(i.expireDate) : null;
  var selected = !!itemSelected[i.id];
  var action = itemSelectMode ? ('toggleItemSelect(\'' + i.id + '\')') : ('openItemDetail(\'' + i.id + '\')');
  var h = '<div class="item-card rack-row' + (itemSelectMode ? ' selectable' : '') + (selected ? ' selected' : '') + '" data-id="' + esc(i.id) + '" onclick="' + action + '">';
  if (itemSelectMode) h += '<span class="select-mark" aria-hidden="true"></span>';
  h += '<div class="rack-object"><div class="pic">' + fallbackIcon(i) + '</div><div class="meta"><div class="name">' + esc(i.name) + (i.count > 1 ? ' <span class="rack-count">×' + i.count + '</span>' : '') + '</div><div class="sub">' + esc(i.category || '其他') + (i.note ? ' · ' + esc(i.note) : '') + '</div></div></div>';
  h += '<div class="rack-loc"><span class="rack-mobile-label">位置</span>' + esc(i.location || '未设置位置') + '</div>';
  h += '<div class="rack-state"><span class="rack-mobile-label">状态</span>' + (d !== null ? daysChip(d) : '<span class="tag">在库</span>') + '</div>';
  h += '<div class="rack-code">#' + esc(String(i.id || '').slice(-4).toUpperCase()) + '</div>';
  h += '</div>';
  return h;
}
/* ---------- 保质期视图 ---------- */
function expiryGroups() {
  var g = { expired: [], soon7: [], soon30: [], normal: [] };
  expiringItems().forEach(function (i) {
    var d = daysUntil(i.expireDate);
    var lv = expiryLevel(d);
    if (lv) g[lv.key].push(i);
  });
  var cmp = function (a, b) { return (daysUntil(a.expireDate) || 0) - (daysUntil(b.expireDate) || 0); };
  g.expired.sort(cmp); g.soon7.sort(cmp); g.soon30.sort(cmp); g.normal.sort(cmp);
  return g;
}

function renderExpiry() {
  var g = expiryGroups();
  var calItems = calendarReminderItems();
  var total = g.expired.length + g.soon7.length + g.soon30.length + g.normal.length;

  var html = '<section class="timeline-head">';
  html += '<div><div class="stage-kicker"><span class="eyebrow-code">03</span><span>EXPIRY RAIL</span></div>';
  html += '<h2>到期时间轴</h2><p>按剩余时间排列，先处理红色与橙色区段。</p></div>';
  html += '<div class="timeline-controls"><button class="btn btn-primary btn-sm" onclick="openCapture(\'expiry\')">扫描包装</button><button class="btn btn-ghost btn-sm" onclick="goBatchItems()">批量清理</button></div>';
  html += '</section>';

  html += '<div class="calendar-relay">';
  html += '<div class="relay-mark"></div>';
  html += '<div class="relay-copy"><b>CALENDAR RELAY</b><span>' + (calItems.length ? ('把 ' + calItems.length + ' 件临期物品交给系统日历，到期前 3 天和 1 天提醒') : ('未来 ' + CALENDAR_DAYS + ' 天内没有需要加入日历的物品')) + '</span></div>';
  html += '<button class="btn btn-sm btn-primary" onclick="openCalendarReminder()"' + (calItems.length ? '' : ' disabled') + '>添加到日历' + (calItems.length ? '（' + calItems.length + '）' : '') + '</button>';
  html += '</div>';

  var groups = [
    { key: 'expired', title: '已过期', code: 'EXPIRED', cls: 'red' },
    { key: 'soon7', title: '7 天内到期', code: 'CRITICAL', cls: 'orange' },
    { key: 'soon30', title: '30 天内到期', code: 'WATCH', cls: 'amber' },
    { key: 'normal', title: '正常区间', code: 'STABLE', cls: 'green' }
  ];

  if (total === 0) {
    html += '<div class="empty"><div class="ic"></div><p>时间轴为空，点“扫描包装”建立第一条保质期记录</p></div>';
  } else {
    groups.forEach(function (gr) {
      var arr = g[gr.key];
      if (arr.length === 0) return;
      html += '<section class="timeline-band band-' + gr.cls + '">';
      html += '<div class="band-label"><span class="band-code">' + gr.code + '</span><b>' + gr.title + '</b><span class="band-count">' + arr.length + ' ITEMS</span></div>';
      html += '<div class="band-items">';
      arr.forEach(function (i) {
        var d = daysUntil(i.expireDate);
        var isFood = i.kind !== 'medicine';
        var pct = d < 0 ? 100 : Math.max(5, Math.min(100, 100 - d / 30 * 100));
        html += '<div class="time-row">';
        html += '<div class="pic">' + fallbackIcon(i) + '</div>';
        html += '<div class="time-meta"><div class="name">' + esc(i.name) + (i.count > 1 ? ' <span class="muted">×' + i.count + '</span>' : '') + '</div><div class="sub">' + esc(i.expireDate) + ' · ' + esc(i.location || '未设置位置') + (i.storage ? ' · ' + esc(i.storage) : '') + '</div></div>';
        html += '<div class="time-meter"><i style="width:' + pct + '%"></i><span>' + (d < 0 ? ('OVER ' + Math.abs(d) + 'D') : ('T-' + d + 'D')) + '</span></div>';
        html += '<div class="time-right">' + daysChip(d) + '</div>';
        html += '<div class="time-actions">';
        html += '<button class="btn btn-sm btn-primary" onclick="expireAction(\'' + i.id + '\',\'' + (isFood ? 'eat' : 'use') + '\')">' + (isFood ? '已食用' : '已用完') + '</button>';
        html += '<button class="btn btn-sm btn-danger" onclick="expireAction(\'' + i.id + '\',\'discard\')">已丢弃</button>';
        html += '<button class="btn btn-sm btn-ghost" onclick="openItemDetail(\'' + i.id + '\')">编辑</button>';
        html += '</div></div>';
      });
      html += '</div></section>';
    });
  }
  $('#view').innerHTML = html;
}
/* 处理临期：食用/用完/丢弃 -> 状态置 done */
function expireAction(id, act) {
  var item = null;
  DB.items.forEach(function (i) { if (i.id === id) item = i; });
  if (!item) return;
  if (act === 'eat' || act === 'use') { item.status = 'done'; item.doneNote = act === 'eat' ? '已食用' : '已用完'; }
  else { item.status = 'done'; item.doneNote = '已丢弃'; }
  saveDB();
  render();
  toast('已处理：' + item.name);
}

/* =========================================================
   第 3 部分：模态框 / Toast / 物品表单
   ========================================================= */
function openModal(html, center) {
  var mask = document.createElement('div');
  mask.className = 'modal-mask' + (center ? ' center' : '');
  mask.innerHTML = '<div class="modal">' + html + '</div>';
  mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
  var root = $('#modal-root');
  root.innerHTML = '';
  root.appendChild(mask);
}
function closeModal() {
  if (typeof window.__onModalClose === 'function') {
    var hook = window.__onModalClose;
    window.__onModalClose = null;
    try { hook(); } catch (e) { /* ignore */ }
  }
  $('#modal-root').innerHTML = '';
}
function modalHead(title) {
  return '<div class="modal-head"><h2>' + title + '</h2><button class="modal-close" onclick="closeModal()">×</button></div>';
}
function toast(msg) {
  var old = $('.toast'); if (old) old.remove();
  var t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2200);
}

/* ---------- 物品 新建/编辑 表单 ---------- */
function openItemForm(item) {
  var isNew = !item;
  var it = item || { id: null, name: '', kind: 'object', category: '', count: 1, location: '', note: '', storage: '', expireDate: '' };
  var locs = listLocations();
  var opt = locs.map(function (l) { return '<option value="' + esc(l) + '"></option>'; }).join('');

  var html = modalHead(isNew ? '物品入库' : '编辑物品');
  html += '<div class="field"><label>名称 *</label><input id="f_name" placeholder="例如：无线鼠标" value="' + esc(it.name) + '" /></div>';
  html += '<div class="form-grid">';
  html += '<div class="field"><label>类型</label><select id="f_kind" onchange="toggleKindFields()">';
  html += '<option value="object"' + (it.kind === 'object' ? ' selected' : '') + '>普通物品</option>';
  html += '<option value="food"' + (it.kind === 'food' ? ' selected' : '') + '>食品（需记保质期）</option>';
  html += '<option value="medicine"' + (it.kind === 'medicine' ? ' selected' : '') + '>药品（需记有效期）</option>';
  html += '</select></div>';
  html += '<div class="field"><label>分类</label>' + catSelect('f_cat', it.category) + '</div>';
  html += '<div class="field"><label>数量</label><input id="f_count" type="number" min="1" value="' + (it.count || 1) + '" /></div>';
  html += '<div class="field"><label>存放位置</label><input id="f_loc" list="locList" placeholder="如：书桌抽屉" value="' + esc(it.location || '') + '" /><datalist id="locList">' + opt + '</datalist></div>';
  html += '<div class="field full"><label>备注（品牌/颜色等）</label><input id="f_note" placeholder="可选" value="' + esc(it.note || '') + '" /></div>';
  html += '</div>';

  html += '<div id="expiryFields" style="display:none">';
  html += '<div class="form-grid">';
  html += '<div class="field"><label>保存条件</label><select id="f_storage">';
  var storages = ['常温避光', '冷藏 2-6', '冷冻', '阴凉干燥', '开封后冷藏'];
  storages.forEach(function (s) { html += '<option' + (s === it.storage ? ' selected' : '') + '>' + s + '</option>'; });
  html += '</select></div>';
  html += '<div class="field"><label>到期日</label><input id="f_expire" type="date" value="' + esc(it.expireDate || '') + '" /></div>';
  html += '</div>';
  html += '<label style="display:flex;gap:6px;align-items:center;font-size:13px;color:var(--muted)"><input type="checkbox" id="f_remind"' + (it.remind !== false ? ' checked' : '') + ' /> 启用到期提醒并允许加入日历</label>';
  html += '</div>';

  html += '<div style="display:flex;gap:10px;margin-top:6px">';
  html += '<button class="btn btn-primary" style="flex:1" onclick="saveItemForm()">保存</button>';
  if (!isNew) html += '<button class="btn btn-danger" onclick="deleteItem(\'' + it.id + '\')">删除</button>';
  html += '</div>';

  openModal(html, true);
  toggleKindFields();
}
function toggleKindFields() {
  var k = $('#f_kind') ? $('#f_kind').value : 'object';
  var box = $('#expiryFields');
  if (box) box.style.display = (k === 'food' || k === 'medicine') ? 'block' : 'none';
}

function saveItemForm() {
  var name = ($('#f_name').value || '').trim();
  if (!name) { toast('请填写名称'); return; }
  var kind = $('#f_kind').value;
  var isFood = (kind === 'food' || kind === 'medicine');
  var data = {
    name: name,
    kind: kind,
    category: $('#f_cat').value || '其他',
    count: Math.max(1, parseInt($('#f_count').value, 10) || 1),
    location: ($('#f_loc').value || '').trim() || '未设置位置',
    note: ($('#f_note').value || '').trim(),
    storage: isFood ? $('#f_storage').value : '',
    expireDate: isFood ? ($('#f_expire').value || '') : '',
    remind: isFood ? !!($('#f_remind') && $('#f_remind').checked) : false
  };
  var idInput = $('#f_id');
  var existingId = idInput ? idInput.value : null;

  // 判断当前是否为编辑（通过隐藏 input 或全局标记）
  var target = null;
  DB.items.forEach(function (i) { if (i.id === existingId) target = i; });
  if (target) {
    Object.keys(data).forEach(function (k) { target[k] = data[k]; });
    toast('已保存：' + name);
  } else {
    var item = {
      id: uid(), status: 'active', icon: '',
      createdAt: todayISO(), doneNote: ''
    };
    Object.keys(data).forEach(function (k) { item[k] = data[k]; });
    DB.items.push(item);
    toast('已入库：' + name);
  }
  saveDB(); closeModal(); render();
}

function deleteItem(id) {
  if (!window.confirm('确定删除该物品？此操作不可恢复。')) return;
  DB.items = DB.items.filter(function (i) { return i.id !== id; });
  saveDB(); closeModal(); render();
  toast('已删除');
}

/* ---------- 日历提醒：导出标准 ICS，由系统日历确认导入 ---------- */
function calendarReminderItems() {
  return activeItems().filter(function (i) {
    if (!i.expireDate || i.remind === false) return false;
    var d = daysUntil(i.expireDate);
    return d !== null && d >= 0 && d <= CALENDAR_DAYS;
  }).sort(function (a, b) {
    return daysUntil(a.expireDate) - daysUntil(b.expireDate);
  });
}

function icsPad(n) { return String(n).length < 2 ? '0' + n : String(n); }
function icsDate(dateISO) { return String(dateISO || '').replace(/-/g, ''); }
function icsStamp(date) {
  var d = date || new Date();
  return d.getUTCFullYear() + icsPad(d.getUTCMonth() + 1) + icsPad(d.getUTCDate()) + 'T' + icsPad(d.getUTCHours()) + icsPad(d.getUTCMinutes()) + icsPad(d.getUTCSeconds()) + 'Z';
}
function icsEscape(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
function icsFold(line) {
  var s = String(line), out = '';
  while (s.length > 73) { out += s.slice(0, 73) + '\r\n '; s = s.slice(73); }
  return out + s;
}
function buildExpiryICS(items) {
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wuxu//Expiry Reminder//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:物序 · 临期提醒',
    'X-WR-TIMEZONE:Asia/Shanghai'
  ];
  var now = icsStamp(new Date());
  items.forEach(function (i) {
    var d = daysUntil(i.expireDate);
    var compact = icsDate(i.expireDate);
    var desc = ['到期日：' + i.expireDate, fmt(d), i.location ? ('位置：' + i.location) : '', i.storage ? ('保存：' + i.storage) : ''].filter(Boolean).join('\n');
    var uid = String(i.id || uid()).replace(/[^A-Za-z0-9_-]/g, '') + '@wuxu';
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTAMP:' + now);
    lines.push('DTSTART:' + compact + 'T010000Z');
    lines.push('DTEND:' + compact + 'T013000Z');
    lines.push('SUMMARY:' + icsEscape('物序：' + i.name + ' 到期'));
    lines.push('DESCRIPTION:' + icsEscape(desc));
    lines.push('LOCATION:' + icsEscape(i.location || ''));
    lines.push('CATEGORIES:' + icsEscape('物序,保质期'));
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P3D');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:' + icsEscape('物序：' + i.name + ' 还有 3 天到期'));
    lines.push('END:VALARM');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:' + icsEscape('物序：' + i.name + ' 明天到期'));
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return '\ufeff' + lines.map(icsFold).join('\r\n') + '\r\n';
}
function downloadICS(ics, filename) {
  var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
  closeModal();
  toast('日历文件已生成，请在系统日历中确认导入');
}
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}
function exportExpiryCalendar() {
  var items = calendarReminderItems();
  if (!items.length) { toast('未来 ' + CALENDAR_DAYS + ' 天内没有需要提醒的物品'); return; }
  var ics = buildExpiryICS(items);
  var filename = 'wuxu-expiry-' + todayISO().replace(/-/g, '') + '.ics';
  try {
    if (isMobileDevice() && navigator.share && navigator.canShare && typeof File !== 'undefined') {
      var file = new File([ics], filename, { type: 'text/calendar' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '物序临期提醒' }).then(function () {
          closeModal();
          toast('请在系统日历中确认导入');
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          downloadICS(ics, filename);
        });
        return;
      }
    }
  } catch (e) { /* 回退到下载 */ }
  downloadICS(ics, filename);
}
function openCalendarReminder() {
  var items = calendarReminderItems();
  var html = modalHead('添加到系统日历');
  html += '<div class="calendar-guide">';
  html += '<p>网页版无法直接读写系统日历。点击下方按钮会生成标准日历文件，由手机或电脑的系统日历确认导入。</p>';
  html += '<p>将创建 ' + items.length + ' 个日历事件，每件物品在到期前 3 天和 1 天提醒。</p>';
  if (!items.length) html += '<p class="muted">未来 ' + CALENDAR_DAYS + ' 天内没有需要提醒的物品。</p>';
  html += '</div>';
  html += '<button class="btn btn-primary btn-block" onclick="exportExpiryCalendar()"' + (items.length ? '' : ' disabled') + '>生成日历文件</button>';
  openModal(html, true);
}

function openItemDetail(id) {
  var it = null;
  DB.items.forEach(function (i) { if (i.id === id) it = i; });
  if (!it) return;
  openItemForm(it);
  // 记录当前编辑 id
  var hid = document.createElement('input');
  hid.type = 'hidden'; hid.id = 'f_id'; hid.value = it.id;
  $('#modal-root .modal').appendChild(hid);
}

function tickHudClock() {
  var el=document.getElementById('hudClock');
  if(!el) return;
  var d=new Date();
  el.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(function(n){return String(n).padStart(2,'0');}).join(':');
}
setInterval(tickHudClock,1000);
tickHudClock();
