"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./ui";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("admin_access_token")) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return <>{children}</>;
}
