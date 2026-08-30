import type { User } from "@supabase/supabase-js";

export function displayName(user: User) {
  const named = userFullName(user);

  if (named) {
    return named;
  }

  const email = user.email ?? "";
  const local = email.split("@")[0];

  return local || email || "Member";
}

export function userFullName(user: User) {
  const metadata = user.user_metadata ?? {};
  const named =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof metadata.display_name === "string" && metadata.display_name.trim());

  return named || "";
}

export function userPhone(user: User) {
  const metadata = user.user_metadata ?? {};
  return typeof metadata.phone === "string" ? metadata.phone.trim() : "";
}
