import { describe, expect, it, vi } from 'vitest';

// The data store initialises Firebase from env vars; the profile defaults do not need it.
vi.mock('@forge/datastore', () => ({ useDataStore: () => ({}) }));
import { defaultProfile } from '../src/ProfileProvider';

describe('identity: default profile', () => {
  it('uses the account display name', () => {
    expect(defaultProfile({ displayName: 'Amr', email: 'a@b.c' })).toMatchObject({ name: 'Amr', unit: 'kg', startWeight: null, targetWeight: null, targetDate: '' });
  });
  it('falls back to the email prefix, then to Athlete', () => {
    expect(defaultProfile({ email: 'shady@example.com' }).name).toBe('shady');
    expect(defaultProfile({}).name).toBe('Athlete');
  });
});
