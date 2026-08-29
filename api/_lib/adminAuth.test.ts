import { describe, it, expect, vi, afterEach } from 'vitest';

// emailIsAdmin reads ADMIN_EMAILS at module load, so re-import per case.
async function loadWith(adminEmails: string | undefined) {
  vi.resetModules();
  if (adminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = adminEmails;
  return (await import('./adminAuth')).emailIsAdmin;
}

afterEach(() => vi.resetModules());

describe('emailIsAdmin — fail closed', () => {
  it('rejects everyone when ADMIN_EMAILS is empty', async () => {
    const emailIsAdmin = await loadWith('');
    expect(emailIsAdmin('anyone@example.com')).toBe(false);
  });

  it('rejects everyone when ADMIN_EMAILS is unset', async () => {
    const emailIsAdmin = await loadWith(undefined);
    expect(emailIsAdmin('anyone@example.com')).toBe(false);
  });

  it('rejects null/empty email', async () => {
    const emailIsAdmin = await loadWith('admin@example.com');
    expect(emailIsAdmin(null)).toBe(false);
    expect(emailIsAdmin('')).toBe(false);
  });

  it('accepts a listed email case-insensitively, rejects others', async () => {
    const emailIsAdmin = await loadWith('Admin@Example.com, boss@x.io');
    expect(emailIsAdmin('admin@example.com')).toBe(true);
    expect(emailIsAdmin('  BOSS@X.IO ')).toBe(true);
    expect(emailIsAdmin('intruder@example.com')).toBe(false);
  });
});
