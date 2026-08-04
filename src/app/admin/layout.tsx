import { ReactNode } from 'react';
import { Outfit } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import AdminShell from '@/components/admin/AdminShell';

/**
 * Brief 133 (Track B / SEC-3) — where revocation is actually enforced.
 *
 * `src/middleware.ts` runs on the Edge runtime (Next 14.2 has no Node runtime
 * for middleware — `experimental.nodeMiddleware` only exists from 15.2), so it
 * cannot reach Postgres to read a user's `session_epoch`. It stays a cheap
 * signature+expiry pre-filter.
 *
 * The authoritative check lives in `getSession`, which is DB-backed and gates
 * BOTH surfaces that matter: every `/api/cms/*` route (→ 401) and this layout,
 * which wraps every admin page. A token that is signature-valid but revoked
 * therefore renders nothing — this layout redirects to the login page instead
 * of falling through to `children`.
 *
 * These three paths are reachable without a session by design (Brief 119's
 * token-gated links), so they must never be redirected — that would loop.
 */
const UNGATED_ADMIN_PATHS = new Set(['/admin/login', '/admin/approve-user', '/admin/set-password']);

// Admin-only headline font (Brief 80). Scoped to this layout so it never loads
// on public pages — Industry stays the public-site heading font.
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // No session — middleware handles the redirect for protected routes.
  // The login page itself reaches here with no session; render it without the shell.
  if (!session) {
    // …unless the request DID carry a session cookie that middleware's signature
    // check accepted but `getSession` rejected — i.e. a revoked/disabled/deleted
    // user (Brief 133). Middleware waved it through, so this layout has to send
    // them to the login page rather than render the page body.
    const cookieStore = await cookies();
    const hasSessionCookie = Boolean(cookieStore.get('cms_session')?.value);
    if (hasSessionCookie) {
      // `x-pathname` is set by middleware on every admin pass-through (Brief 127).
      const pathname = (await headers()).get('x-pathname') ?? '';
      if (!UNGATED_ADMIN_PATHS.has(pathname)) {
        redirect('/admin/login');
      }
    }

    return (
      <div className={outfit.variable}>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
        />
        {children}
      </div>
    );
  }

  return (
    <div className={outfit.variable}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
      />
      <AdminShell userName={session.name}>{children}</AdminShell>
    </div>
  );
}
