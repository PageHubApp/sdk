/** Container CSS overflow UX (drag + wheel) for static HTML export. Mirrors the editor's `applyContainerOverflowUX` runtime. */
export const PH_OVERFLOW_SITE_SCRIPT = `<script>
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('[data-ph-overflow-drag],[data-ph-overflow-autohide]').forEach(function(el){
    (function(scroller){
      var doWheel=scroller.hasAttribute('data-ph-overflow-wheel');
      var doDrag=scroller.hasAttribute('data-ph-overflow-drag');
      var suppressClick=false;
      if(doWheel){
        scroller.addEventListener('wheel',function(e){
          e.preventDefault();
          scroller.scrollLeft+=e.deltaY;
        },{passive:false});
      }
      if(doDrag){
        scroller.addEventListener('dragstart',function(e){
          if(e.target&&e.target.tagName==='IMG')e.preventDefault();
        },true);
        scroller.addEventListener('pointerdown',function(e){
          if(e.pointerType==='mouse'&&e.button!==0)return;
          var smooth=parseFloat(scroller.getAttribute('data-ph-overflow-smooth')||'0')||0;
          var pid=e.pointerId,startX=e.clientX,sL=scroller.scrollLeft,moved=false;
          var desired=sL,rafId=null,pointerDown=true;
          function smoothTick(){
            if(!pointerDown){rafId=null;return;}
            var cur=scroller.scrollLeft,t=desired,delta=t-cur;
            var blend=Math.min(1,Math.max(0.06,smooth));
            if(Math.abs(delta)<0.35)scroller.scrollLeft=t;
            else scroller.scrollLeft=cur+delta*blend;
            if(pointerDown&&(Math.abs(desired-scroller.scrollLeft)>0.35))
              rafId=requestAnimationFrame(smoothTick);
            else rafId=null;
          }
          function move(ev){
            if(ev.pointerId!==pid)return;
            var dx=ev.clientX-startX;
            if(Math.abs(dx)>3)moved=true;
            desired=sL-dx;
            if(smooth<=0)scroller.scrollLeft=desired;
            else if(rafId==null)rafId=requestAnimationFrame(smoothTick);
          }
          function up(ev){
            if(ev.pointerId!==pid)return;
            pointerDown=false;
            if(rafId!=null)cancelAnimationFrame(rafId);
            rafId=null;
            scroller.scrollLeft=desired;
            window.removeEventListener('pointermove',move);
            window.removeEventListener('pointerup',up);
            window.removeEventListener('pointercancel',up);
            scroller.style.cursor='';
            scroller.style.userSelect='';
            suppressClick=moved;
          }
          scroller.style.cursor='grabbing';
          scroller.style.userSelect='none';
          window.addEventListener('pointermove',move);
          window.addEventListener('pointerup',up);
          window.addEventListener('pointercancel',up);
        });
        scroller.addEventListener('click',function(ev){
          if(suppressClick){suppressClick=false;ev.preventDefault();ev.stopPropagation();}
        },true);
      }
    })(el);
  });
});
</script>`;
