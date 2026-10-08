import { Download } from 'lucide-react';
import { ProfileForm, RulesForm, Shop } from '@/components/settings/forms';
import { Notice, PageTitle, SectionTitle } from '@/components/ui/bits';
import { aiConfigured, env } from '@/lib/server/env';
import { cosmeticCatalog, getMember, getTotalsFor } from '@/lib/server/members';
import { requireSession } from '@/lib/server/session';
import { getRules } from '@/lib/server/settings';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  const s = await requireSession();
  const [me, rules, shop, totals] = await Promise.all([getMember(s.memberId), getRules(), cosmeticCatalog(s.memberId), getTotalsFor(s.memberId)]);
  const ai = aiConfigured();
  return (
    <div className="space-y-6">
      <PageTitle title="Settings" sub={`Signed in as ${me!.display_name}`} />
      <section className="card"><SectionTitle>Profile &amp; preferences</SectionTitle><ProfileForm member={me!} /></section>
      <section className="card"><SectionTitle>Avatar shop</SectionTitle><Shop items={shop} coins={totals.coins} equippedTitle={me!.equipped_title} equippedFrame={me!.equipped_frame} /></section>
      <section className="card"><SectionTitle>Game reward values</SectionTitle><RulesForm rules={rules} /></section>
      <section className="card space-y-3">
        <SectionTitle>AI &amp; data</SectionTitle>
        <Notice tone={ai ? 'sky' : 'orange'}>{ai ? <>AI is on (model <code>{env().aiModel}</code>). The key lives on the server only.</> : <>AI is off: add <code>ANTHROPIC_API_KEY</code> in your hosting environment. Encouragement uses data-based templates meanwhile.</>}</Notice>
        <p className="text-sm muted">Timezone for day boundaries: <b>{env().timezone}</b> (set <code>APP_TIMEZONE</code> to change). Weight unit: kg.</p>
        <a href="/api/export" className="btn btn-ghost w-fit"><Download size={16} /> Export my data (JSON)</a>
      </section>
    </div>
  );
}
