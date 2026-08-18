import { redirect } from "next/navigation";
import { PlatformSettingsForm } from "@/components/platform-settings-form";
import { isPlatformAdmin } from "@/lib/admin/access";
import { getPlatformSettings } from "@/lib/settings/queries";

export const metadata = {
  title: "Platform settings",
};

export default async function AdminSettingsPage() {
  if (!(await isPlatformAdmin())) {
    redirect("/admin");
  }

  const settings = await getPlatformSettings();

  return <PlatformSettingsForm settings={settings} />;
}
