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

const sea = "#1a5c63";
const ink = "#10232b";
const muted = "#3d4f56";
const paper = "#f5f2ea";

export function OrderSettledEmail({
  orderId,
  buyerName,
  offeringLabel,
  amount,
  orderUrl,
}: EmailTemplates["order_settled"]) {
  return (
    <Html>
      <Head />
      <Preview>{`Simulated tax invoice for FQX order ${orderId}`}</Preview>
      <Body style={{ backgroundColor: paper, color: ink, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <Container style={{ padding: "32px 16px", maxWidth: "520px" }}>
          <Heading style={{ fontSize: "22px", fontWeight: 600, color: ink }}>
            Fisheries Quota Exchange
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: ink }}>
            Simulated settlement is complete for order {orderId} ({offeringLabel}
            {" "}for {buyerName}). A dummy tax invoice is attached.
          </Text>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: muted }}>
            Total {amount}. This is not a real tax invoice and no payment has
            been taken.
          </Text>
          {orderUrl ? (
            <Section style={{ marginTop: "24px" }}>
              <Button
                href={orderUrl}
                style={{
                  backgroundColor: sea,
                  color: paper,
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                View order
              </Button>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
