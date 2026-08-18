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

function WaveGraphic() {
  return (
    <svg
      viewBox="0 0 480 360"
      className="absolute inset-0 h-full w-full text-sea"
      aria-hidden="true"
    >
      <path
        d="M0 220c48-18 96-18 144 0s96 18 144 0 96-18 144 0 48 18 48 18v122H0z"
        fill="currentColor"
        opacity="0.06"
      />
      <path
        d="M0 248c48-16 96-16 144 0s96 16 144 0 96-16 144 0 48 16 48 16v94H0z"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M24 168c56-12 112 8 160 42 42 30 88 44 140 38 44-5 88-24 132-18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.18"
      />
      <path
        d="M40 128c48-20 108-8 152 24 40 28 92 36 140 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <path
        d="M72 86c28-6 54 8 72 28 14 16 22 22 18 42-22-8-40-22-52-40-8 18-10 32-4 48-28-14-46-32-50-56 10 2 20 2 16-22z"
        fill="currentColor"
        opacity="0.12"
      />
    </svg>
  );
}

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
      <div className="relative min-h-72 overflow-hidden border border-line bg-paper-raised">
        <WaveGraphic />
        <div className="relative flex h-full min-h-72 items-end p-6">
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
      className="relative overflow-hidden border border-line bg-paper-raised"
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
      <WaveGraphic />
      <div
        className="relative flex min-h-80 flex-col justify-between gap-8 p-6 sm:min-h-96 sm:p-8"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured fisheries"
      >
        <p className="sr-only" aria-live="polite">
          {current.fishery.name}
        </p>
        <FisheryLogo fishery={current.fishery} size="xl" />
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-sea">
            {current.jurisdiction}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            <Link
              href={`/fisheries/${current.fishery.id}`}
              className="hover:text-sea"
            >
              {current.fishery.name}
            </Link>
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                Last sale
              </dt>
              <dd className="mt-1 text-sm text-ink">{current.lastSale}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                Open now
              </dt>
              <dd className="mt-1 text-sm text-ink">{current.openLabel}</dd>
            </div>
          </dl>
        </div>
        {slides.length > 1 ? (
          <div className="flex gap-2" aria-label="Fishery slides">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.fishery.id}
                type="button"
                aria-current={slideIndex === index ? "true" : undefined}
                aria-label={slide.fishery.name}
                className={
                  slideIndex === index
                    ? "h-1.5 w-6 bg-sea"
                    : "h-1.5 w-6 bg-line hover:bg-sea"
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
