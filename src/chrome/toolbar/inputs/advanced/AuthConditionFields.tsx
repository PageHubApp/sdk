/**
 * Auth condition fields — login status, order history and membership rules.
 *
 * Membership rules are plain `auth` conditions on dot-paths into the host's
 * member auth (see docs/features/memberships.md "Condition keys"):
 *
 *   Any membership          customer.isMember equals true  (none: not-equals true)
 *   Has plan X              customer.plans.<slug> exists
 *   Doesn't have plan X     customer.plans.<slug> not-exists
 *   Member for N+ days      customer.planDays.<slug> greater-than N-1
 *
 * The plan list comes from the host's `registerMembershipPlansProvider`; with
 * none registered the plan field is a slug text input.
 */
import { useEffect, useState } from "react";
import { Chip } from "@/chrome/primitives/Chip";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import type { Condition, ConditionGroup } from "../../../../utils/conditions/types";
import {
  getMembershipPlansProvider,
  type MembershipPlanOption,
} from "../../../../utils/conditions/membershipPlansRegistry";
import { hasUnprovableAuthGate } from "../../../../utils/conditions/pruneAuthGated";

/** Field ids shown in the auth "field" dropdown. Membership ids are virtual:
 *  they map onto a key prefix + a fixed operator. */
type AuthField =
  | "status"
  | "customer.isMember"
  | "plan-has"
  | "plan-lacks"
  | "plan-days"
  | "customer.hasSubscription"
  | "customer.orderCount"
  | "customer.totalSpent";

const AUTH_FIELDS: { value: AuthField; label: string }[] = [
  { value: "status", label: "Sign-in status" },
  { value: "customer.isMember", label: "Any membership" },
  { value: "plan-has", label: "Has plan" },
  { value: "plan-lacks", label: "Doesn't have plan" },
  { value: "plan-days", label: "Member for at least N days" },
  { value: "customer.hasSubscription", label: "Has subscription" },
  { value: "customer.orderCount", label: "Order count" },
  { value: "customer.totalSpent", label: "Total spent" },
];

const PLANS_PREFIX = "customer.plans.";
const PLAN_DAYS_PREFIX = "customer.planDays.";

/** Membership fields own their operator, so the generic operator/value
 *  controls are hidden for them. */
export function isMembershipAuthCondition(cond: Condition): boolean {
  if (cond.type !== "auth") return false;
  return (
    cond.key === "customer.isMember" ||
    cond.key.startsWith(PLANS_PREFIX) ||
    cond.key.startsWith(PLAN_DAYS_PREFIX)
  );
}

function fieldOf(cond: Condition): AuthField {
  if (cond.key.startsWith(PLANS_PREFIX))
    return cond.operator === "not-exists" ? "plan-lacks" : "plan-has";
  if (cond.key.startsWith(PLAN_DAYS_PREFIX)) return "plan-days";
  return (AUTH_FIELDS.some(f => f.value === cond.key) ? cond.key : "status") as AuthField;
}

function slugOf(cond: Condition): string {
  if (cond.key.startsWith(PLANS_PREFIX)) return cond.key.slice(PLANS_PREFIX.length);
  if (cond.key.startsWith(PLAN_DAYS_PREFIX)) return cond.key.slice(PLAN_DAYS_PREFIX.length);
  return "";
}

/** `greater-than N-1` is stored; the editor shows N. */
function daysOf(cond: Condition): string {
  const n = Number(cond.value);
  return Number.isFinite(n) && cond.value !== "" ? String(n + 1) : "";
}

function patchForField(field: AuthField, slug: string): Partial<Condition> {
  switch (field) {
    case "status":
      return { key: "status", operator: "equals", value: "logged-in" };
    case "customer.isMember":
      return { key: "customer.isMember", operator: "equals", value: "true" };
    case "plan-has":
      return { key: PLANS_PREFIX + slug, operator: "exists", value: "" };
    case "plan-lacks":
      return { key: PLANS_PREFIX + slug, operator: "not-exists", value: "" };
    case "plan-days":
      return { key: PLAN_DAYS_PREFIX + slug, operator: "greater-than", value: "6" };
    case "customer.hasSubscription":
      return { key: field, operator: "equals", value: "true" };
    default:
      return { key: field, operator: "greater-than", value: "0" };
  }
}

