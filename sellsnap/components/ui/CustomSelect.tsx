'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import styles from './CustomSelect.module.css';
import inputStyles from './Input.module.css';

type CustomSelectProps = {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
  error?: string;
  hideRequiredAsterisk?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (e: { target: { value: string } }) => void;
  onFocus?: () => void;
  onClick?: () => void;
  onBlur?: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
};

export function CustomSelect({
  label,
  name,
  value = '',
  required,
  error,
  hideRequiredAsterisk = false,
  className,
  style,
  onChange,
  onFocus,
  onClick,
  onBlur,
  children,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uniqueId = useId();
  const errorId = `${uniqueId}-error`;

  const options = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === 'option'
  ) as React.ReactElement<{ value: string; children: string }>[];

  const selectedOption = options.find((opt) => opt.props.value === value);
  const displayText = selectedOption?.props.children || 'Select a category';
  const isSelected = value !== '';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusedIndex]);

  function handleToggle() {
    setIsOpen((prev) => !prev);
    setFocusedIndex(-1);
    if (!isOpen) {
      onFocus?.();
      onClick?.();
    } else {
      onBlur?.({ target: { value } });
    }
  }

  function handleSelect(optionValue: string) {
    onChange?.({ target: { value: optionValue } });
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
    onBlur?.({ target: { value: optionValue } });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        onFocus?.();
        onClick?.();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelect(options[focusedIndex].props.value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        onBlur?.({ target: { value } });
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn(inputStyles.wrapper, className)}>
      <div className={inputStyles.labelRow}>
        <label className={inputStyles.label}>
          {label}
          {required && !hideRequiredAsterisk && (
            <span className={inputStyles.required} aria-hidden="true"> *</span>
          )}
        </label>
      </div>
      <div className={inputStyles.field}>
        <input type="hidden" name={name} value={value} />
        <button
          ref={buttonRef}
          type="button"
          id={uniqueId}
          className={cn(
            styles.trigger,
            error && inputStyles.inputError,
            isOpen && styles.triggerOpen
          )}
          style={style}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
        >
          <span className={cn(styles.triggerText, isSelected && styles.selectedText, !isSelected && styles.placeholder)}>
            {displayText}
          </span>
          <svg
            className={cn(styles.chevron, isOpen && styles.chevronOpen)}
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {isOpen && (
          <ul
            ref={listRef}
            className={styles.listbox}
            role="listbox"
            aria-labelledby={uniqueId}
          >
            {options.map((option, index) => (
              <li
                key={option.props.value}
                className={cn(
                  styles.option,
                  option.props.value === value && styles.optionSelected,
                  index === focusedIndex && styles.optionFocused
                )}
                role="option"
                aria-selected={option.props.value === value}
                onClick={() => handleSelect(option.props.value)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {option.props.children}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p id={errorId} className={inputStyles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
