import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getProductForEdit } from '@/lib/data';
import { ProductForm } from '@/components/product/ProductForm';
import { updateProduct } from '../../actions';
import type { Metadata } from 'next';
import styles from './edit.module.css';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const product = await getProductForEdit(id, session.user.id);
  if (!product) notFound();

  const boundAction = updateProduct.bind(null, id);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Product</h1>
        <p className={styles.subtitle}>Update your product details</p>
      </div>
      <ProductForm
        action={boundAction}
        submitLabel="Save Changes"
        defaultValues={{
          name: product.name,
          description: product.description,
          price: (product.price / 100).toString(), // kobo → naira for form
          imageUrl: product.imageUrl,
        }}
      />
    </div>
  );
}
