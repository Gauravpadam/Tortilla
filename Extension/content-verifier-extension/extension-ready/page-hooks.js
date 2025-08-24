// Injected into the PAGE context by the content script. Avoids inline script CSP issues.
(function() {
  const POST = (payload) => {
    try { window.postMessage(Object.assign({ __xcom: true }, payload), '*'); } catch (_) {}
  };

  // Hook fetch in page context
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function(...args) {
      const url = (args && args[0] && args[0].url) || (typeof args[0] === 'string' ? args[0] : String(args[0]));
      try {
        const res = await origFetch.apply(this, args);
        if (url && String(url).includes('/api/graphql/')) {
          try {
            const clone = res.clone();
            clone.text().then(bodyText => {
              POST({ type: 'XCOM_INTERCEPTED_RESPONSE', url: String(url), bodyText });
            }).catch(() => {});
          } catch (_) {}
        }
        return res;
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  // Hook XHR in page context
  const OrigXHR = window.XMLHttpRequest;
  if (OrigXHR && OrigXHR.prototype) {
    const open = OrigXHR.prototype.open;
    const send = OrigXHR.prototype.send;
    OrigXHR.prototype.open = function(method, url) {
      this.__xcom_url = url;
      return open.apply(this, arguments);
    };
    OrigXHR.prototype.send = function() {
      try {
        this.addEventListener('readystatechange', function() {
          try {
            if (this.readyState === 4 && this.__xcom_url && String(this.__xcom_url).includes('/api/graphql/')) {
              const bodyText = this.responseText;
              POST({ type: 'XCOM_INTERCEPTED_RESPONSE', url: String(this.__xcom_url), bodyText });
            }
          } catch (_) {}
        });
      } catch (_) {}
      return send.apply(this, arguments);
    };
  }

  try { console.log('%c[DEBUG] ✅ page-hooks.js loaded in page context', 'color: #28a745'); } catch (_) {}
})();
