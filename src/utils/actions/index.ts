/**
 * @pagehub/sdk — Action runtime barrel
 *
 * The action runtime drives `props.action[]` chains for every interactive
 * node (Button, Link, Container, Text, Image, FormElement). The barrel is
 * the public API; per-type handlers + dispatcher are internal.
 */
export { addActionHandlers, type ActionContext } from "./dispatcher";
export { addCustomHandlers } from "./customHandlers";
export { actionGatePasses, applyStateStep } from "./gates";
export { fireLoadAction, getLoadActionScript, PH_LOAD_ACTION_SCRIPT } from "./load";
export { fireIntervalActions } from "./interval";
