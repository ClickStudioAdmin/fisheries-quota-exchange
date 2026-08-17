"use client";

import { useMemo, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { useRouter } from "next/navigation";

type PaymentsConnectProps = {
  organisationId: number;
  publishableKey: string;
  detailsSubmitted: boolean;
};

export function PaymentsConnect({
  organisationId,
  publishableKey,
  detailsSubmitted,
}: PaymentsConnectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const stripeConnect = useMemo(() => {
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: async () => {
        const response = await fetch("/api/stripe/account-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organisationId }),
        });
        const payload = (await response.json()) as {
          clientSecret?: string;
          error?: string;
        };

        if (!response.ok || !payload.clientSecret) {
          setError(payload.error ?? "Could not start Stripe onboarding.");
          throw new Error(payload.error ?? "Account session failed.");
        }

        return payload.clientSecret;
      },
    });
  }, [organisationId, publishableKey]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <ConnectComponentsProvider connectInstance={stripeConnect}>
        {detailsSubmitted ? (
          <ConnectAccountManagement />
        ) : (
          <ConnectAccountOnboarding onExit={() => router.refresh()} />
        )}
      </ConnectComponentsProvider>
    </div>
  );
}
