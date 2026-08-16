import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default function MarketplacePage() {
  return (
    <PageIntro title="Marketplace">
      <p>
        Quota listings will appear here in a later phase. This page is a
        placeholder.
      </p>
    </PageIntro>
  );
}
