"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { userFacingError } from "@/lib/errors/user-message";
import { TERMS_VERSION } from "@/lib/terms/version";

export type TermsFormState = {
  error?: string;
  message?: string;
};

export async function acceptTermsAction(
  _prev: TermsFormState,
  formData: FormData,
): Promise<TermsFormState> {
  const user = await getUser();
  const supabase = await createClient();

  if (!user?.email || !supabase) {
    return { error: "You must be signed in." };
  }

  if (String(formData.get("agreed") ?? "") !== "on") {
    return { error: "Tick the box to confirm you have read and agree to the terms." };
  }

  if (String(formData.get("version") ?? "").trim() !== TERMS_VERSION) {
    return { error: "Refresh the page and agree to the current terms." };
  }

  const { error } = await supabase.rpc("accept_terms", {
    p_version: TERMS_VERSION,
  });

  if (error) {
    return { error: userFacingError(error) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  revalidatePath("/auctions");
  return { message: "You have agreed to the terms of service." };
}
