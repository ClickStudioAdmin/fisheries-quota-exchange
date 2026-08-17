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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Platform settings
        </h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          These rules apply immediately. Fees are recorded on simulated orders.
          There is no live payment.
        </p>
      </div>
      <PlatformSettingsForm settings={settings} />
    </div>
  );
}
