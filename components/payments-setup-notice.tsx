import { StripeLogo } from "@/components/stripe-logo";
import { ActionNotice } from "@/components/surface";

export function PaymentsSetupNotice({
  href,
  children = "Complete payments setup on the Payments tab of Account details before you can list quota for sale or lease.",
}: {
  href: string;
  children?: string;
}) {
  return (
    <ActionNotice
      title="Set up payments"
      href={href}
      actionLabel="Go to Account details"
      icon={<StripeLogo className="h-6 w-auto" linked={false} />}
    >
      {children}
    </ActionNotice>
  );
}
