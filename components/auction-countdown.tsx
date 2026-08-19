"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

export function AuctionCountdown({ at }: { at: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const target = Date.parse(at);
  if (Number.isNaN(target)) {
    return at;
  }

  return (
    <span suppressHydrationWarning>
      {formatCountdown(target - (now ?? Date.now()))}
    </span>
  );
}
