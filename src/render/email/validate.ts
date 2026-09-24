/**
 * validateEmailTree — reject what the email renderer can't emit.
 *
 * Used by `renderEmailHTML` (errors throw), a host's save endpoint (errors →
 * 400 with the list) and a host editor page (issues listed; clicking one
 * selects `nodeId`). Editor-side module: no server dependencies.
 */

import { migrateActions } from "../../utils/action";
import type { SerializedNodes } from "../static/types";
import { resolveType } from "../shared/resolveType";
import {
  EMAIL_COMPONENTS,
  EMAIL_RESPONSIVE_PREFIX_RE,
  EMAIL_UNSAFE,
  isEmailClassAllowed,
  isEmailLayoutToken,
  nodeClassTokens,
  readEmailLayout,
  stripEmailPrefix,
} from "./profile";

export interface EmailIssue {
  nodeId: string;
  severity: "error" | "warning";
  code: "component" | "unsafe-class" | "dropped-class" | "action" | "icon" | "nesting";
  message: string;
}

/** Column Containers deeper than this may break in Outlook. */
const MAX_COLUMN_NESTING = 2;

/** Responsive tokens the renderer honors: display toggles and layout (desktop value). */
function isHonoredResponsive(token: string): boolean {
  const base = stripEmailPrefix(token);
  return base === "hidden" || base === "block" || isEmailLayoutToken(token);
}

function checkClasses(nodeId: string, props: Record<string, any>, issues: EmailIssue[]): void {
  for (const token of nodeClassTokens(props)) {
    if (EMAIL_UNSAFE.test(token)) {
      issues.push({
        nodeId,
        severity: "error",
        code: "unsafe-class",
        message: `“${token}” doesn't show in most email apps. Remove it.`,
      });
      continue;
    }
    const prefixed = EMAIL_RESPONSIVE_PREFIX_RE.test(token);
    if (!isEmailClassAllowed(token) || (prefixed && !isHonoredResponsive(token))) {
      issues.push({
        nodeId,
        severity: "warning",
        code: "dropped-class",
        message: `“${token}” is ignored in emails.`,
      });
    }
  }
}

function checkNode(
  nodeId: string,
  type: string,
  props: Record<string, any>,
  allowed: ReadonlySet<string>,
  issues: EmailIssue[]
): void {
  if (!allowed.has(type)) {
    issues.push({
      nodeId,
      severity: "error",
      code: "component",
      message: "This element can't be sent in an email. Remove it.",
    });
  }
  checkClasses(nodeId, props, issues);
  if (type === "Button" || type === "Container") {
    if (migrateActions(props).some(a => a?.type !== "link")) {
      issues.push({
        nodeId,
        severity: "error",
        code: "action",
        message: "Buttons in emails can only open a link.",
      });
    }
  }
  if (type === "Button" && props.icon && (typeof props.icon === "string" || props.icon.value)) {
    issues.push({
      nodeId,
      severity: "warning",
      code: "icon",
      message: "Icons are left out of emails.",
    });
  }
}

/** Depth-first from ROOT, flagging column Containers nested past the limit. */
function checkNesting(nodes: SerializedNodes, issues: EmailIssue[]): void {
  const visit = (id: string, depth: number, seen: Set<string>): void => {
    const node = nodes[id];
    if (!node || seen.has(id)) return;
    seen.add(id);
    const childIds = [...(node.nodes || []), ...Object.values(node.linkedNodes || {})];
    let next = depth;
    if (id !== "ROOT" && resolveType(node) === "Container") {
      const { columns } = readEmailLayout(nodeClassTokens(node.props), childIds.length);
      if (columns > 1) {
        next = depth + 1;
        if (next > MAX_COLUMN_NESTING) {
          issues.push({
            nodeId: id,
            severity: "warning",
            code: "nesting",
            message: "Columns nested this deep may break in Outlook.",
          });
        }
      }
    }
    for (const child of childIds) visit(child, next, seen);
  };
  visit("ROOT", 0, new Set());
}

export function validateEmailTree(
  nodes: SerializedNodes,
  opts?: { extraComponents?: string[] }
): EmailIssue[] {
  const allowed = new Set<string>([...EMAIL_COMPONENTS, ...(opts?.extraComponents ?? [])]);
  const issues: EmailIssue[] = [];
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (nodeId === "ROOT" || !node) continue;
    checkNode(nodeId, resolveType(node), node.props || {}, allowed, issues);
  }
  checkNesting(nodes, issues);
  return issues;
}
