/**
 * SDK stubs for Next.js modules
 * Replaces: next/link, next/image, next/router, next-auth/react
 */
import React from "react";

// next/link → plain <a>
export const Link = React.forwardRef(({ href, children, ...props }: any, ref: any) =>
  React.createElement("a", { href, ref, ...props }, children)
);
Link.displayName = "Link";
export default Link;

// next/image → plain <img>
export const Image = React.forwardRef(({ src, alt, width, height, ...props }: any, ref: any) =>
  React.createElement("img", { src, alt, width, height, ref, ...props })
);
Image.displayName = "Image";

// next/router
export const useRouter = () => ({
  push: (url: string) => { if (typeof window !== "undefined") window.location.href = url; },
  replace: (url: string) => { if (typeof window !== "undefined") window.location.replace(url); },
  back: () => { if (typeof window !== "undefined") window.history.back(); },
  asPath: typeof window !== "undefined" ? window.location.pathname : "/",
  pathname: typeof window !== "undefined" ? window.location.pathname : "/",
  query: {},
  isReady: true,
  events: { on: () => {}, off: () => {}, emit: () => {} },
});
// eslint-disable-next-line react-hooks/rules-of-hooks -- module-level stub, not a real hook call
export const router = useRouter();

// next-auth/react
export const useSession = () => ({ data: null, status: "unauthenticated" });
export const signIn = () => {};
export const signOut = () => {};
