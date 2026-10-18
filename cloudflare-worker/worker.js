// =========================================================
// 物序 · AI 代理（Cloudflare Worker）
// 作用：在服务端安全持有大模型密钥，转发图片到智谱 GLM-4V，
//       并把结果整理成前端需要的结构化 JSON。
// 环境变量（在 Cloudflare Worker → Settings → Variables 里设置）：
//   AI_BASE_URL         https://open.bigmodel.cn/api/paas/v4
//   AI_API_KEY          你的智谱 API Key（保密）
//   AI_MODEL            glm-4v-flash
//   SUPABASE_URL        https://xxxx.supabase.co（用于校验登录）
//   SUPABASE_ANON_KEY   Supabase publishable key
// =========================================================

const PRECISE_PREFIX = '【精准模式】请先进行内部观察与排除：主体轮廓、接口/按键、材质、包装文字、尺寸比例。不要先给答案，不要复述过程；完成核对后只输出一次稳定 JSON。每项给 3 个候选名称，候选之间必须有可见差异；confidence 按证据强弱校准。';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zhiwu-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const PROMPTS = {
  item: [
    '你是家庭物品管理助手的视觉识别模块。请识别图片中的物品，只输出 JSON，不要任何解释。',
    '格式：{"items":[{"name":"物品通用名称","category":"数码|文具|药品|食品|日用品|工具|厨具|衣物|证件票据|运动户外|小家电|其他","count":1,"attributes":{"品牌":"可选","颜色":"可选","备注":"可观察特征"},"suggest_location":"建议存放位置","confidence":0.0}]}',
    '可识别出多个物品时全部列出；不要编造图片中看不到的品牌或日期。',
  ].join('\n'),
  expiry: [
    '下面是食品/药品包装图片，请识别并抽取保质期信息，只输出 JSON，不要任何解释。',
    '格式：{"product_name":"商品名称","kind":"food|medicine","production_date":"YYYY-MM-DD或null","expiry_date_direct":"YYYY-MM-DD或null","shelf_life":{"value":数字或null,"unit":"天|周|月|年"},"storage":"常温|冷藏|冷冻|阴凉干燥|开封后冷藏","count":1,"uncertain_fields":[]}',
    '规则：保质期至/有效期至/限用日期填 expiry_date_direct；保质期 6 个月、21 天等填 shelf_life；无法判断的字段置 null 并写入 uncertain_fields。',
  ].join('\n'),
  diet: [
    '你是营养分析助手。请识别图片中的食物并估算营养，只输出 JSON，不要任何解释。',
    '格式：{"dishes":[{"name":"菜品名称","ingredients_hint":"主要食材","portion":{"level":"少|中|多","grams_range":[最小克,最大克]},"nutrition":{"kcal":数值,"protein_g":数值,"fat_g":数值,"carb_g":数值},"confidence":0.0}],"notes":"整体说明"}',
    '要求：外食/家常菜按常见做法估算；热量给合理数值，不要伪精确；识别不出具体菜名时给最接近的类别。',
  ].join('\n'),
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/, '').trim();
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { return null; }
}

