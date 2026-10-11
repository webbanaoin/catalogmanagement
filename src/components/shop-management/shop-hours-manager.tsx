"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  LoadingState,
} from "@/components/ui";
import {
  CatalogApiError,
  getCurrentMerchantShop,
  getShopHours,
  updateShopHours,
  type ShopHour,
} from "@/lib/catalog-api";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type EditableHour = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
};

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "18:00";

function emptyWeek(): EditableHour[] {
  return days.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: true,
    openTime: "",
    closeTime: "",
  }));
}

function normalizeHours(items: ShopHour[]): EditableHour[] {
  const byDay = new Map(items.map((item) => [item.dayOfWeek, item]));
  return days.map((_, dayOfWeek) => {
    const item = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      isClosed: item?.isClosed ?? true,
      openTime: item?.openTime ?? "",
      closeTime: item?.closeTime ?? "",
    };
  });
}

function usesDifferentTimings(week: EditableHour[]): boolean {
  const schedules = new Set(
    week
      .filter((hour) => !hour.isClosed)
      .map((hour) => `${hour.openTime}|${hour.closeTime}`),
  );
  return schedules.size > 1;
}

export function ShopHoursManager() {
  const [shopId, setShopId] = useState("");
  const [hours, setHours] = useState<EditableHour[]>(emptyWeek);
  const [commonOpen, setCommonOpen] = useState(DEFAULT_OPEN);
  const [commonClose, setCommonClose] = useState(DEFAULT_CLOSE);
  const [customTimings, setCustomTimings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const shop = await getCurrentMerchantShop();
        const response = await getShopHours(shop.id);
        if (!active) return;

        const week = normalizeHours(response.items);
        const firstOpenDay = week.find((hour) => !hour.isClosed);
        setShopId(shop.id);
        setHours(week);
        setCommonOpen(firstOpenDay?.openTime || DEFAULT_OPEN);
        setCommonClose(firstOpenDay?.closeTime || DEFAULT_CLOSE);
        // Preserve existing shops with different hours across days.
        // No old schedule is silently collapsed into common timings.
        setCustomTimings(usesDifferentTimings(week));
      } catch (error) {
        if (!active) return;
        setFeedback({
          variant: "error",
          message:
            error instanceof CatalogApiError
              ? error.message
              : "Unable to load opening hours.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectedDays = useMemo(
    () => hours.filter((hour) => !hour.isClosed),
    [hours],
  );

  const validationError = useMemo(() => {
    if (!selectedDays.length) return null;
    if (!customTimings) {
      return !commonOpen || !commonClose
        ? "Set both opening and closing times for the selected days."
        : null;
    }
    const invalid = selectedDays.find(
      (hour) => !hour.openTime || !hour.closeTime,
    );
    return invalid
      ? `Set both opening and closing times for ${days[invalid.dayOfWeek]}.`
      : null;
  }, [commonClose, commonOpen, customTimings, selectedDays]);

  function toggleOpen(dayOfWeek: number, isOpen: boolean) {
    setHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek
          ? {
              ...hour,
              isClosed: !isOpen,
              openTime: isOpen ? hour.openTime || commonOpen : hour.openTime,
              closeTime: isOpen ? hour.closeTime || commonClose : hour.closeTime,
            }
          : hour,
      ),
    );
    setFeedback(null);
  }

  function selectDays(dayIndexes: readonly number[]) {
    const openDays = new Set(dayIndexes);
    setHours((current) =>
      current.map((hour) => ({
        ...hour,
        isClosed: !openDays.has(hour.dayOfWeek),
        openTime: openDays.has(hour.dayOfWeek)
          ? hour.openTime || commonOpen
          : hour.openTime,
        closeTime: openDays.has(hour.dayOfWeek)
          ? hour.closeTime || commonClose
          : hour.closeTime,
      })),
    );
    setFeedback(null);
  }

  function updateDay(dayOfWeek: number, patch: Partial<EditableHour>) {
    setHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour,
      ),
    );
    setFeedback(null);
  }

  function changeTimingMode(useCustom: boolean) {
    if (
      !useCustom &&
      usesDifferentTimings(hours) &&
      !window.confirm(
        "Use the same hours for all selected days? Their individual timings will be replaced with the common opening and closing times when you save.",
      )
    ) {
      return;
    }
    setCustomTimings(useCustom);
    setFeedback(null);
  }

  async function save() {
    if (!shopId) {
      setFeedback({ variant: "error", message: "Shop is unavailable." });
      return;
    }
    if (validationError) {
      setFeedback({ variant: "error", message: validationError });
      return;
    }

    const payload = hours.map((hour) => ({
      dayOfWeek: hour.dayOfWeek,
      isClosed: hour.isClosed,
      openTime: hour.isClosed
        ? null
        : customTimings
          ? hour.openTime
          : commonOpen,
      closeTime: hour.isClosed
        ? null
        : customTimings
          ? hour.closeTime
          : commonClose,
    }));

    setSaving(true);
    setFeedback(null);
    try {
      const response = await updateShopHours(shopId, payload);
      const savedWeek = normalizeHours(response.items);
      const firstOpenDay = savedWeek.find((hour) => !hour.isClosed);
      setHours(savedWeek);
      setCommonOpen(firstOpenDay?.openTime || commonOpen);
      setCommonClose(firstOpenDay?.closeTime || commonClose);
      setCustomTimings(usesDifferentTimings(savedWeek));
      setFeedback({
        variant: "success",
        message: "Shop opening days and timings saved successfully.",
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        message:
          error instanceof CatalogApiError
            ? error.message
            : "Unable to save opening hours.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading opening hours"
        description="Fetching the saved weekly schedule."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop opening days &amp; timings</CardTitle>
        <CardDescription>
          Select the days your shop is open, then set its opening and closing
          time once. Unselected days will be marked as closed on your storefront.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Open on these days
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => selectDays([0, 1, 2, 3, 4, 5])}
                disabled={saving}
              >
                Mon–Sat
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => selectDays([0, 1, 2, 3, 4, 5, 6])}
                disabled={saving}
              >
                All days
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {hours.map((hour) => {
              const isOpen = !hour.isClosed;
              return (
                <label
                  key={hour.dayOfWeek}
                  className={[
                    "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-medium transition",
                    isOpen
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-muted",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(event) =>
                      toggleOpen(hour.dayOfWeek, event.target.checked)
                    }
                    disabled={saving}
                    className="accent-emerald-700"
                  />
                  <span>{days[hour.dayOfWeek]}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            Checked = Open · Unchecked = Closed. {selectedDays.length} of 7 days selected.
          </p>
        </div>

        {selectedDays.length > 0 ? (
          <>
            {!customTimings ? (
              <div className="grid gap-4 rounded-xl border border-border bg-surface-muted/30 p-4 sm:grid-cols-2">
                <Field label="Opening time" htmlFor="shop-hours-common-open">
                  <Input
                    id="shop-hours-common-open"
                    type="time"
                    value={commonOpen}
                    disabled={saving}
                    onChange={(event) => {
                      setCommonOpen(event.target.value);
                      setFeedback(null);
                    }}
                  />
                </Field>
                <Field label="Closing time" htmlFor="shop-hours-common-close">
                  <Input
                    id="shop-hours-common-close"
                    type="time"
                    value={commonClose}
                    disabled={saving}
                    onChange={(event) => {
                      setCommonClose(event.target.value);
                      setFeedback(null);
                    }}
                  />
                </Field>
                <p className="text-xs text-muted sm:col-span-2">
                  These timings apply automatically to every checked day.
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border bg-surface-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">
                  Different timings by day
                </p>
                {selectedDays.map((hour) => (
                  <div
                    key={hour.dayOfWeek}
                    className="grid items-center gap-3 border-t border-border pt-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {days[hour.dayOfWeek]}
                    </span>
                    <Field
                      label="Opens"
                      htmlFor={`shop-hours-open-${hour.dayOfWeek}`}
                    >
                      <Input
                        id={`shop-hours-open-${hour.dayOfWeek}`}
                        type="time"
                        value={hour.openTime}
                        disabled={saving}
                        onChange={(event) =>
                          updateDay(hour.dayOfWeek, { openTime: event.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="Closes"
                      htmlFor={`shop-hours-close-${hour.dayOfWeek}`}
                    >
                      <Input
                        id={`shop-hours-close-${hour.dayOfWeek}`}
                        type="time"
                        value={hour.closeTime}
                        disabled={saving}
                        onChange={(event) =>
                          updateDay(hour.dayOfWeek, { closeTime: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={customTimings}
                onChange={(event) => changeTimingMode(event.target.checked)}
                disabled={saving}
                className="accent-emerald-700"
              />
              Set different timings for individual days (optional)
            </label>
          </>
        ) : (
          <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted">
            No open days selected. Select at least one day to set hours, or save
            all days as closed.
          </p>
        )}

        {validationError ? (
          <p role="alert" className="text-sm text-danger">{validationError}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || Boolean(validationError)}
          >
            {saving ? "Saving…" : "Save opening hours"}
          </Button>
          <p className="text-sm text-muted">
            Unchecked days will show as Closed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
