import { fisheryLogoUrl } from "@/lib/fisheries/logo";
import type { Fishery } from "@/lib/fisheries/types";

const sizeClassName = {
  sm: "h-12 w-12 text-base",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
};

type FisheryLogoProps = {
  fishery: Pick<Fishery, "name" | "logo_path">;
  size?: keyof typeof sizeClassName;
};

export function FisheryLogo({ fishery, size = "md" }: FisheryLogoProps) {
  const url = fisheryLogoUrl(fishery.logo_path);
  const frame = `shrink-0 overflow-hidden border border-line bg-paper ${sizeClassName[size]}`;

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center font-semibold text-ink-muted ${frame}`}
        aria-hidden="true"
      >
        {fishery.name.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`object-contain ${frame} bg-paper`}
    />
  );
}
