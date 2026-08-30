"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

export function AuctionCountdown({ at }: { at: string }) {
  const target = Date.parse(at);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) {
      return;
    }

    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) {
    return at;
  }

  if (remaining == null) {
    return "\u00a0";
  }

  return formatCountdown(remaining);
}
