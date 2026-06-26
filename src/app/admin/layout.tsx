import { ReactNode } from 'react';
import { getSession } from '@/lib/auth/session';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // No session — middleware handles the redirect for protected routes.
  // The login page itself reaches here with no session; render it without the shell.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <AdminSidebar userName={session.name} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
