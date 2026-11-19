"use client";

import { useEffect, useState } from "react";

function remaining(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({ config }: { config: Record<string, any> }) {
  const target = config.endsAt ? new Date(config.endsAt).getTime() : Date.now() + 3 * 86_400_000;
  const [time, setTime] = useState(() => remaining(target));

  useEffect(() => {
    const timer = setInterval(() => setTime(remaining(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const parts = [
    { value: time.days, label: "روز" },
    { value: time.hours, label: "ساعت" },
    { value: time.minutes, label: "دقیقه" },
    { value: time.seconds, label: "ثانیه" },
  ];

  return (
    <section className="shell section">
      <div className="flex flex-col items-center gap-8 rounded-[32px] border border-[var(--line)] bg-[var(--panel)] px-6 py-12 text-center">
        <div>
          <p className="eyebrow">{config.eyebrow ?? "پایان فروش ویژه"}</p>
          <h2 className="display-lg mt-3">{config.title ?? "تخفیف کالکشن پاییز"}</h2>
          {config.subtitle ? <p className="mt-3 text-sm text-[var(--muted)]">{config.subtitle}</p> : null}
        </div>
        <div className="flex gap-3" dir="ltr">
          {parts.map((part) => (
            <div key={part.label} className="w-[72px] rounded-2xl bg-[var(--ink)] py-3 text-white">
              <p className="text-xl font-bold tabular-nums">{part.value.toLocaleString("fa-IR")}</p>
              <p className="mt-1 text-[10px] text-white/60">{part.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
