import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <PageIntro title="About">
      <p>
        Fisheries Quota Exchange (FQX) is being built for Australian
        Commonwealth, State and Territory fisheries.
      </p>
      <p>
        Quota units, rules, authorities and transfer processes differ between
        fisheries. FQX will not assume they are the same.
      </p>
      <p>This site is a development environment, not a live market.</p>
    </PageIntro>
  );
}
