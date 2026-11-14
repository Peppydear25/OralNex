import "server-only";

import { createAdminClient } from "./admin";

export type ContactRequestInput = {
  userId?: string | null;
  name: string;
  email: string;
  topic: string;
  orderNumber?: string | null;
  message: string;
};

export async function createContactRequest(input: ContactRequestInput) {
  const { data, error } = await createAdminClient()
    .from("contact_requests")
    .insert({
      user_id: input.userId ?? null,
      name: input.name,
      email: input.email,
      topic: input.topic,
      order_number: input.orderNumber ?? null,
      message: input.message,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
