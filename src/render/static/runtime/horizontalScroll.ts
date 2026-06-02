/** GSAP horizontal scroll runtime — pins `[data-scroll-effect="horizontal-scroll"]` sections and translates their `.ph-hscroll-track` child by section width. */
export const PH_HORIZONTAL_SCROLL_SCRIPT = `<script>
document.addEventListener('DOMContentLoaded',function(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('[data-scroll-effect="horizontal-scroll"]').forEach(function(section){
    var sticky=section.querySelector('.ph-hscroll-sticky');
    var track=section.querySelector('.ph-hscroll-track');
    if(!sticky||!track)return;
    var overflow=track.scrollWidth-section.offsetWidth;
    if(overflow<=0)return;
    var dir=section.getAttribute('data-scroll-direction')||'ltr';
    var speed=parseFloat(section.getAttribute('data-scroll-speed')||'1.5');
    var smoothing=parseFloat(section.getAttribute('data-scroll-smoothing')||'0.8');
    var doSnap=section.getAttribute('data-scroll-snap')==='true';
    var isRTL=dir==='rtl';
    var panelCount=track.children.length;
    var snapVal=doSnap&&panelCount>1?{snapTo:1/(panelCount-1),duration:{min:0.2,max:0.5},ease:'power1.inOut'}:false;
    if(isRTL)gsap.set(track,{x:-overflow});
    gsap.timeline({
      scrollTrigger:{
        trigger:section,
        pin:sticky,
        scrub:smoothing,
        end:'+='+(overflow*speed),
        snap:snapVal,
        pinSpacing:true,
        anticipatePin:1,
        invalidateOnRefresh:true
      }
    }).to(track,{x:isRTL?0:-overflow,ease:'none'});
  });
});
</script>`;
