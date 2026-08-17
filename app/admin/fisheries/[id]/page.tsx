import { redirect } from "next/navigation";

export default async function FisheryRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/reference/fisheries/${id}`);
}
