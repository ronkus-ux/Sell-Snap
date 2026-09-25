import Link from 'next/link';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatNaira } from '@/lib/utils';
import styles from './OrderList.module.css';
import type { OrderStatus } from '@prisma/client';

type OrderListItem = {
  id: string;
  amount: number;
  status: OrderStatus;
  createdAt: Date | string;
  transactionReference: string;
  buyerEmail: string | null;
  buyerName: string | null;
  product: { name: string };
};

type OrderListProps = {
  orders: OrderListItem[];
  productCount: number;
  showBuyer?: boolean;
  showTransactionRef?: boolean;
  variant?: 'rows' | 'table';
  showEmptyAction?: boolean;
  totalOrders?: number;
};

function BuyerIdentity({ order }: { order: OrderListItem }) {
  if (order.buyerName) {
    return (
      <>
        <span className={styles.buyerName}>{order.buyerName}</span>
        {order.buyerEmail && <span className={styles.buyerEmail}>{order.buyerEmail}</span>}
      </>
    );
  }
  if (order.buyerEmail) {
    return <span className={styles.buyerName}>{order.buyerEmail}</span>;
  }
  return <span className={styles.buyerName}>Anonymous buyer</span>;
}

export function OrderList({
  orders,
  productCount,
  showBuyer = false,
  showTransactionRef = false,
  variant = 'rows',
  showEmptyAction = true,
  totalOrders,
}: OrderListProps) {
  if (orders.length === 0) {
    const hasProducts = productCount > 0;
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <h3 className={styles.emptyTitle}>
          {showEmptyAction ? 'No orders placed yet' : 'No orders yet'}
        </h3>
        <p className={styles.emptyText}>
          {showEmptyAction
            ? hasProducts
              ? 'Share your product link on WhatsApp or Instagram to start receiving orders.'
              : 'Create your first product to generate a payment link and start selling.'
            : 'Create your first product to start selling.'}
        </p>
        {showEmptyAction && (
          <Link
            href={hasProducts ? '/products' : '/products/new'}
            className={styles.emptyBtn}
            id={hasProducts ? 'orders-share-link' : 'orders-create-product'}
          >
            {hasProducts ? 'Share Product Link' : 'Create Product'}
          </Link>
        )}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Product</span>
          <span>Order ID</span>
          <span>Buyer</span>
          <span className={`${styles.centerText} ${styles.dateHeader}`}>Date</span>
          <span className={styles.alignRight}>Amount</span>
          <span className={styles.alignRight}>Status</span>
        </div>
        {orders.map((order) => (
          <div key={order.id} className={styles.tableRow}>
            <span className={styles.tableProduct}>{order.product.name}</span>
            <span
              className={styles.tableText}
              title={`Order ID: ${order.id}\nTransaction ref: ${order.transactionReference}`}
            >
              {order.id.slice(0, 8)}
            </span>
            <span className={styles.buyerCell}>
              <BuyerIdentity order={order} />
            </span>
            <span className={`${styles.tableDate} ${styles.alignRight}`}>{formatDate(order.createdAt)}</span>
            <span className={`${styles.amountCell} ${styles.alignRight}`}>
              {formatNaira(order.amount)}
            </span>
            <span className={`${styles.badgeCell} ${styles.alignRight}`}>
              <OrderStatusBadge status={order.status} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  const showMoreOrders = totalOrders != null && totalOrders > 3;

  return (
    <div className={styles.orderList}>
      {orders.map((order) => (
        <div key={order.id} className={styles.orderRow}>
          <span className={`${styles.cell} ${styles.nameCell}`}>
            <span className={styles.productName}>{order.product.name}</span>
          </span>
          {showTransactionRef && (
            <span
              className={`${styles.cell} ${styles.textCell}`}
              title={`Order ID: ${order.id}\nTransaction ref: ${order.transactionReference}`}
            >
              {order.id.slice(0, 8)}
            </span>
          )}
          {showBuyer && (
            <span className={`${styles.cell} ${styles.buyerCell}`}>
              <BuyerIdentity order={order} />
            </span>
          )}
          <span className={`${styles.cell} ${styles.dateCell}`}>{formatDate(order.createdAt)}</span>
          <span className={styles.amountCell}>
            {formatNaira(order.amount)}
          </span>
          <span className={styles.badgeCell}>
            <OrderStatusBadge status={order.status} />
          </span>
        </div>
      ))}
      {showMoreOrders && (
        <Link href="/orders" className={styles.moreLink} id="orders-view-all">
          View all orders
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}