function toISO(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function computeExpiry(p) {
  const direct = p && p.expiry_date_direct;
  if (direct && /^\d{4}-\d{2}-\d{2}$/.test(String(direct))) return String(direct);
  if (p && p.production_date && p.shelf_life && p.shelf_life.value) {
    const base = new Date(String(p.production_date) + 'T00:00:00Z');
    if (!isNaN(base.getTime())) {
      const v = Number(p.shelf_life.value);
      const unit = String(p.shelf_life.unit || '天');
      const d = new Date(base.getTime());
      if (unit === '天') d.setUTCDate(d.getUTCDate() + v);
      else if (unit === '周') d.setUTCDate(d.getUTCDate() + v * 7);
      else if (unit === '月' || unit === '年') {
        const months = unit === '年' ? v * 12 : v;
        d.setUTCMonth(d.getUTCMonth() + months);
      }
      return toISO(d);
    }
  }
  return null;
}

function normalize(intent, p) {
  if (intent === 'item') {
    const items = Array.isArray(p && p.items) ? p.items : [];
    return { items: items.map((x) => ({
      name: String((x && x.name) || '未识别物品'),
      category: String((x && x.category) || '其他'),
      count: Number(x && x.count) || 1,
      location: String((x && (x.suggest_location || x.location)) || '未设置位置'),
      note: [x && x.attributes && x.attributes.品牌, x && x.attributes && x.attributes.颜色, x && x.attributes && x.attributes.备注].filter(Boolean).join(' '),
      icon: '',
      confidence: (x && typeof x.confidence === 'number') ? x.confidence : 0.8,
    })) };
  }
  if (intent === 'expiry') {
    const expireDate = computeExpiry(p);
    let daysLeft = 30;
    if (expireDate) {
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      daysLeft = Math.round((new Date(expireDate + 'T00:00:00').getTime() - t0.getTime()) / 86400000);
    }
    return {
      name: String((p && p.product_name) || '未识别商品'),
      kind: p && p.kind === 'medicine' ? 'medicine' : 'food',
      storage: String((p && p.storage) || '常温避光'),
      count: Number(p && p.count) || 1,
      expireDate: expireDate || toISO(new Date()),
      daysLeft,
      icon: p && p.kind === 'medicine' ? '💊' : '🥫',
      note: (p && Array.isArray(p.uncertain_fields) && p.uncertain_fields.length) ? ('待确认字段：' + p.uncertain_fields.join('、')) : '',
      confidence: 0.85,
    };
  }
  const dishes = Array.isArray(p && p.dishes) ? p.dishes : [];
  return { dishes: dishes.map((x) => ({
    name: String((x && x.name) || '未识别食物'),
    icon: '🍽️',
    kcal: Math.round(Number(x && x.nutrition && x.nutrition.kcal) || 0),
    p: Math.round(Number(x && x.nutrition && x.nutrition.protein_g) || 0),
    f: Math.round(Number(x && x.nutrition && x.nutrition.fat_g) || 0),
    c: Math.round(Number(x && x.nutrition && x.nutrition.carb_g) || 0),
    portion: String((x && x.portion && x.portion.level) || '中'),
    tip: String((p && p.notes) || '').slice(0, 40),
    isEstimated: true,
  })) };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (request.method !== 'POST') return json({ ok: false, error: '仅支持 POST' }, 405);
    try {
      // ---- 登录校验（防止别人盗用你的 AI 额度）----
      const auth = request.headers.get('Authorization') || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
        if (!token || token.indexOf('sb_publishable_') === 0) {
          return json({ ok: false, error: '请先登录后再使用 AI 识别' }, 401);
        }
        const who = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/auth/v1/user', {
          headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
        });
        if (!who.ok) return json({ ok: false, error: '登录状态无效，请重新登录' }, 401);
      }

      const body = await request.json();
      const intent = String((body && body.intent) || 'item');
      const image = body && body.image;
      const precise = !(body && body.precise === false);
      if (!image) return json({ ok: false, error: '缺少图片数据' }, 400);

      const base = String(env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
      const key = env.AI_API_KEY;
      const model = env.AI_MODEL || 'glm-4v-flash';
      if (!key) return json({ ok: false, error: '服务端未配置 AI_API_KEY' }, 500);

      const raw = String(image).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
      async function callModel(imageValue) {
        const r = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          body: JSON.stringify({
            model, temperature: precise ? 0.05 : 0.2, max_tokens: precise ? 1600 : 1200,
            messages: [{ role: 'user', content: [
              { type: 'text', text: (precise ? PRECISE_PREFIX + '\n' : '') + (PROMPTS[intent] || PROMPTS.item) },
              { type: 'image_url', image_url: { url: imageValue } },
            ] }],
          }),
        });
        const t = await r.text();
        let d = null; try { d = JSON.parse(t); } catch (e) { /* ignore */ }
        return { ok: r.ok, status: r.status, data: d, text: t };
      }

      let call = await callModel(String(image));
      if (!call.ok && raw && raw !== String(image)) {
        const retry = await callModel(raw);
        if (retry.ok) call = retry;
      }
      if (!call.ok) {
        const msg = (call.data && call.data.error && call.data.error.message) || ('模型接口错误 HTTP ' + call.status);
        return json({ ok: false, error: msg, raw: String(call.text).slice(0, 300) }, 502);
      }
      const content = call.data && call.data.choices && call.data.choices[0] && call.data.choices[0].message && call.data.choices[0].message.content;
      const outText = typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => (c && c.text) || '').join('') : '';
      const parsed = extractJson(outText);
      if (!parsed) return json({ ok: false, error: '模型未返回有效 JSON', raw: outText.slice(0, 400) }, 502);
      return json({ ok: true, intent, model, data: normalize(intent, parsed) });
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 500);
    }
  },
};
