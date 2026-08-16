import { createClient } from "@/lib/supabase/server";

export async function listOrganisationsForAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("organisations")
    .select("id, legal_name")
    .order("legal_name");

  return (data ?? []) as { id: number; legal_name: string }[];
}
