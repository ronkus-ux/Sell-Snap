'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDateTime, formatNaira } from '@/lib/utils';
import { deleteProduct } from '@/app/(dashboard)/products/actions';
import styles from './ProductCard.module.css';
import type { Product } from '@prisma/client';

type ProductCardProps = {
  product: Product;
  productUrl: string;
};

export const ProductCard = memo(function ProductCard({ product, productUrl }: ProductCardProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [productUrl]);

  const handleDelete = useCallback(async () => {
    setMenuOpen(false);
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await deleteProduct(product.id);
  }, [product.name, product.id]);

  const whatsappText = useMemo(
    () => encodeURIComponent(`Check out ${product.name}: ${productUrl}`),
    [product.name, productUrl]
  );

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className={styles.image}
          sizes="(max-width: 1439px) 50vw, 25vw"
        />
      </div>

      <div ref={menuRef} className={styles.menuWrap}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={`Actions for ${product.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            <Link
              href={`/products/${product.id}/edit`}
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Edit
            </Link>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuDelete}`}
              role="menuitem"
              disabled={deleting}
              onClick={handleDelete}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <p className={styles.name}>{product.name}</p>
        </div>
        <div className={styles.priceDate}>
          <p className={styles.price}>{formatNaira(product.price)}</p>
          <p className={styles.slug}>Added {formatDateTime(product.createdAt)}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleCopy}
          className={styles.copyBtn}
          aria-label={`Copy link for ${product.name}`}
          id={`copy-${product.id}`}
        >
          {copied ? (
            '✓ Copied'
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </>
          )}
        </button>

        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whatsappBtn}
          aria-label={`Share ${product.name} on WhatsApp`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          Share
        </a>
      </div>
    </div>
  );
});
