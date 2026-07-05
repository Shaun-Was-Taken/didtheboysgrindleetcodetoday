"use client";

import { useUser } from "@clerk/nextjs";
import { OWNER_EMAIL } from "@/lib/companies";

/** True when the signed-in Clerk user is the site owner. */
export function useIsOwner(): boolean {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  return email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
}
