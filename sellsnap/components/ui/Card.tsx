import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.css';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div className={cn(styles.card, styles[`padding-${padding}`], className)}>
      {children}
    </div>
  );
}
