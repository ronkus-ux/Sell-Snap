import type { OrderStatus } from '@prisma/client';

export type { OrderStatus };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  businessName: string;
};

export type ProductWithUser = {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number; // in kobo
  imageUrl: string;
  uniqueSlug: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    businessName: string;
    email: string;
  };
};

export type OrderWithProduct = {
  id: string;
  productId: string;
  buyerEmail: string | null;
  buyerName: string | null;
  amount: number; // in kobo
  status: OrderStatus;
  transactionReference: string;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    uniqueSlug: string;
    userId: string;
  };
};

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | {
      ok: false;
      error: { code: string; message: string };
      fieldErrors?: Record<string, string>;
      values?: { name?: string; description?: string; price?: string };
    };
