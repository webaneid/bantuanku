import React from 'react';
import { cn } from '@/lib/cn';
import { Label, Input, Textarea, Select } from '@/components/atoms';
import type { InputProps, TextareaProps, SelectProps } from '@/components/atoms';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  help?: string;
  className?: string;
}

// FormField with Input
export interface InputFieldProps extends FormFieldProps, Omit<InputProps, 'error'> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    { label, required, error, help, className, id, ...inputProps },
    ref
  ) => {
    const fieldId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('form-field', className)}>
        {label && (
          <Label htmlFor={fieldId} required={required}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={fieldId}
          error={!!error}
          {...inputProps}
        />
        {error && <span className="form-error">{error}</span>}
        {help && !error && <span className="form-help">{help}</span>}
      </div>
    );
  }
);

InputField.displayName = 'InputField';

// FormField with Textarea
export interface TextareaFieldProps extends FormFieldProps, Omit<TextareaProps, 'error'> {}

export const TextareaField = React.forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
  (
    { label, required, error, help, className, id, ...textareaProps },
    ref
  ) => {
    const fieldId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('form-field', className)}>
        {label && (
          <Label htmlFor={fieldId} required={required}>
            {label}
          </Label>
        )}
        <Textarea
          ref={ref}
          id={fieldId}
          error={!!error}
          {...textareaProps}
        />
        {error && <span className="form-error">{error}</span>}
        {help && !error && <span className="form-help">{help}</span>}
      </div>
    );
  }
);

TextareaField.displayName = 'TextareaField';

// FormField with Select
export interface SelectFieldProps extends FormFieldProps, Omit<SelectProps, 'error'> {}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    { label, required, error, help, className, id, children, ...selectProps },
    ref
  ) => {
    const fieldId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('form-field', className)}>
        {label && (
          <Label htmlFor={fieldId} required={required}>
            {label}
          </Label>
        )}
        <Select
          ref={ref}
          id={fieldId}
          error={!!error}
          {...selectProps}
        >
          {children}
        </Select>
        {error && <span className="form-error">{error}</span>}
        {help && !error && <span className="form-help">{help}</span>}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
