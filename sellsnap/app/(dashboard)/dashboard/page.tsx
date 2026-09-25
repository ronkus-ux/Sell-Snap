import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getRecentOrders } from '@/lib/data';
import { OrderList } from '@/components/features/orders/OrderList';
import { formatNaira } from '@/lib/utils';
import styles from './dashboard.module.css';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const justSignedUp = params.welcome === 'signup';
  const userId = session.user.id;

  const { productCount, totalOrders, totalRevenue } = await getDashboardStats(userId);
  const recentOrders = await getRecentOrders(userId, 3);

  const businessName = (session.user as { businessName?: string }).businessName ?? '';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            {justSignedUp ? `Welcome, ${businessName}` : `Welcome Back, ${businessName}`}
          </p>
        </div>
        <Link href="/products/new" className={styles.newBtn} id="overview-new-product">
          Create Product
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Total Revenue</p>
            <p className={styles.statValue}>{formatNaira(totalRevenue)}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Total Orders</p>
            <p className={styles.statValue}>{totalOrders}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Active Products</p>
            <p className={styles.statValue}>{productCount}</p>
          </div>
        </div>
      </div>

      <div className={styles.recentOrders}>
        <h2 className={styles.sectionTitle}>Recent Orders</h2>
        <OrderList
          orders={recentOrders}
          productCount={productCount}
          showEmptyAction={productCount > 0}
          totalOrders={totalOrders}
        />
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionCards}>
          <Link href="/products/new" className={styles.actionCard} id="dash-new-product">
            <span className={styles.actionIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <div>
              <p className={styles.actionTitle}>New product</p>
              <p className={styles.actionDesc}>Upload and generate a payment link</p>
            </div>
          </Link>
          <Link href="/products" className={styles.actionCard} id="dash-view-products">
            <span className={styles.actionIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <p className={styles.actionTitle}>My products</p>
              <p className={styles.actionDesc}>View and share your product links</p>
            </div>
          </Link>
          <Link href="/orders" className={styles.actionCard} id="dash-view-orders">
            <span className={styles.actionIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>
            <div>
              <p className={styles.actionTitle}>View orders</p>
              <p className={styles.actionDesc}>Track sales and payment status</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
