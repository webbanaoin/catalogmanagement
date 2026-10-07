import { Button, Field, Input, Select } from "@/components/ui";
import type { PublicCategory } from "@/server/storefront/storefront-data";

export function StorefrontFilters({
  shopSlug,
  categories,
  catalogGroups,
  catalogGroupLabel,
  primaryFilter,
  q,
  categorySlug,
  catalogGroup,
  attributeValue,
  availability,
}: {
  shopSlug: string;
  categories: PublicCategory[];
  catalogGroups: string[];
  catalogGroupLabel: string;
  primaryFilter: { name: string; label: string; values: string[] } | null;
  q?: string;
  categorySlug?: string;
  catalogGroup?: string;
  attributeValue?: string;
  availability?: string;
}) {
  const activeFilterCount = [
    categorySlug,
    catalogGroup,
    attributeValue,
    availability,
  ].filter(Boolean).length;

  return (
    <form
      key={[
        q ?? "",
        categorySlug ?? "",
        catalogGroup ?? "",
        attributeValue ?? "",
        availability ?? "",
      ].join("|")}
      action={`/s/${shopSlug}`}
      method="get"
      className="overflow-hidden rounded-[1.35rem] border border-border bg-surface shadow-[0_8px_30px_rgba(23,32,29,0.045)]"
      aria-label="Search and filter products"
    >
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
        <label htmlFor="storefront-search" className="relative block min-w-0">
          <span className="sr-only">Search products</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            ⌕
          </span>
          <Input
            id="storefront-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search products, SKU or details"
            className="h-12 rounded-xl border-border bg-background pl-10 pr-4 shadow-none"
          />
        </label>
        <Button
          type="submit"
          className="h-12 w-full rounded-xl px-6 shadow-[0_8px_20px_rgba(23,79,67,0.12)] sm:w-auto"
        >
          Search catalogue
        </Button>
      </div>

      <details
        className="border-t border-border/80 bg-surface-muted/35"
        open={activeFilterCount > 0}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground marker:hidden sm:px-5">
          <span className="flex items-center gap-2">
            Refine products
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
          <span className="text-xs font-medium text-muted">Filters ▾</span>
        </summary>

        <div className="grid gap-3 border-t border-border/70 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {catalogGroups.length > 0 ? (
            <Field label={catalogGroupLabel} htmlFor="storefront-catalog-group">
              <Select
                id="storefront-catalog-group"
                name="group"
                defaultValue={catalogGroup ?? ""}
                className="rounded-xl bg-surface"
              >
                <option value="">All {catalogGroupLabel.toLowerCase()}</option>
                {catalogGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Category" htmlFor="storefront-category">
            <Select
              id="storefront-category"
              name="category"
              defaultValue={categorySlug ?? ""}
              className="rounded-xl bg-surface"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          {primaryFilter ? (
            <Field
              label={primaryFilter.label}
              htmlFor="storefront-primary-filter"
            >
              <Select
                id="storefront-primary-filter"
                name="spec"
                defaultValue={attributeValue ?? ""}
                className="rounded-xl bg-surface"
              >
                <option value="">
                  Any {primaryFilter.label.toLowerCase()}
                </option>
                {primaryFilter.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Availability" htmlFor="storefront-availability">
            <Select
              id="storefront-availability"
              name="availability"
              defaultValue={availability ?? ""}
              className="rounded-xl bg-surface"
            >
              <option value="">Any availability</option>
              <option value="IN_STOCK">In stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
              <option value="ON_REQUEST">On request</option>
            </Select>
          </Field>

          <div className="self-end sm:col-span-2 lg:col-span-4">
            <Button
              type="submit"
              variant="secondary"
              className="w-full rounded-xl sm:w-auto"
            >
              Apply filters
            </Button>
          </div>
        </div>
      </details>
    </form>
  );
}
