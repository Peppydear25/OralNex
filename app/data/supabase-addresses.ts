import { createClient } from "../../lib/supabase/client";
import { ADDRESS_LIMIT_MESSAGE, MAX_SAVED_ADDRESSES, isAddressLimitError } from "./address-limit";
import type { ShippingAddress } from "./buyer-account-store";

type AddressRow = {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  company: string | null;
  line_1: string;
  line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

const addressColumns =
  "id,label,first_name,last_name,company,line_1,line_2,city,state,postal_code,is_default";

function fromRow(row: AddressRow): ShippingAddress {
  return {
    id: row.id,
    label: row.label,
    firstName: row.first_name,
    lastName: row.last_name,
    company: row.company || undefined,
    address1: row.line_1,
    address2: row.line_2 || undefined,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: row.is_default,
  };
}

export async function loadShippingAddresses(userId: string) {
  const { data, error } = await createClient()
    .from("addresses")
    .select(addressColumns)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  return { addresses: error ? [] : ((data ?? []) as AddressRow[]).map(fromRow), error };
}
export async function saveShippingAddress(address: ShippingAddress) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    return { address: null, error: userError ?? new Error("No user") };
  const isNew = address.id.startsWith("address-");
  if (isNew) {
    const { count, error } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id);
    if (error) return { address: null, error };
    if ((count ?? 0) >= MAX_SAVED_ADDRESSES)
      return { address: null, error: new Error(ADDRESS_LIMIT_MESSAGE) };
  }
  const values = {
    user_id: userData.user.id,
    label: address.label,
    first_name: address.firstName,
    last_name: address.lastName,
    recipient_name: `${address.firstName} ${address.lastName}`.trim(),
    company: address.company || null,
    line_1: address.address1,
    line_2: address.address2 || null,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country_code: "US",
    is_default: false,
  };
  const query = isNew
    ? supabase.from("addresses").insert(values)
    : supabase.from("addresses").update(values).eq("id", address.id);
  const { data, error } = await query.select(addressColumns).single();
  if (error || !data)
    return {
      address: null,
      error: isAddressLimitError(error) ? new Error(ADDRESS_LIMIT_MESSAGE) : error,
    };
  if (address.isDefault) {
    const { error: defaultError } = await supabase.rpc("set_default_address", {
      target_address_id: data.id,
    });
    if (defaultError) return { address: null, error: defaultError };
  }
  return {
    address: fromRow({ ...(data as AddressRow), is_default: address.isDefault }),
    error: null,
  };
}
export async function removeShippingAddress(id: string) {
  return createClient().from("addresses").delete().eq("id", id);
}
export async function setDefaultShippingAddress(id: string) {
  return createClient().rpc("set_default_address", { target_address_id: id });
}
