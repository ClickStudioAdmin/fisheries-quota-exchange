import { AdminCreateForm } from "@/components/admin-create-form";
import type { AdminFormState } from "@/lib/fisheries/actions";
import type { Fishery, Jurisdiction } from "@/lib/fisheries/types";

const logoAccept = "image/jpeg,image/png,image/webp,image/gif";

export function FisheryAdminForm({
  action,
  submitLabel,
  jurisdictions,
  fishery,
}: {
  action: (
    prev: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>;
  submitLabel: string;
  jurisdictions: Pick<Jurisdiction, "id" | "name">[];
  fishery?: Pick<
    Fishery,
    | "id"
    | "name"
    | "code"
    | "jurisdiction_id"
    | "quantity_type"
    | "sale_allowed"
    | "lease_allowed"
  >;
}) {
  return (
    <AdminCreateForm
      action={action}
      hidden={fishery ? { fishery_id: fishery.id } : undefined}
      submitLabel={submitLabel}
      fields={[
        {
          name: "jurisdiction_id",
          label: "Jurisdiction",
          type: "select",
          required: true,
          defaultValue: fishery ? String(fishery.jurisdiction_id) : undefined,
          options: jurisdictions.map((item) => ({
            value: String(item.id),
            label: item.name,
          })),
        },
        {
          name: "name",
          label: "Name",
          required: true,
          defaultValue: fishery?.name,
        },
        {
          name: "code",
          label: "Code",
          defaultValue: fishery?.code ?? "",
        },
        {
          name: "quantity_type",
          label: "Quantity type",
          type: "select",
          required: true,
          defaultValue: fishery?.quantity_type,
          options: [
            { value: "KG", label: "Kg" },
            { value: "UNITS", label: "Units" },
          ],
        },
        {
          name: "sale_allowed",
          label: "Can be listed for sale",
          type: "checkbox",
          defaultChecked: fishery?.sale_allowed ?? true,
        },
        {
          name: "lease_allowed",
          label: "Can be listed for lease",
          type: "checkbox",
          defaultChecked: fishery?.lease_allowed ?? true,
        },
        {
          name: "logo",
          label: "Logo (optional)",
          type: "file",
          accept: logoAccept,
        },
      ]}
    />
  );
}
