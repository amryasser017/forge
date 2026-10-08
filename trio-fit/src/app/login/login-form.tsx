'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { FeedbackProvider } from '@/components/ui/feedback';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';

const MEMBERS = [
  { slug: 'amr', name: 'AMR', n: '01', bg: 'peer-checked:border-brand-orange peer-checked:bg-brand-orange/10', text: 'text-brand-orange' },
  { slug: 'aman', name: 'AMAN', n: '02', bg: 'peer-checked:border-brand-sky peer-checked:bg-brand-sky/20', text: 'text-sky-600' },
  { slug: 'shady', name: 'SHADY', n: '03', bg: 'peer-checked:border-brand-green peer-checked:bg-brand-green/20', text: 'text-emerald-600' },
];

export function LoginForm() {
  const [show, setShow] = useState(false);
  return (
    <FeedbackProvider>
      <ActionForm action={loginAction} className="card space-y-5 text-[#172b4d]">
        <fieldset>
          <legend className="label">Who&apos;s training?</legend>
          <div className="grid grid-cols-3 gap-2">
            {MEMBERS.map((m) => (
              <label key={m.slug} className="cursor-pointer">
                <input type="radio" name="memberSlug" value={m.slug} className="peer sr-only" required />
                <span className={`flex flex-col items-center rounded-xl border-2 border-[#e3e8ef] p-2 text-center transition ${m.bg}`}>
                  <Image src={`/avatars/${m.slug}.png`} alt="" width={96} height={128} className="h-24 w-full rounded-lg bg-white object-cover object-top" />
                  <span className={`mt-1 text-sm font-extrabold ${m.text}`}>{m.name}</span>
                  <span className="text-[11px] text-[#5e6c84]">Member {m.n}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Crew password" name="password">
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5e6c84]" />
            <input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className="pl-9 pr-12 !text-[#172b4d] !bg-white" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#5e6c84]" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <Submit className="btn btn-primary w-full" pendingText="Checking…">Enter TRIO FIT</Submit>
        <p className="text-center text-xs text-[#5e6c84]">Private to AMR, AMAN and SHADY. No public sign-up.</p>
      </ActionForm>
    </FeedbackProvider>
  );
}