/** One-line chip summary for membership rules; null for other auth keys. */
export function describeMembershipCondition(cond: Condition): string | null {
  if (!isMembershipAuthCondition(cond)) return null;
  const slug = slugOf(cond) || "…";
  switch (fieldOf(cond)) {
    case "customer.isMember":
      return cond.operator === "not-equals" ? "No membership" : "Any membership";
    case "plan-has":
      return `Has ${slug}`;
    case "plan-lacks":
      return `Doesn't have ${slug}`;
    case "plan-days":
      return `${slug} for ${daysOf(cond) || "N"}+ days`;
    default:
      return null;
  }
}

function useMembershipPlans(): MembershipPlanOption[] | null {
  const provider = getMembershipPlansProvider();
  const [plans, setPlans] = useState<MembershipPlanOption[] | null>(null);
  useEffect(() => {
    if (!provider) return;
    let live = true;
    provider()
      .then(list => live && setPlans(Array.isArray(list) ? list : []))
      .catch(() => live && setPlans([]));
    return () => {
      live = false;
    };
  }, [provider]);
  return provider ? (plans ?? []) : null;
}

function PlanPicker({ slug, onChange }: { slug: string; onChange: (slug: string) => void }) {
  const plans = useMembershipPlans();
  if (plans === null || (plans.length === 0 && slug)) {
    return (
      <Chip>
        <input
          type="text"
          value={slug}
          onChange={e => onChange(e.target.value.trim())}
          placeholder="plan slug (e.g. pro)"
          className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
        />
      </Chip>
    );
  }
  const known = plans.some(p => p.slug === slug);
  return (
    <ToolbarDropdown value={slug} onChange={(val: string) => onChange(val)} propKey="condAuthPlan">
      <option value="">{plans.length ? "Pick a plan…" : "No plans yet"}</option>
      {!known && slug && <option value={slug}>{slug}</option>}
      {plans.map(p => (
        <option key={p.slug} value={p.slug}>
          {p.name}
        </option>
      ))}
    </ToolbarDropdown>
  );
}

/** Field dropdown + membership controls. The caller still renders the
 *  generic operator/value controls when `isMembershipAuthCondition` is false. */
export function AuthConditionFields({
  cond,
  onChange,
}: {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
}) {
  const field = fieldOf(cond);
  const slug = slugOf(cond);
  return (
    <>
      <ToolbarDropdown
        value={field}
        onChange={(val: string) => onChange(patchForField(val as AuthField, slug))}
        propKey="condAuthField"
      >
        {AUTH_FIELDS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </ToolbarDropdown>

      {field === "customer.isMember" && (
        <ToolbarDropdown
          value={cond.operator === "not-equals" ? "none" : "any"}
          onChange={(val: string) =>
            onChange({ operator: val === "none" ? "not-equals" : "equals", value: "true" })
          }
          propKey="condAuthMember"
        >
          <option value="any">Has a membership</option>
          <option value="none">Has no membership</option>
        </ToolbarDropdown>
      )}

      {(field === "plan-has" || field === "plan-lacks" || field === "plan-days") && (
        <PlanPicker
          slug={slug}
          onChange={next =>
            onChange({ key: (field === "plan-days" ? PLAN_DAYS_PREFIX : PLANS_PREFIX) + next })
          }
        />
      )}

      {field === "plan-days" && (
        <Chip>
          <input
            type="number"
            min={1}
            value={daysOf(cond)}
            onChange={e => {
              const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
              onChange({ operator: "greater-than", value: String(n - 1) });
            }}
            placeholder="days"
            aria-label="Days since the member joined the plan"
            className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
          />
        </Chip>
      )}
    </>
  );
}

/**
 * Warns when an auth rule sits in an OR path with a rule only the browser
 * can check (URL, device, storage…). The server can't prove such a node is
 * hidden, so its content is sent to every visitor.
 */
export function UnprovableAuthGateWarning({ groups }: { groups: ConditionGroup[] | null | undefined }) {
  if (!hasUnprovableAuthGate(groups)) return null;
  return (
    <p className="text-warning text-[10px] leading-snug">
      This element&apos;s content is sent to every visitor, because a non-member rule here can
      show it on its own. To keep it members-only, set the rules to &ldquo;All match&rdquo;.
    </p>
  );
}
