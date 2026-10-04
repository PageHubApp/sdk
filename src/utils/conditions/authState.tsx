/**
 * Render-time auth for `auth` conditions.
 *
 * The host knows the visitor's auth per request (e.g. from an HttpOnly cookie
 * in getServerSideProps) and passes it to `<PagehubRoot auth>`, which provides
 * it here. `useAuthState` returns that value on the server AND while the client
 * hydrates (React reads `getServerSnapshot` for every hydrating boundary,
 * including lazy Suspense boundaries that hydrate after the host's layout
 * effects ran), so server HTML and the first client render always agree. After
 * hydration it follows the live `setAuthState` store and re-renders on change.
 *
 * `null` means "unknown" (ISR routes with no request, or a host that passes
 * nothing): `auth` conditions stay indeterminate on both sides.
 */
import React, { createContext, useContext, useSyncExternalStore } from "react";
import { getAuthState, subscribeAuthState, type AuthState } from "../design/variables";

const AuthStateContext = createContext<AuthState | null>(null);

export function AuthStateProvider({
  value,
  children,
}: {
  value: AuthState | null | undefined;
  children: React.ReactNode;
}) {
  return <AuthStateContext.Provider value={value ?? null}>{children}</AuthStateContext.Provider>;
}

const noopSubscribe = () => () => {};

/**
 * Auth for condition evaluation during render. Pass `active = false` from a
 * node with no `auth` condition: it then returns a stable `null` and never
 * subscribes, so auth changes don't re-render it.
 */
export function useAuthState(active = true): AuthState | null {
  const requestAuth = useContext(AuthStateContext);
  return useSyncExternalStore(
    active ? subscribeAuthState : noopSubscribe,
    () => (active ? (getAuthState() ?? requestAuth) : null),
    () => (active ? requestAuth : null)
  );
}
