import { cache } from 'react';
import { db } from '@/lib/db';

/**
 * Centralized data accessors wrapped in React's `cache()`.
 * This deduplicates identical DB queries within a single render pass —
 * e.g. the dashboard layout and a page both reading the session, or a
 * page querying a product that its children also need. Each function is
 * called once per request; subsequent calls with the same arguments reuse
 * the already-resolved result instead of hitting the database again.
 */

export const getDashboardStats = cache(async (userId: string) => {
  const [productCount, orders] = await Promise.all([
    db.product.count({ where: { userId } }),
    db.order.findMany({
      where: { product: { userId } },
      select: { amount: true, status: true },
    }),
  ]);

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);

  return {
    productCount,
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    totalRevenue,
  };
});

export const getProductsForUser = cache(async (userId: string) => {
  return db.product.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
});

export const getOrdersForUser = cache(async (userId: string) => {
  return db.order.findMany({
    where: { product: { userId } },
    include: {
      product: { select: { name: true, imageUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
});

export const getRecentOrders = cache(async (userId: string, limit = 5) => {
  return db.order.findMany({
    where: { product: { userId } },
    include: {
      product: { select: { name: true, imageUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
});

export const getProductCount = cache(async (userId: string) => {
  return db.product.count({ where: { userId } });
});

export const getProductForEdit = cache(async (productId: string, userId: string) => {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.userId !== userId) return null;
  return product;
});

export const getUserProfile = cache(async (userId: string) => {
  return db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, businessName: true },
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({
    where: { uniqueSlug: slug },
    include: {
      user: { select: { businessName: true, name: true } },
    },
  });
});

export const preloadProductBySlug = cache(async (slug: string) => {
  void getProductBySlug(slug);
});
