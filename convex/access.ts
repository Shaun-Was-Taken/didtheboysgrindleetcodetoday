import { QueryCtx } from "./_generated/server";
import { OWNER_EMAIL } from "./companies";

/**
 * Whether the request comes from the site owner. Resolved via the users table
 * (not JWT claims) so it works regardless of the Clerk token template.
 */
export async function isOwner(ctx: QueryCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return user?.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}
