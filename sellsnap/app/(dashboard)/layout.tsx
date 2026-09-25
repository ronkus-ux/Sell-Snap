import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import styles from './dashboard.layout.module.css';
import Link from 'next/link';
import { DashboardNav } from './_components/DashboardNav';
import { SidebarNav } from './_components/SidebarNav';
import { UserMenu } from './_components/UserMenu';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/auth');
  if (!session.user.onboarded) redirect('/onboarding');

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <Link href="/dashboard" className={styles.logoLink}>
            <span>SellSnap</span>
          </Link>
        </div>

        <SidebarNav />

        <div className={styles.sidebarFooter}>
          <UserMenu
            name={session.user.name}
            businessName={(session.user as { businessName?: string }).businessName}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className={styles.mobileHeader}>
        <Link href="/dashboard" className={styles.mobileLogo}>
          <span>SellSnap</span>
        </Link>
        <UserMenu
          variant="topbar"
          name={session.user.name}
          businessName={(session.user as { businessName?: string }).businessName}
        />
      </header>

      {/* Mobile bottom nav */}
      <DashboardNav />

      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
