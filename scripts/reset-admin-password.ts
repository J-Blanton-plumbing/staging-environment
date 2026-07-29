/**
 * Brief 118 — Reset the CMS admin password (local dev DB).
 *
 * Idempotent: updates the existing marketing@jblantonplumbing.com row in
 * cms_users; re-seeds the row if it is missing. Hashing matches the login
 * path (bcryptjs, cost 12 — see scripts/migrate-cms-users.ts and
 * src/app/api/auth/login/route.ts).
 *
 * The new password is NEVER hardcoded — supply it via env var:
 *
 *   RESET_ADMIN_PASSWORD='<new password>' npx ts-node --project tsconfig.scripts.json scripts/reset-admin-password.ts
 *
 * Optional: RESET_ADMIN_EMAIL to target a different account
 * (defaults to marketing@jblantonplumbing.com).
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const email = process.env.RESET_ADMIN_EMAIL || 'marketing@jblantonplumbing.com';
const newPassword = process.env.RESET_ADMIN_PASSWORD;

if (!newPassword) {
  console.error('RESET_ADMIN_PASSWORD env var is required. The password is never hardcoded in this script.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function resetPassword() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(newPassword as string, 12);

    const updated = await client.query(
      'UPDATE cms_users SET password_hash = $1 WHERE email = $2 RETURNING id, name',
      [passwordHash, email]
    );

    if (updated.rowCount && updated.rowCount > 0) {
      console.log(`✅ Password updated for ${email} (user id ${updated.rows[0].id}, name "${updated.rows[0].name}").`);
    } else {
      const inserted = await client.query(
        `INSERT INTO cms_users (name, email, password_hash)
         VALUES ('Admin', $1, $2)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [email, passwordHash]
      );
      console.log(`✅ No existing row — re-seeded ${email} (user id ${inserted.rows[0].id}).`);
    }
  } catch (err) {
    console.error('Password reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPassword();
