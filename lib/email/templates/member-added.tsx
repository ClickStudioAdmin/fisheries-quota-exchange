import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplates } from "@/lib/email/types";

const sea = "#0d5ea8";
const ink = "#121820";
const muted = "#44505c";
const paper = "#e8edf2";

export function MemberAddedEmail({
  accountName,
  role,
  registerUrl,
  loginUrl,
}: EmailTemplates["member_added"]) {
  return (
    <Html>
      <Head />
      <Preview>You have been added to {accountName} on FQX</Preview>
      <Body style={{ backgroundColor: paper, color: ink, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <Container style={{ padding: "32px 16px", maxWidth: "520px" }}>
          <Heading style={{ fontSize: "22px", fontWeight: 600, color: ink }}>
            Fisheries Quota Exchange
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: ink }}>
            You have been added to <strong>{accountName}</strong> as {role}.
          </Text>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: muted }}>
            If you already have an FQX account, log in with this email. If not,
            register with the same email address so the membership matches.
          </Text>
          <Section style={{ marginTop: "24px" }}>
            <Button
              href={loginUrl}
              style={{
                backgroundColor: sea,
                color: paper,
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Log in
            </Button>
          </Section>
          <Text style={{ fontSize: "14px", lineHeight: "22px", color: muted }}>
            New to FQX?{" "}
            <a href={registerUrl} style={{ color: sea }}>
              Create an account
            </a>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
