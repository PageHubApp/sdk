import { attachScrollAnimObserver } from "../../../utils/animations/scrollAnimAttach";

/**
 * IntersectionObserver runtime inlined into static HTML.
 *
 * Mirrors the `attachScrollAnimObserver(document.body, "per-element")`
 * behavior used by React runtimes — kept as a self-contained IIFE because
 * static export has no module resolution. If the algorithm changes, update
 * BOTH this script and `attachScrollAnimObserver` to match.
 */
export const PH_SCROLL_OBSERVER_SCRIPT = `<script>
(function(){
  if(!('IntersectionObserver' in window))return;
  var o=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('ph-in-view');
        o.unobserve(e.target);
      }
    });
  },{threshold:0.1});
  document.querySelectorAll('.ph-anim-scroll').forEach(function(el){o.observe(el);});
})();
</script>`;

// Re-export for runtime consumers (React previews, editor canvas) so there's
// only one TS implementation to maintain.
export { attachScrollAnimObserver };
