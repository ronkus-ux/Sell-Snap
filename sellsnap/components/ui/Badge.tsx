import { cn } from '@/lib/utils';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

type BadgeProps = {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], className)}>
      {children}
    </span>
  );
}

// Convenience mapping for order status
export function OrderStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    paid: 'success',
    pending: 'warning',
    failed: 'error',
  };

  const labelMap: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
  };

  return (
    <Badge variant={variantMap[status] ?? 'neutral'}>
      {labelMap[status] ?? status}
    </Badge>
  );
}
