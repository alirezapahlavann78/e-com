"use client";

import { useState } from "react";

export function Newsletter({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done">("idle");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!email) return;
        setState("done");
        setEmail("");
      }}
      className="mx-auto flex w-full max-w-md flex-col gap-2 sm:flex-row"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="ایمیل شما"
        aria-label={title ?? "ایمیل"}
        className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-soft)]"
      />
      <button type="submit" className="btn btn-accent px-6">
        {state === "done" ? "ثبت شد ✓" : "عضویت"}
      </button>
      <span className="sr-only">{subtitle}</span>
    </form>
  );
}
