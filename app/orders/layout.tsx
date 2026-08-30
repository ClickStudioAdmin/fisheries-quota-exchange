import { MemberArea } from "@/components/member-area";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberArea>{children}</MemberArea>;
}
