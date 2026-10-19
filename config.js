/* =========================================================
   物序 · 云端配置（Supabase）
   填入你的项目信息后，账号登录 + 云存储 + 多端同步即启用。
   获取方式：见根目录 docs/09_账号与云同步实施说明.md
   - SUPABASE_URL：项目 Settings → API → Project URL（形如 https://xxxx.supabase.co）
   - SUPABASE_ANON_KEY：同页的 anon public 密钥
   （anon key 用于客户端公开访问，安全由数据库行级策略 RLS 保护）
   ========================================================= */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://nehqecfyvkybahpopxck.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_JPzKdo6iLMg90cUIjFs96g_6Sv4Xpa5',
  // 可选：Cloudflare Worker 的地址（填了就优先用它做 AI 代理；留空则用 Supabase Edge Function）
  AI_ENDPOINT: ''
};

