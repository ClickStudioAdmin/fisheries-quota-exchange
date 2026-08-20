import { revalidatePath } from "next/cache";

export function revalidateOrderSurfaces(orderId?: number) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  if (orderId != null && Number.isInteger(orderId) && orderId > 0) {
    revalidatePath(`/orders/${orderId}`);
  }
}
