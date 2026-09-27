import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type AlertVariant = "info" | "success" | "warning" | "error";

const variantClasses: Record<AlertVariant, string> = {
  info: "border-info/20 bg-info-soft text-info-strong",
  success: "border-success/20 bg-success-soft text-success-strong",
  warning: "border-warning/20 bg-warning-soft text-warning-strong",
  error: "border-danger/20 bg-danger-soft text-danger-strong",
};

const marker: Record<AlertVariant, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "!",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  variant?: AlertVariant;
  children: ReactNode;
}

export function Alert({ className, title, variant = "info", children, ...props }: AlertProps) {
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", variantClasses[variant], className)}
      role={role}
      {...props}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-bold"
        aria-hidden="true"
      >
        {marker[variant]}
      </span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn("leading-6", title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}
