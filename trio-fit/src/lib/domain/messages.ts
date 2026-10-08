export type Tone = 'hype' | 'calm' | 'funny';
export type Lang = 'ar' | 'en';

export type EventKind = 'workout' | 'pr' | 'comeback' | 'streak' | 'weekly_goal' | 'measurement' | 'level_up' | 'nudge';

export interface Facts {
  name: string;
  volumePct?: number | null; // % change in total volume vs previous session of same exercise(s)
  exercise?: string;
  weightKg?: number;
  streak?: number;
  level?: number;
  daysAway?: number;
  completed?: number;
  planned?: number;
  measurement?: string;
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

const CLOSERS: Record<Lang, Record<Tone, string[]>> = {
  en: {
    hype: ['Let\'s go! 🔥', 'Keep stacking those wins! 💪'],
    calm: ['Steady and strong.', 'Good form first, numbers second.'],
    funny: ['Your future self is already jealous. 😎', 'The weights fear you a little now. 😂'],
  },
  ar: {
    hype: ['كمّل يا بطل! 🔥', 'استمر والنتيجة هتبان! 💪'],
    calm: ['خطوة ثابتة ومظبوطة.', 'خلّي التقنية الصحيحة أهم من الوزن.'],
    funny: ['نفسك في المستقبل هيغير منك! 😎', 'الأوزان بدأت تخاف منك! 😂'],
  },
};

/** Returning null means "not applicable for these facts". The first template wins whenever it applies. */
type Tpl = (f: Facts) => string | null;
const T: Record<Lang, Record<EventKind, Tpl[]>> = {
  en: {
    workout: [
      (f) => (f.volumePct != null && f.volumePct > 0 ? `${f.name}, total volume is up ${f.volumePct}% versus your last comparable session. Real progress.` : null),
      (f) => `${f.name}, another session in the books${f.streak ? ` — ${f.streak}-day streak` : ''}.`,
      (f) => `${f.name}, workout logged. Showing up is the part that counts.`,
    ],
    pr: [(f) => `${f.name}, new personal record on ${f.exercise}${f.weightKg ? ` at ${f.weightKg} kg` : ''}!`],
    comeback: [(f) => `Welcome back, ${f.name}! ${f.daysAway ?? 'A few'} days away doesn't matter — you're here now.`],
    streak: [(f) => `${f.name}, ${f.streak} days in a row. That's discipline.`],
    weekly_goal: [(f) => `${f.name}, weekly goal done: ${f.completed}/${f.planned} planned sessions.`],
    measurement: [(f) => `${f.name}, new ${f.measurement ?? 'measurement'} logged. Tracking is how you steer.`],
    level_up: [(f) => `LEVEL UP! ${f.name} reached level ${f.level}.`],
    nudge: [(f) => `${f.name}, the crew misses you at the gym. Even a light session keeps the habit alive.`],
  },
  ar: {
    workout: [
      (f) => (f.volumePct != null && f.volumePct > 0 ? `يا ${f.name}، إجمالي حجم تمرينك زاد ${f.volumePct}% عن آخر جلسة مشابهة. تقدم حقيقي!` : null),
      (f) => `يا ${f.name}، جلسة جديدة اتضافت${f.streak ? ` وسلسلتك ${f.streak} يوم` : ''}.`,
      (f) => `يا ${f.name}، التمرين اتسجل. الالتزام هو نص الطريق.`,
    ],
    pr: [(f) => `يا ${f.name}، رقم شخصي جديد في ${f.exercise}${f.weightKg ? ` بوزن ${f.weightKg} كجم` : ''}!`],
    comeback: [(f) => `رجعت يا ${f.name}! ${f.daysAway ?? 'كام'} يوم غياب مش مشكلة — المهم إنك هنا دلوقتي.`],
    streak: [(f) => `يا ${f.name}، ${f.streak} يوم ورا بعض. ده انضباط!`],
    weekly_goal: [(f) => `يا ${f.name}، هدف الأسبوع اتحقق: ${f.completed}/${f.planned} جلسات.`],
    measurement: [(f) => `يا ${f.name}، قياس جديد اتسجل (${f.measurement ?? 'قياس'}). المتابعة هي اللي بتوجّه الطريق.`],
    level_up: [(f) => `لِفل أب! ${f.name} وصل لمستوى ${f.level}.`],
    nudge: [(f) => `يا ${f.name}، الشلة وحشتها الجيم. حتى جلسة خفيفة تحافظ على العادة.`],
  },
};

/** Deterministic, fact-based message. Only numbers present in `facts` are ever mentioned. */
export function ruleMessage(kind: EventKind, facts: Facts, tone: Tone, lang: Lang, seed = ''): string {
  const variants = T[lang][kind];
  const h = Math.abs(hash(`${seed}|${kind}|${facts.name}`));
  const first = (variants[0] as Tpl)(facts);
  const rest = variants.slice(1);
  const body = first ?? (rest.length ? (rest[h % rest.length] as Tpl)(facts) : null) ?? '';
  const closers = CLOSERS[lang][tone];
  return `${body} ${closers[h % closers.length]}`;
}

const numbersIn = (t: string) => (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')).sort();

/**
 * An AI rewrite is accepted only if it keeps every number from the verified message, adds none, stays short and is
 * plain text. Otherwise the deterministic message is used, so the AI can never introduce an unverified claim.
 */
export function isFaithfulRewrite(base: string, rewritten: string): boolean {
  const t = rewritten.trim();
  if (!t || t.length > 320 || /[{}[\]]|```/.test(t)) return false;
  return JSON.stringify(numbersIn(base)) === JSON.stringify(numbersIn(t));
}
