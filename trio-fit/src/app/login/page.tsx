import { redirect } from 'next/navigation';
import { Brand } from '@/components/nav/brand';
import { missingConfig } from '@/lib/server/env';
import { getSession } from '@/lib/server/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const missing = missingConfig();
  if (!missing.length && (await getSession())) redirect('/');
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-white via-brand-gray to-brand-sky/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Brand size="lg" />
          <p className="mt-2 text-sm font-semibold text-[#5e6c84]">Three friends. One mission. Stronger every day.</p>
        </div>
        {missing.length > 0 ? (
          <div className="card text-[#172b4d]">
            <h1 className="text-xl">Setup needed</h1>
            <p className="mt-2 text-sm">These server environment variables are missing. Add them (see <code>.env.example</code> and the README), then redeploy:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-mono">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
