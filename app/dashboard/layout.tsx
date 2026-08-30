import { MemberArea } from "@/components/member-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberArea>{children}</MemberArea>;
}
