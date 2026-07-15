import { ReactNode } from 'react';
import { Outfit } from 'next/font/google';
import { getSession } from '@/lib/auth/session';
import AdminShell from '@/components/admin/AdminShell';

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
