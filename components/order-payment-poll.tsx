"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5000;

export function OrderPaymentPoll() {
  const router = useRouter();

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const id = window.setInterval(tick, INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  return null;
}
