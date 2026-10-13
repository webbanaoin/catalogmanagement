import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

const controlClassName =
  "w-full rounded-lg border border-border bg-surface px-3 text-foreground shadow-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-focus/30 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:opacity-70";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClassName, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClassName, "min-h-28 resize-y py-2.5", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClassName, "h-11 appearance-auto", className)} {...props}>
      {children}
    </select>
  );
}

export interface FieldProps {
  children: ReactNode;
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function Field({
  children,
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
