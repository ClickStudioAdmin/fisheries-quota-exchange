import { redirect } from "next/navigation";

export default function SpeciesRedirectPage() {
  redirect("/admin/reference/fisheries");
}
