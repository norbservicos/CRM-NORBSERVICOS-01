import React, { useRef, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className, ...props }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number to standard Brazilian currency (R$ X.XXX,XX)
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers
    const digits = e.target.value.replace(/\D/g, '');
    const rawValue = digits ? parseInt(digits, 10) / 100 : 0;
    onChange(rawValue);

    // Reposition cursor at the end
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleSelection = () => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    };

    // Ensure cursor is always at the end on interaction
    input.addEventListener('focus', handleSelection);
    input.addEventListener('click', handleSelection);
    input.addEventListener('keyup', handleSelection);
    
    return () => {
      input.removeEventListener('focus', handleSelection);
      input.removeEventListener('click', handleSelection);
      input.removeEventListener('keyup', handleSelection);
    };
  }, [formattedValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent moving cursor with arrow keys or other navigation keys to keep it at the end
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={formattedValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
};
