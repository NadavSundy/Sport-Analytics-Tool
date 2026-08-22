import type { InputHTMLAttributes } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helpText?: string;
  error?: string;
}

export function TextField({
  className,
  error,
  helpText,
  id,
  label,
  required,
  ...inputProps
}: TextFieldProps) {
  const inputId = id ?? inputProps.name;

  if (!inputId) {
    throw new Error('TextField requires an id or name so its label can be associated with the input.');
  }

  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [inputProps['aria-describedby'], helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      <label htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : inputProps['aria-invalid']}
        className={['ui-field__input', className].filter(Boolean).join(' ')}
        id={inputId}
        required={required}
      />
      {helpText ? <p className="ui-field__help" id={helpId}>{helpText}</p> : null}
      {error ? <p className="ui-field__error" id={errorId}>{error}</p> : null}
    </div>
  );
}
