'use client';

import { useActionState, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './ProductForm.module.css';
import Image from 'next/image';
import type { ActionResult } from '@/types';

type ProductFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  defaultValues?: {
    name?: string;
    description?: string;
    price?: string;
    imageUrl?: string;
  };
};

const initialState: ActionResult = { ok: true };

export function ProductForm({ action, submitLabel, defaultValues }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(defaultValues?.imageUrl ?? null);
  const [values, setValues] = useState({
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    price: defaultValues?.price ?? '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [lastState, setLastState] = useState<ActionResult>(initialState);

  if (state !== lastState) {
    setLastState(state);
    if (!state.ok && state.values) {
      setValues({
        name: state.values.name ?? '',
        description: state.values.description ?? '',
        price: state.values.price ?? '',
      });
    }
  }

  const fieldErrors = !state.ok ? state.fieldErrors : undefined;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    selectedFileRef.current = file;
    const objectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (isPending) {
        e.preventDefault();
        return;
      }
      if (selectedFileRef.current && fileInputRef.current && fileInputRef.current.files?.length === 0) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(selectedFileRef.current);
        fileInputRef.current.files = dataTransfer.files;
      }
    },
    [isPending]
  );

  return (
    <form action={formAction} onSubmit={handleSubmit} className={styles.form}>
      {!state.ok && !state.fieldErrors && (
        <div className={styles.errorBanner} role="alert">
          {state.error.message}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Basic Info</h2>
            <div className={styles.cardBody}>
              <Input
                label="Product name"
                name="name"
                type="text"
                placeholder="e.g. Black Hoodie"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                error={fieldErrors?.name}
                required
                hideRequiredAsterisk
              />

              <div className={styles.fieldGroup}>
                <label htmlFor="description" className={styles.textareaLabel}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className={fieldErrors?.description ? `${styles.textarea} ${styles.textareaError}` : styles.textarea}
                  placeholder="Describe your product details, materials, size, etc."
                  rows={4}
                  value={values.description}
                  onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                  aria-invalid={fieldErrors?.description ? 'true' : undefined}
                  required
                />
                {fieldErrors?.description && (
                  <p className={styles.fieldError} role="alert">
                    {fieldErrors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Pricing</h2>
            <div className={styles.cardBody}>
              <Input
                label="Price (NGN)"
                name="price"
                type="number"
                min="1"
                step="1"
                placeholder="15000"
                value={values.price}
                onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
                error={fieldErrors?.price}
                required
                hideRequiredAsterisk
              />
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Product Image</h2>
            <div className={styles.cardBody}>
              <div
                className={styles.imageDropzone}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload product image"
              >
                {preview ? (
                  <Image
                    src={preview}
                    alt="Product preview"
                    fill
                    className={styles.previewImage}
                    sizes="(max-width: 1024px) 100vw, 400px"
                    unoptimized={preview.startsWith('blob:')}
                  />
                ) : (
                  <div className={styles.dropzonePlaceholder}>
                    <span className={styles.uploadIcon} aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="m17 8-5-5-5 5" />
                        <path d="M12 3v12" />
                      </svg>
                    </span>
                    <p className={styles.uploadText}>Click or drag file to upload</p>
                    <p className={styles.uploadHint}>Max size 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className={styles.hiddenInput}
                aria-label="Product image file input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/products" className={styles.cancelBtn}>
          Cancel
        </Link>
        <Button type="submit" size="md" isLoading={isPending} className={styles.submitBtn}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}