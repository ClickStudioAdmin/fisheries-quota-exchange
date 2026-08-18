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

const sea = "#1a6fb5";
const ink = "#1a2433";
const muted = "#5b6573";
const paper = "#f4f6f8";

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
          <Preview>{`Simulated tax invoices for FQX order ${orderId}`}</Preview>
          <Body style={{ backgroundColor: paper, color: ink, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <Container style={{ padding: "32px 16px", maxWidth: "520px" }}>
          <Heading style={{ fontSize: "22px", fontWeight: 600, color: ink }}>
            Fisheries Quota Exchange
          </Heading>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: ink }}>
            Simulated settlement is complete for order {orderId} ({offeringLabel}
            {" "}for {buyerName}). Dummy tax invoices are attached: one for the
            quota and one for the platform fee.
          </Text>
          <Text style={{ fontSize: "16px", lineHeight: "24px", color: muted }}>
            Quota total {amount}. These are not real tax invoices and no payment
            has been taken.
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
