import { MemberArea } from "@/components/member-area";

export default function OrganisationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MemberArea>{children}</MemberArea>;
}
