"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FisheryLogo } from "@/components/fishery-logo";
import type { Fishery } from "@/lib/fisheries/types";

export type HomeHeroSlide = {
  fishery: Pick<Fishery, "id" | "name" | "logo_path">;
  jurisdiction: string;
  lastSale: string;
  openLabel: string;
};

export function HomeHeroSlider({ slides }: { slides: HomeHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index];

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (media.matches || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!current) {
    return (
      <div className="min-h-72 border border-line bg-paper-raised">
        <div className="h-1 bg-sea" />
        <div className="flex min-h-72 items-center p-8">
          <p className="text-sm text-ink-muted">
            Fisheries will appear here as they are added.
          </p>
        </div>
      </div>
    );
  }

  function goTo(next: number) {
    setIndex((next + slides.length) % slides.length);
  }

  return (
    <div
      className="border border-line bg-paper-raised"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        setPaused(false);
      }}
    >
      <div className="h-1 bg-sea" />
      <div
        className="flex min-h-80 flex-col p-6 sm:min-h-[22rem] sm:p-8"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured fisheries"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-sea">
            Featured fishery
          </p>
          {slides.length > 1 ? (
            <p className="text-xs tabular-nums text-ink-muted">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(slides.length).padStart(2, "0")}
            </p>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {current.fishery.name}
        </p>
        <div className="mt-8 flex min-w-0 flex-1 items-start gap-5">
          <FisheryLogo fishery={current.fishery} size="lg" />
          <div className="min-w-0 pt-0.5">
            <p className="text-sm text-ink-muted">{current.jurisdiction}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              <Link
                href={`/fisheries/${current.fishery.id}`}
                className="hover:text-sea"
              >
                {current.fishery.name}
              </Link>
            </h2>
          </div>
        </div>
        <dl className="mt-8 grid grid-cols-2 border-t border-line">
          <div className="pr-6 pt-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Last sale
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-ink">
              {current.lastSale}
            </dd>
          </div>
          <div className="border-l border-line pl-6 pt-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              Open now
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-ink">
              {current.openLabel}
            </dd>
          </div>
        </dl>
        {slides.length > 1 ? (
          <div className="mt-8 flex gap-2" aria-label="Fishery slides">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.fishery.id}
                type="button"
                aria-current={slideIndex === index ? "true" : undefined}
                aria-label={slide.fishery.name}
                className={
                  slideIndex === index
                    ? "h-1 w-8 bg-sea"
                    : "h-1 w-8 bg-line hover:bg-sea"
                }
                onClick={() => goTo(slideIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
