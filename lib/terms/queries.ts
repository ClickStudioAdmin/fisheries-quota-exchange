import "server-only";

import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";
import { TERMS_REQUIRED_MESSAGE, TERMS_VERSION } from "@/lib/terms/version";

export const hasAcceptedCurrentTerms = cache(async () => {
  const user = await getUser();
  const supabase = await createClient();
  const email = user?.email?.trim().toLowerCase() ?? "";

  if (!supabase || !email.includes("@")) {
    return false;
  }

  const { data, error } = await supabase
    .from("terms_acceptances")
    .select("id")
    .eq("email", email)
    .eq("terms_version", TERMS_VERSION)
    .maybeSingle();

  if (error) {
    console.error("hasAcceptedCurrentTerms failed", error.message);
    return false;
  }

  return Boolean(data);
});

export async function requireTermsError() {
  if (await hasAcceptedCurrentTerms()) {
    return null;
  }

  return TERMS_REQUIRED_MESSAGE;
}
