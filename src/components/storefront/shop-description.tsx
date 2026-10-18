"use client";

import { useId, useState } from "react";

/**
 * Keep the hero compact while giving visitors access to the *entire* saved
 * shop description. This component is display-only; it never truncates or
 * modifies the description stored in MySQL.
 */
export function ShopDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const hasLongDescription = description.length > 140 || description.split(/\r?\n/).length > 3;

  if (!hasLongDescription) {
    return (
      <p className="mt-4 max-w-3xl whitespace-pre-line break-words text-sm leading-6 text-muted">
        {description}
      </p>
    );
  }

  return (
    <div className="mt-4 max-w-3xl">
      <p
        id={descriptionId}
        className={[
          "whitespace-pre-line break-words text-sm leading-6 text-muted",
          expanded ? "" : "line-clamp-3",
        ].join(" ")}
      >
        {description}
      </p>
      <button
        type="button"
        aria-controls={descriptionId}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 inline-flex min-h-9 items-center rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {expanded ? "Show less ↑" : "Read more ↓"}
      </button>
    </div>
  );
}
