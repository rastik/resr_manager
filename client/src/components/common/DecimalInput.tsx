import React from 'react';
import { Input, InputProps } from '@heroui/react';

export interface DecimalInputProps extends Omit<InputProps, 'value' | 'onChange' | 'onValueChange'> {
  value: number | string;
  onValueChange?: (value: string, numericValue: number | undefined) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowDecimals?: boolean;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onValueChange,
  onChange,
  allowDecimals = true,
  ...props
}) => {
  const displayValue = value === null || value === undefined ? '' : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Standardize comma to dot
    raw = raw.replace(/,/g, '.');

    // Filter characters
    if (allowDecimals) {
      // Allow digits and at most one dot
      // Keep only digits and dots
      raw = raw.replace(/[^0-9.]/g, '');
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      // Only digits
      raw = raw.replace(/[^0-9]/g, '');
    }

    if (onValueChange) {
      const num = raw === '' || raw === '.' ? undefined : Number(raw);
      onValueChange(raw, isNaN(num as number) ? undefined : num);
    }

    if (onChange) {
      e.target.value = raw;
      onChange(e);
    }
  };

  return (
    <Input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
};
