import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const FISHERY_LOGO_BUCKET = "fishery-logos";
export const FISHERY_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LOGO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function fisheryLogoUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  return `${env.url.replace(/\/$/, "")}/storage/v1/object/public/${FISHERY_LOGO_BUCKET}/${path}`;
}

export function fisheryLogoExtension(type: string) {
  return LOGO_EXTENSIONS[type] ?? null;
}

export function validateFisheryLogo(file: File) {
  if (!fisheryLogoExtension(file.type)) {
    return "Use a JPEG, PNG, WebP, or GIF image.";
  }

  if (file.size > FISHERY_LOGO_MAX_BYTES) {
    return "Image must be 2 MB or smaller.";
  }

  return null;
}

export function readLogoFile(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}
