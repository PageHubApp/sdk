import { createInViewTracker, pickInViewWinner } from "../../../utils/state/inViewTracker";

/**
 * Static-export side of `inViewState` (spec: docs/sdk/in-view-state.md).
 *
 * An optional runtime extension, like `getSiteChatScript`: renderToHTML emits
 * it only when the tree uses the prop, and bootstrap.ts runs it with the
 * runtime's `__phRT` before Alpine walks the DOM (or at once, if the runtime
 * booted first). The tracker and the winner rule are the SAME functions the
 * React viewer calls — inlined here by source, which is why both are written
 * self-contained in `utils/state/inViewTracker.ts`.
 */
export function getInViewStateScript(): string {
  const body =
    // esbuild with keepNames (tsx, some Vite setups) wraps nested functions in
    // `__name(fn, "name")`; the helper lives in the bundle, not in this
    // inlined source, so give it an identity stand-in.
    `var __name=function(f){return f;};` +
    `var pick=${pickInViewWinner.toString()};` +
    `var create=${createInViewTracker.toString()};` +
    `var t=create(pick,function(k,v){__phRT.setState(k,{kind:"value",value:v,source:"runtime"},"in-view");});` +
    `var els=document.querySelectorAll("[data-in-view-state]");` +
    `for(var i=0;i<els.length;i++){var c=null;try{c=JSON.parse(els[i].getAttribute("data-in-view-state"));}catch(e){}` +
    `if(c&&c.key&&c.value!=null&&c.value!=="")t.add(els[i],String(c.key),String(c.value));}`;
  return `<script>(window.__PH_RT_EXT__=window.__PH_RT_EXT__||[]).push(function(__phRT){${body.replace(/<\/script/gi, "<\\/script")}});</script>`;
}
