/** GSAP scroll-timeline runtime — drives a timeline of preset animations on `[data-scroll-timeline]` children of `[data-scroll-effect="scroll-timeline"]`. */
export const PH_SCROLL_TIMELINE_SCRIPT = `<script>
document.addEventListener('DOMContentLoaded',function(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  var presets={
    fadeIn:{from:{opacity:0},to:{opacity:1}},
    fadeOut:{from:{opacity:1},to:{opacity:0}},
    scaleUp:{from:{scale:0.3,opacity:0},to:{scale:1,opacity:1}},
    slideLeft:{from:{x:200,opacity:0},to:{x:0,opacity:1}},
    slideRight:{from:{x:-200,opacity:0},to:{x:0,opacity:1}},
    slideUp:{from:{y:100,opacity:0},to:{y:0,opacity:1}},
    slideDown:{from:{y:-100,opacity:0},to:{y:0,opacity:1}},
    rotateIn:{from:{rotation:15,opacity:0},to:{rotation:0,opacity:1}},
    fadeScale:{from:{scale:0.5,opacity:0,filter:'blur(8px)'},to:{scale:1,opacity:1,filter:'blur(0px)'}},
    slideRotate:{from:{x:200,rotation:-15,opacity:0},to:{x:0,rotation:0,opacity:1}}
  };
  document.querySelectorAll('[data-scroll-effect="scroll-timeline"]').forEach(function(section){
    var runway=parseFloat(section.getAttribute('data-scroll-runway')||'3');
    var smoothing=parseFloat(section.getAttribute('data-scroll-smoothing')||'0.8');
    var children=section.querySelectorAll('[data-scroll-timeline]');
    if(!children.length)return;
    var tl=gsap.timeline({
      scrollTrigger:{
        trigger:section,pin:true,scrub:smoothing,
        end:'+='+(window.innerHeight*runway),
        pinSpacing:true,anticipatePin:1,invalidateOnRefresh:true
      }
    });
    children.forEach(function(child){
      try{
        var cfg=JSON.parse(child.getAttribute('data-scroll-timeline'));
        var p=presets[cfg.preset];
        if(!p)return;
        var start=(cfg.startProgress||0)/100;
        var end=(cfg.endProgress||100)/100;
        var dur=Math.max(0.01,end-start);
        gsap.set(child,p.from);
        tl.to(child,Object.assign({},p.to,{duration:dur,ease:'none'}),start);
      }catch(e){}
    });
  });
});
</script>`;
