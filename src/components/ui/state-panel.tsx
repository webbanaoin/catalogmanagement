import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type StateKind = "loading" | "empty" | "error" | "success";

const stateStyles: Record<StateKind, string> = {
  loading: "border-border bg-surface",
  empty: "border-border bg-surface",
  error: "border-danger/25 bg-danger-soft/60",
  success: "border-success/25 bg-success-soft/60",
};

const stateMarker: Record<Exclude<StateKind, "loading">, string> = {
  empty: "—",
  error: "!",
  success: "✓",
};

export interface StatePanelProps {
  kind: StateKind;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function StatePanel({ kind, title, description, action, className }: StatePanelProps) {
  const isLoading = kind === "loading";
  const role = kind === "error" ? "alert" : isLoading ? "status" : undefined;

  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center rounded-2xl border p-6 text-center",
        stateStyles[kind],
        className,
      )}
      role={role}
      aria-live={role ? "polite" : undefined}
    >
      {isLoading ? (
        <span
          className="size-9 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
      ) : (
        <span
          className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-muted-strong"
          aria-hidden="true"
        >
          {stateMarker[kind]}
        </span>
      )}
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
      {isLoading ? <span className="sr-only">Loading</span> : null}
    </div>
  );
}

export function LoadingState(props: Omit<StatePanelProps, "kind">) {
  return <StatePanel kind="loading" {...props} />;
}

export function EmptyState(props: Omit<StatePanelProps, "kind">) {
  return <StatePanel kind="empty" {...props} />;
}

export function ErrorState(props: Omit<StatePanelProps, "kind">) {
  return <StatePanel kind="error" {...props} />;
}

export function SuccessState(props: Omit<StatePanelProps, "kind">) {
  return <StatePanel kind="success" {...props} />;
}
