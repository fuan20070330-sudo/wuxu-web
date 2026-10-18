// =========================================================
// 物序 · 真实 AI 识别 Edge Function（Supabase / Deno）
// 作用：服务端持有大模型密钥，接收图片 + 意图，返回结构化 JSON
// 环境变量：
//   AI_BASE_URL   OpenAI 兼容地址，如 https://open.bigmodel.cn/api/paas/v4
//   AI_API_KEY    你的大模型 API Key（只存在服务端，绝不下发前端）
//   AI_MODEL      模型名，如 glm-4v-flash / qwen-vl-max / doubao-1.5-vision-pro
// =========================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zhiwu-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/* 体验模式限流（按来源 IP，每小时重置；仅作用于云函数实例内存） */
const guestUsage: Record<string, { count: number; reset: number }> = {};
const PRECISE_PREFIX = '【精准模式】请先进行内部观察与排除：主体轮廓、接口/按键、材质、包装文字、尺寸比例。不要先给答案，不要复述过程；完成核对后只输出一次稳定 JSON。每项给 3 个候选名称，候选之间必须有可见差异；confidence 按证据强弱校准。';

const PROMPTS: Record<string, string> = {
  item: [
    '你是中国家庭物品管理助手的视觉识别模块。',
    '任务：识别图片中最主要的一件或多件**实体物品**，不要识别背景、天空、地面、光线等环境内容。',
    '要求：',
    '1. 名称使用中国人日常称呼（如：充电线/数据线、保温杯、指甲剪、蓝牙耳机），不要用英文或学术名称；',
    '2. 同时给出 2-3 个候选名称（按可能性从高到低），以便用户一键改选；',
    '3. category 只能从以下取一个：数码|文具|药品|食品|日用品|工具|厨具|衣物|证件票据|运动户外|小家电|其他；',
    '4. suggest_location 给一个中国家庭常见存放位置（如：书桌抽屉、玄关柜、药箱、冰箱·冷藏层）；',
    '5. 物品模糊或过小时如实给低 confidence，不要编造品牌；',
    '只输出 JSON：{"items":[{"name":"物品名","candidates":["候选1","候选2"],"category":"类别","count":1,"attributes":{"品牌":"","颜色":"","备注":""},"suggest_location":"建议位置","confidence":0.0}]}',
  ].join('\\n'),
  expiry: [
    '你是食品/药品包装标签识别助手，服务对象是中国用户。',
    '任务：读取图片中的商品名称、生产日期、保质期/有效期、保存条件。',
    '要求：',
    '1. 重点识别包装上的小字；一张图里出现多个日期时，务必区分“生产日期”与“保质期至/有效期至”；',
    '2. 先把你看到的关键文字原样抄写到 ocr_text，再填写结构化字段，便于人工核对；',
    '3. “保质期 6 个月/21 天”这类写法放入 shelf_life；包装直接印的到期日放入 expiry_date_direct；',
    '4. 无法确定的字段填 null 并写入 uncertain_fields，不要猜测；',
    '只输出 JSON：{"ocr_text":"","product_name":"","kind":"food|medicine","production_date":"YYYY-MM-DD或null","expiry_date_direct":"YYYY-MM-DD或null","shelf_life":{"value":null,"unit":"天|周|月|年"},"storage":"常温|冷藏|冷冻|阴凉干燥|开封后冷藏","count":1,"uncertain_fields":[]}',
  ].join('\\n'),
  diet: [
    '你是中国饮食营养分析助手。',
    '任务：识别照片中的食物，并估算份量与营养。',
    '要求：',
    '1. 优先给出**中文菜名**（如：番茄炒蛋、黄焖鸡米饭、兰州拉面），并给 2-3 个候选菜名；',
    '2. 结合常见餐具（碗/盘/筷子/拳头）估算份量：portion.level 取 少/中/多，并给出克数区间；',
    '3. 营养按中国家庭/外卖常见做法估算（考虑油、糖、酱料）：kcal 取整，蛋白质/脂肪/碳水单位为克；',
    '4. 无法确定具体菜名时给出最接近的类别（如“红烧肉类”），并在 notes 说明；',
    '只输出 JSON：{"dishes":[{"name":"菜名","candidates":["候选1","候选2"],"ingredients_hint":"主要食材","portion":{"level":"中","grams_range":[200,350]},"nutrition":{"kcal":0,"protein_g":0,"fat_g":0,"carb_g":0},"confidence":0.0}],"notes":"整体说明"}',
  ].join('\\n'),
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function extractJson(text: string): any {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch (_e) { return null; }
}

function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const r = new Date(d.getTime());
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function computeExpiry(p: any) {
  let expire: string | null = null;
  const direct = p && p.expiry_date_direct;
  if (direct && /^\d{4}-\d{2}-\d{2}$/.test(String(direct))) expire = String(direct);
  else if (p && p.production_date && p.shelf_life && p.shelf_life.value) {
    const base = new Date(String(p.production_date) + 'T00:00:00');
    if (!isNaN(base.getTime())) {
      const v = Number(p.shelf_life.value);
      const unit = String(p.shelf_life.unit || '天');
      let d = new Date(base.getTime());
      if (unit === '天') d.setDate(d.getDate() + v);
      else if (unit === '周') d.setDate(d.getDate() + v * 7);
      else if (unit === '月') d = addMonths(base, v);
      else if (unit === '年') d = addMonths(base, v * 12);
      expire = toISO(d);
    }
  }
  return expire;
}

function normalize(intent: string, p: any) {
  if (intent === 'item') {
    const items = Array.isArray(p?.items) ? p.items : [];
    return {
      items: items.map((x: any) => ({
        name: String(x?.name || '未识别物品'),
        category: String(x?.category || '其他'),
        count: Number(x?.count) || 1,
        location: String(x?.suggest_location || x?.location || '未设置位置'),
        note: [x?.attributes?.品牌, x?.attributes?.颜色, x?.attributes?.备注].filter(Boolean).join(' '),
        candidates: Array.isArray(x?.candidates) ? x.candidates.slice(0, 3).map((c: any) => String(c)) : [],
        icon: '',
        confidence: typeof x?.confidence === 'number' ? x.confidence : 0.8,
      })),
    };
  }
  if (intent === 'expiry') {
    const expireDate = computeExpiry(p);
    let daysLeft: number | null = null;
    if (expireDate) {
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      daysLeft = Math.round((new Date(expireDate + 'T00:00:00').getTime() - t0.getTime()) / 86400000);
    }
    return {
      name: String(p?.product_name || '未识别商品'),
      kind: p?.kind === 'medicine' ? 'medicine' : 'food',
      storage: String(p?.storage || '常温避光'),
      count: Number(p?.count) || 1,
      expireDate: expireDate || toISO(new Date()),
      daysLeft: daysLeft === null ? 30 : daysLeft,
      icon: p?.kind === 'medicine' ? '' : '',
      note: Array.isArray(p?.uncertain_fields) && p.uncertain_fields.length ? ('待确认字段：' + p.uncertain_fields.join('、')) : '',
      confidence: 0.85,
    };
  }
  const dishes = Array.isArray(p?.dishes) ? p.dishes : [];
  return {
    dishes: dishes.map((x: any) => ({
      name: String(x?.name || '未识别食物'),
      icon: '',
      kcal: Math.round(Number(x?.nutrition?.kcal) || 0),
      p: Math.round(Number(x?.nutrition?.protein_g) || 0),
      f: Math.round(Number(x?.nutrition?.fat_g) || 0),
      c: Math.round(Number(x?.nutrition?.carb_g) || 0),
      portion: String(x?.portion?.level || '中'),
      tip: String(p?.notes || '').slice(0, 40),
      isEstimated: true,
    })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json();
    const intent = String(body?.intent || 'item');
    const image = body?.image;
    const precise = body?.precise !== false;
    if (!image) return json({ ok: false, error: '缺少图片数据' }, 400);

    // ---- 身份校验 ----
    // 1) 已登录用户：校验登录令牌；
    // 2) 未登录用户：允许携带客户端标识的“体验模式”调用（受每 IP 每小时配额限制），
    //    这样在国内手机网络无法登录云端时，拍照识别仍可用。
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const clientKey = (req.headers.get('x-zhiwu-client') || '').trim();
    const apikey = (req.headers.get('apikey') || '').trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const keyMatches = !!apikey && (!anonKey || apikey === anonKey);
    const allowGuest = !!clientKey && keyMatches;
    const supaUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
    let identity = 'guest';
    let verified = false;

    if (token && !token.startsWith('sb_publishable_') && supaUrl) {
      try {
        const who = await fetch(supaUrl + '/auth/v1/user', {
          headers: { apikey: anonKey || token, Authorization: 'Bearer ' + token },
        });
        verified = who.ok;
        if (verified) identity = 'user';
      } catch (_e) { verified = false; }
    }
    if (!verified && !allowGuest) {
      return json({ ok: false, error: '请先登录后再使用 AI 识别' }, 401);
    }
    // 体验模式限流：同一来源每小时最多 60 次，避免额度被滥用
    if (!verified) {
      const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
      const now = Date.now();
      const bucket = guestUsage[ip] || { count: 0, reset: now + 3600000 };
      if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 3600000; }
      bucket.count += 1;
      guestUsage[ip] = bucket;
      if (bucket.count > 60) {
        return json({ ok: false, error: '体验模式调用过于频繁，请稍后再试或登录后使用' }, 429);
      }
      identity = 'guest';
    }

    const base = (Deno.env.get('AI_BASE_URL') || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
    const key = Deno.env.get('AI_API_KEY');
    const model = Deno.env.get('AI_MODEL') || 'glm-4v-flash';
    if (!key) return json({ ok: false, error: '服务端未配置 AI_API_KEY（请在 Edge Function Secrets 中设置）' }, 500);

    /* 不同厂商对图片格式要求不同：
       - OpenAI 兼容实现通常接受 data URL（data:image/jpeg;base64,xxx）
       - 部分厂商（如智谱）只接受纯 base64，或反之
       这里先按 data URL 调一次，失败后自动改用纯 base64 重试 */
    const rawBase64 = String(image).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');

    async function callModel(imageValue: string) {
      const payload = {
        model,
        temperature: precise ? 0.05 : 0.2,
        max_tokens: precise ? 1600 : Math.min(1024, Math.max(1, Number(Deno.env.get('AI_MAX_TOKENS') || 1024))),
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: (precise ? PRECISE_PREFIX + '\n' : '') + (PROMPTS[intent] || PROMPTS.item) },
            { type: 'image_url', image_url: { url: imageValue } },
          ],
        }],
      };
      const r = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      let d: any = null;
      try { d = JSON.parse(t); } catch (_e) { /* ignore */ }
      return { resp: r, data: d, text: t };
    }

    /* 智谱（bigmodel.cn）优先使用纯 base64，其余厂商优先 data URL；
       两种格式都尝试，任一成功即使用；都失败时把两次原因一并返回，便于排查 */
    const preferRaw = /bigmodel\.cn/i.test(base);
    const firstImage = preferRaw ? rawBase64 : String(image);
    const secondImage = preferRaw ? String(image) : rawBase64;
    const first = await callModel(firstImage);
    let call = first;
    let secondErr = '';
    if (!first.resp.ok && secondImage && secondImage !== firstImage) {
      const second = await callModel(secondImage);
      if (second.resp.ok) call = second;
      else secondErr = second.data?.error?.message || second.data?.message || ('HTTP ' + second.resp.status);
    }
    const { resp, data, text } = call;
    if (!resp.ok) {
      const msg = data?.error?.message || data?.message || ('模型接口错误 HTTP ' + resp.status);
      return json({
        ok: false,
        error: msg,
        tried: preferRaw ? ['base64', 'dataURL'] : ['dataURL', 'base64'],
        secondError: secondErr || undefined,
        raw: String(text).slice(0, 300),
      }, 502);
    }
    const content = data?.choices?.[0]?.message?.content;
    const outText = typeof content === 'string'
      ? content
      : Array.isArray(content) ? content.map((c: any) => c?.text || '').join('') : '';
    const parsed = extractJson(outText);
    if (!parsed) return json({ ok: false, error: '模型未返回有效 JSON', raw: outText.slice(0, 400) }, 502);

    return json({ ok: true, intent, model, identity, data: normalize(intent, parsed) });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
