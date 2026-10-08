import 'server-only';

/** Read lazily so `next build` works without secrets; missing values surface as a setup screen instead of a crash. */
export function env() {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    gatePassword: process.env.GATE_PASSWORD ?? '',
    gateHash: process.env.GATE_PASSWORD_HASH ?? '',
    sessionSecret: process.env.SESSION_SECRET ?? '',
    timezone: process.env.APP_TIMEZONE || 'Africa/Cairo',
    aiKey: process.env.ANTHROPIC_API_KEY ?? '',
    aiModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
    aiBaseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
  };
}

/** Names of required variables that are missing (never their values). */
export function missingConfig(): string[] {
  const e = env();
  const out: string[] = [];
  if (!e.supabaseUrl) out.push('SUPABASE_URL');
  if (!e.serviceKey) out.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!e.gatePassword && !e.gateHash) out.push('GATE_PASSWORD');
  if (e.sessionSecret.length < 32) out.push('SESSION_SECRET (min 32 chars)');
  return out;
}
export const aiConfigured = () => env().aiKey.length > 0;
