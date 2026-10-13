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

export function ShopHoursManager() {
  const [shopId, setShopId] = useState("");
  const [hours, setHours] = useState<EditableHour[]>(emptyWeek);
  const [commonOpen, setCommonOpen] = useState("09:00");
  const [commonClose, setCommonClose] = useState("18:00");
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
        setShopId(shop.id);
        const week = normalizeHours(response.items);
        const openDays = week.filter((hour) => !hour.isClosed);
        const first = openDays[0];
        setHours(week);
        setCommonOpen(first?.openTime || "09:00");
        setCommonClose(first?.closeTime || "18:00");
        // Existing different daily hours stay in custom mode until explicitly changed.
        setCustomTimings(new Set(openDays.map((h) => h.openTime + "|" + h.closeTime)).size > 1);
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

  const validationError = useMemo(() => {
    const openDays = hours.filter((h) => !h.isClosed);
    if (!openDays.length) return null;
    if (!customTimings) {
      return commonOpen && commonClose ? null : "Set both common opening and closing times.";
    }
    const invalid = openDays.find((h) => !h.openTime || !h.closeTime);
    return invalid ? `${days[invalid.dayOfWeek]} needs opening and closing times.` : null;
  }, [hours, commonOpen, commonClose, customTimings]);

  function updateDay(dayOfWeek: number, patch: Partial<EditableHour>) {
    setHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour,
      ),
    );
    setFeedback(null);
  }

  function toggleClosed(dayOfWeek: number, isClosed: boolean) {
    setHours((current) =>
      current.map((hour) => {
        if (hour.dayOfWeek !== dayOfWeek) return hour;
        if (isClosed) return { ...hour, isClosed: true };

        return {
          ...hour,
          isClosed: false,
          openTime: hour.openTime || commonOpen,
          closeTime: hour.closeTime || commonClose,
        };
      }),
    );
    setFeedback(null);
  }

  function selectOpenDays(dayIndexes: readonly number[]) {
    const selected = new Set(dayIndexes);
    setHours((current) => current.map((hour) => ({
      ...hour,
      isClosed: !selected.has(hour.dayOfWeek),
      openTime: selected.has(hour.dayOfWeek) ? hour.openTime || commonOpen : hour.openTime,
      closeTime: selected.has(hour.dayOfWeek) ? hour.closeTime || commonClose : hour.closeTime,
    })));
    setFeedback(null);
  }

  function toggleCustom(next: boolean) {
    if (!next && customTimings) {
      const schedules = new Set(hours.filter((h) => !h.isClosed).map((h) => h.openTime + "|" + h.closeTime));
      if (schedules.size > 1 && !window.confirm("Replace the individual daily times with the common opening and closing time when you save?")) return;
    }
    setCustomTimings(next);
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

    setSaving(true);
    setFeedback(null);
    try {
      const response = await updateShopHours(
        shopId,
        hours.map((hour) => ({
          dayOfWeek: hour.dayOfWeek,
          isClosed: hour.isClosed,
          openTime: hour.isClosed ? null : customTimings ? hour.openTime : commonOpen,
          closeTime: hour.isClosed ? null : customTimings ? hour.closeTime : commonClose,
        })),
      );
      const saved = normalizeHours(response.items);
      const openDays = saved.filter((h) => !h.isClosed);
      setHours(saved);
      setCommonOpen(openDays[0]?.openTime || commonOpen);
      setCommonClose(openDays[0]?.closeTime || commonClose);
      setCustomTimings(new Set(openDays.map((h) => h.openTime + "|" + h.closeTime)).size > 1);
      setFeedback({
        variant: "success",
        message: "Opening hours saved successfully.",
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
          Select your open days and set the same opening and closing time once. Unselected days stay closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Select open days</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => selectOpenDays([0, 1, 2, 3, 4, 5])} disabled={saving}>Mon–Sat</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => selectOpenDays([0, 1, 2, 3, 4, 5, 6])} disabled={saving}>All days</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {hours.map((hour) => (
              <label key={hour.dayOfWeek}
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium ${hour.isClosed ? "border-border bg-background text-muted" : "border-primary bg-primary-soft text-primary"}`}>
                <input type="checkbox" checked={!hour.isClosed} disabled={saving}
                  onChange={(event) => toggleClosed(hour.dayOfWeek, !event.target.checked)} />
                {days[hour.dayOfWeek]}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">Checked = Open, unchecked = Closed.</p>
          {hours.some((hour) => !hour.isClosed) ? (
            <>
              {customTimings ? (
                <div className="space-y-2">
                  {hours.filter((hour) => !hour.isClosed).map((hour) => (
                    <div key={hour.dayOfWeek} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-end">
                      <p className="text-sm font-semibold text-foreground">{days[hour.dayOfWeek]}</p>
                      <Field label="Opens" htmlFor={`shop-hours-open-${hour.dayOfWeek}`}>
                        <Input id={`shop-hours-open-${hour.dayOfWeek}`} type="time" value={hour.openTime} disabled={saving}
                          onChange={(event) => updateDay(hour.dayOfWeek, { openTime: event.target.value })} />
                      </Field>
                      <Field label="Closes" htmlFor={`shop-hours-close-${hour.dayOfWeek}`}>
                        <Input id={`shop-hours-close-${hour.dayOfWeek}`} type="time" value={hour.closeTime} disabled={saving}
                          onChange={(event) => updateDay(hour.dayOfWeek, { closeTime: event.target.value })} />
                      </Field>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
                  <Field label="Opening time" htmlFor="shop-hours-common-open">
                    <Input id="shop-hours-common-open" type="time" value={commonOpen} disabled={saving}
                      onChange={(event) => { setCommonOpen(event.target.value); setFeedback(null); }} />
                  </Field>
                  <Field label="Closing time" htmlFor="shop-hours-common-close">
                    <Input id="shop-hours-common-close" type="time" value={commonClose} disabled={saving}
                      onChange={(event) => { setCommonClose(event.target.value); setFeedback(null); }} />
                  </Field>
                  <p className="text-xs text-muted sm:col-span-2">These timings apply to all selected open days.</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={customTimings} disabled={saving}
                  onChange={(event) => toggleCustom(event.target.checked)} />
                Set different timings for individual days (optional)
              </label>
            </>
          ) : (
            <p className="text-sm text-muted">All days are closed. Select days above to add opening hours.</p>
          )}
          {validationError ? <p role="alert" className="text-sm text-danger">{validationError}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save opening hours"}
          </Button>
          <p className="text-sm leading-6 text-muted">
            Unchecked days will be marked Closed on the storefront.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
