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
        setHours(normalizeHours(response.items));
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
    const invalid = hours.find(
      (hour) => !hour.isClosed && (!hour.openTime || !hour.closeTime),
    );
    return invalid
      ? `${days[invalid.dayOfWeek]} needs both opening and closing time.`
      : null;
  }, [hours]);

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
          openTime: hour.openTime || "09:00",
          closeTime: hour.closeTime || "18:00",
        };
      }),
    );
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
          openTime: hour.isClosed ? null : hour.openTime,
          closeTime: hour.isClosed ? null : hour.closeTime,
        })),
      );
      setHours(normalizeHours(response.items));
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
        <CardTitle>Opening hours</CardTitle>
        <CardDescription>
          Configure the weekly timings shown to customers on the public storefront.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        <div className="space-y-3">
          {hours.map((hour) => {
            const label = days[hour.dayOfWeek];
            return (
              <div
                key={hour.dayOfWeek}
                className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[8rem_8rem_1fr_1fr] sm:items-end"
              >
                <p className="pb-2 text-sm font-medium text-foreground">{label}</p>

                <label className="flex min-h-10 items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={hour.isClosed}
                    onChange={(event) =>
                      toggleClosed(hour.dayOfWeek, event.target.checked)
                    }
                  />
                  Closed
                </label>

                <Field label="Opens" htmlFor={`shop-hours-open-${hour.dayOfWeek}`}>
                  <Input
                    id={`shop-hours-open-${hour.dayOfWeek}`}
                    type="time"
                    value={hour.openTime}
                    disabled={hour.isClosed}
                    onChange={(event) =>
                      updateDay(hour.dayOfWeek, { openTime: event.target.value })
                    }
                  />
                </Field>

                <Field label="Closes" htmlFor={`shop-hours-close-${hour.dayOfWeek}`}>
                  <Input
                    id={`shop-hours-close-${hour.dayOfWeek}`}
                    type="time"
                    value={hour.closeTime}
                    disabled={hour.isClosed}
                    onChange={(event) =>
                      updateDay(hour.dayOfWeek, { closeTime: event.target.value })
                    }
                  />
                </Field>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save opening hours"}
          </Button>
          <p className="text-sm leading-6 text-muted">
            Closed days do not require opening or closing times.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
