// init / rebind / __PH_RUNTIME__ debug surface.

export const BOOTSTRAP_CHUNK = `
function init(){
  seedFromWindow();
  mountUrlBridge();
  detectCustomerToken();
  ensureAnalyticsStubs();
  mountMaps();
  try { Alpine.initTree(document.body); } catch(e) {}
  try {
    var docEl = document.documentElement;
    if (!docEl.hasAttribute('data-ph-hydrated')) {
      docEl.setAttribute('data-ph-hydrated', '1');
      document.dispatchEvent(new Event('pagehub:hydrated'));
    }
  } catch (e) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// Re-walk attach points for late-injected DOM (custom JS handlers, 3rd-party
// scripts). Idempotent via Alpine's _x_attributeCleanups.
function rebind(root){
  try { Alpine.initTree(root || document.body); } catch(e){}
}

window.__PH_RUNTIME__ = {
  getState: getState,
  getStateValue: getStateValue,
  setState: setState,
  listStates: listStates,
  subscribe: subscribe,
  addToCart: addToCart,
  setCartQuantity: setCartQuantity,
  removeCartItem: removeCartItem,
  rebind: rebind
};
`;
