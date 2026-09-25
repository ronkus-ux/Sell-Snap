import type { Metadata } from 'next';
import { ProductForm } from '@/components/product/ProductForm';
import { createProduct } from '../actions';
import styles from './new.module.css';

export const metadata: Metadata = { title: 'New Product' };

export default function NewProductPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create Product</h1>
        <p className={styles.subtitle}>Add a new product to generate a shareable payment link.</p>
      </div>
      <ProductForm action={createProduct} submitLabel="Create & Get Link" />
    </div>
  );
}
