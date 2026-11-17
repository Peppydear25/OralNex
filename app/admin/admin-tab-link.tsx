"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { AdminTab } from "./dashboard/types";

export function adminTabHref(tab: AdminTab) {
  return tab === "overview" ? "/admin" : `/admin?tab=${tab}`;
}

export function openAdminTab(tab: AdminTab) {
  const href = adminTabHref(tab);
  if (`${window.location.pathname}${window.location.search}` !== href) {
    window.history.pushState(null, "", href);
  }
}

export function AdminTabLink({
  tab,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { tab: AdminTab }) {
  return (
    <Link
      {...props}
      href={adminTabHref(tab)}
      prefetch={false}
      onNavigate={(event) => {
        event.preventDefault();
        openAdminTab(tab);
      }}
    />
  );
}
