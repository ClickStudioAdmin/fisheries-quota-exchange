import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Auctions",
};

export default function AuctionsPage() {
  return (
    <PageIntro title="Auctions">
      <p>
        Auctions will appear here in a later phase. This page is a placeholder.
      </p>
    </PageIntro>
  );
}
