import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getOrdersForUser, getProductCount } from '@/lib/data';
import { OrderList } from '@/components/features/orders/OrderList';
import styles from './orders.module.css';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) return null;

  const [orders, productCount] = await Promise.all([
    getOrdersForUser(session.user.id),
    getProductCount(session.user.id),
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Orders</h1>
        <p className={styles.subtitle}>
          You have {orders.length} order{orders.length !== 1 ? 's' : ''}.
        </p>
      </div>

      <OrderList
        orders={orders}
        productCount={productCount}
        variant="table"
      />
    </div>
  );
}