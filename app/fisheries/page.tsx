import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Fisheries",
};

export default function FisheriesPage() {
  return (
    <PageIntro title="Fisheries">
      <p>
        Fishery and quota reference data will appear here in a later phase. This
        page is a placeholder.
      </p>
    </PageIntro>
  );
}
