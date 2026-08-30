import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Contact us",
};

export default function ContactPage() {
  return (
    <PageIntro title="Contact us" width="article">
      <p>
        FQX is in development. There is no live support desk on this site yet.
      </p>
      <p>
        If you are taking part in testing, contact the person who invited you.
        Product and engineering queries can go to the Click Studio team running
        this environment.
      </p>
    </PageIntro>
  );
}
