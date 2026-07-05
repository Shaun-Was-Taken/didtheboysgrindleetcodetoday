/**
 * Re-exports the canonical tracked-company list from convex/companies.ts so
 * backend and frontend can never drift apart.
 */
export {
  TRACKED_COMPANIES,
  OWNER_EMAIL,
  PRIVATE_COMPANY_NAMES,
  isPrivateCompany,
} from "../../convex/companies";

export function companyLogoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
