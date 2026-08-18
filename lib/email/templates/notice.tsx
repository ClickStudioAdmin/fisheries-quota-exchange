import type { ReactNode } from "react";
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

const sea = "#1a5c63";
const ink = "#10232b";
const muted = "#3d4f56";
const paper = "#f5f2ea";

export function NoticeEmail({
  preview,
  heading,
  paragraphs,
  actionLabel,
  actionUrl,
}: {
  preview: string;
  heading: string;
  paragraphs: string[];
  actionLabel?: string;
  actionUrl?: string;
  children?: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: paper,
          color: ink,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <Container style={{ padding: "32px 16px", maxWidth: "520px" }}>
          <Heading style={{ fontSize: "22px", fontWeight: 600, color: ink }}>
            Fisheries Quota Exchange
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: ink }}>
            {heading}
          </Text>
          {paragraphs.map((paragraph, index) => (
            <Text
              key={`${index}-${paragraph.slice(0, 24)}`}
              style={{ fontSize: "16px", lineHeight: "24px", color: muted }}
            >
              {paragraph}
            </Text>
          ))}
          {actionUrl && actionLabel ? (
            <Section style={{ marginTop: "24px" }}>
              <Button
                href={actionUrl}
                style={{
                  backgroundColor: sea,
                  color: paper,
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {actionLabel}
              </Button>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
