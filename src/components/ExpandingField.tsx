import type { CSSProperties } from 'react';
import { useLayoutEffect, useRef } from 'react';

type Props = {
  className?: string;
  value: string;
  onChange?: (value: string) => void;
  /** Максимальная высота в режиме печати (как у бумажного блока). На экране блок растёт. */
  printMaxHeight?: string;
  placeholder?: string;
  'aria-label'?: string;
};

/**
 * Текстовый блок листа: на экране растёт вместе с содержимым (не обрезает, как у ЛСС),
 * при печати ограничивается высотой официального блока.
 */
export function ExpandingField({
  className = '',
  value,
  onChange,
  printMaxHeight,
  placeholder,
  'aria-label': ariaLabel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, [value]);

  const style = printMaxHeight
    ? ({ ['--print-max-height']: printMaxHeight } as CSSProperties)
    : undefined;

  return (
    <textarea
      ref={ref}
      className={`expanding-field ${className}`}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
      style={style}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
