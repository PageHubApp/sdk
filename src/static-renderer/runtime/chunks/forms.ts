// Form submit dispatcher — routes email / webhook / collection / agent / custom.

export const FORMS_CHUNK = `
Alpine.directive('form', function(form, _meta, _ctx){
  var cleanup = _ctx.cleanup;
  var metaRaw = form.getAttribute('data-ph-form');
  var meta = null;
  if (metaRaw) { try { meta = JSON.parse(metaRaw); } catch(e){} }
  var onSubmit = function(e){
    e.preventDefault();
    var fd = new FormData(form);
    if (fd.get('_ph_hp')) return; // Honeypot.
    var data = {}; fd.forEach(function(v, k){ if (k !== '_ph_hp') data[k] = v; });
    var t = (meta && meta.submissionType) || 'email';
    var formName = (meta && meta.formName) || form.getAttribute('data-form-name') || 'form';
    if (t === 'iframe') return;
    if (t === 'custom' && meta && meta.action) {
      fetch(meta.action, {
        method: meta.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(function(){});
    } else if (t === 'agent' && meta && meta.agentId) {
      fetch('/api/agents/' + encodeURIComponent(meta.agentId) + '/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: PAGE_ID, formData: data }),
        credentials: 'include',
      }).catch(function(){});
    } else {
      // email / webhook / collection — routed through /api/submissions.
      var body = { pageId: PAGE_ID, formData: data, formName: formName };
      if (meta) {
        if (meta.mailto) body.mailTo = meta.mailto;
        if (t === 'webhook' && meta.webhookUrl) body.webhookUrl = meta.webhookUrl;
        if (t === 'collection' && meta.collectionSlug) {
          body.collection = meta.collectionSlug;
          if (meta.collectionFieldMap) body.collectionFieldMap = meta.collectionFieldMap;
          if (meta.collectionSkipEmail) body.skipEmail = true;
        }
      }
      fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(function(){});
    }
    fireAnalytics('form_submit', { formName: formName });
    // Author-configured conversion (Google Ads / GA4 / Meta).
    if (meta && meta.conversion) {
      try { fireConversion(meta.conversion); } catch(e){}
    }
    try { form.reset(); } catch(e){}
  };
  form.addEventListener('submit', onSubmit);
  cleanup(function(){ form.removeEventListener('submit', onSubmit); });
});
`;
