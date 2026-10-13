"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function timeLeft(endMs: number, currentMs: number) {
  const seconds = Math.max(0, Math.ceil((endMs - currentMs) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

/** One server-stored deadline, shared across visitors; no browser-specific reset. */
export function OfferCountdown({ endsAt, serverNow }: { endsAt: string; serverNow: number }) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const endMs = new Date(endsAt).getTime();

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setNow(serverNow + (Date.now() - startedAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [serverNow]);

  useEffect(() => {
    if (now >= endMs) router.refresh();
  }, [now, endMs, router]);

  if (!Number.isFinite(endMs)) return null;

  const left = timeLeft(endMs, now);
  const number = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center sm:flex-row sm:justify-between sm:px-6" role="timer" aria-label="Limited time offer countdown">
      <div>
        <p className="text-sm font-extrabold text-emerald-950">Limited-time subscription offer</p>
        <p className="mt-1 text-xs text-emerald-800">Offer ends {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(endMs))} IST</p>
      </div>
      <div className="flex gap-2" aria-label={`${left.days} days ${left.hours} hours ${left.minutes} minutes remaining`}>
        {([
          ["Days", left.days],
          ["Hours", left.hours],
          ["Min", left.minutes],
          ["Sec", left.seconds],
        ] as const).map(([label, value]) => (
          <div key={label} className="min-w-12 rounded-lg bg-white px-2 py-2 shadow-sm">
            <span className="block text-lg font-black tabular-nums text-emerald-900">{number(value)}</span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
