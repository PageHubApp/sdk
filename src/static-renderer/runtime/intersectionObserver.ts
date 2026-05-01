/** IntersectionObserver runtime — toggles `.ph-in-view` on `.ph-anim-scroll` elements when they scroll into view. Inlined into static HTML. */
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
