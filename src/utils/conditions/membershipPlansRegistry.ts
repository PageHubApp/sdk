/**
 * Membership plans provider registry.
 *
 * The condition editor's "Has plan" / "Doesn't have plan" / "Member for at
 * least N days" rules need the site's plan list, but plans are host-app data
 * (the SDK has no idea where they're stored). Hosts register a provider on
 * boot; with none registered the editor falls back to a plain slug input.
 *
 * Mirrors `registerMediaUploadAccept` in `utils/media/registry.ts`.
 */

export interface MembershipPlanOption {
  /** The id auth conditions reference: `customer.plans.<slug>`. */
  slug: string;
  name: string;
}

export type MembershipPlansProvider = () => Promise<MembershipPlanOption[]>;

let _provider: MembershipPlansProvider | null = null;

export function registerMembershipPlansProvider(fn: MembershipPlansProvider | null): void {
  _provider = fn;
}

export function getMembershipPlansProvider(): MembershipPlansProvider | null {
  return _provider;
}
