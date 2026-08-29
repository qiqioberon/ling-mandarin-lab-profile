import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

/**
 * Admin gate for every /api/admin/* endpoint. Most sensitive code in the manual
 * payment flow — approving an order grants irrevocable access.
 *
 * Rules (see ling.md §A3, §D):
 *  - Admin list lives ONLY on the server (ADMIN_EMAILS, never a VITE_ prefix).
 *  - Never trust an email/flag sent by the browser; identity comes from the
 *    Supabase access token, verified the same way as get-reader-url.ts.
 *  - FAIL CLOSED: empty ADMIN_EMAILS rejects everyone, never allows everyone.
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Pure fail-closed check. Empty list → nobody is admin. */
export function emailIsAdmin(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export type AdminAuthResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

export async function requireAdmin(req: VercelRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized.' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { ok: false, status: 401, error: 'Sesi tidak valid atau kadaluarsa.' };
  }

  if (!emailIsAdmin(data.user.email)) {
    // Don't reveal who the admins are.
    return { ok: false, status: 403, error: 'Akun ini bukan admin.' };
  }

  return { ok: true, email: data.user.email.trim().toLowerCase() };
}
