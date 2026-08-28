/*
 * Opens links that leave the documentation site in a new tab.
 *
 * Internal MkDocs navigation (relative links, in-page anchors, and any link
 * that resolves to the current site origin) is left completely untouched so
 * normal documentation navigation and the "back" button keep working as
 * expected. This only affects links to other origins, e.g. the Gitea
 * repository, the API, or third-party references.
 *
 * Re-runs after `instant` navigation (MkDocs Material's client-side page
 * loading) so the behaviour also applies to content swapped in without a
 * full page reload.
 */
(function () {
  function markExternalLinks() {
    var origin = window.location.origin;
    var anchors = document.querySelectorAll(
      '.md-content a[href], .md-footer a[href], .md-header__source a[href]',
    );

    anchors.forEach(function (anchor) {
      var href = anchor.getAttribute('href');

      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      var isExternal;
      try {
        isExternal = new URL(href, window.location.href).origin !== origin;
      } catch (error) {
        // Malformed/relative-only href: treat as internal, do nothing.
        return;
      }

      if (!isExternal) {
        return;
      }

      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
      anchor.classList.add('md-external-link');

      if (!anchor.hasAttribute('aria-label')) {
        var label = anchor.textContent.trim();
        anchor.setAttribute(
          'aria-label',
          label ? label + ' (opens in a new tab)' : 'Opens in a new tab',
        );
      }
    });
  }

  if (typeof document$ !== 'undefined') {
    // Material for MkDocs instant-navigation observable.
    document$.subscribe(markExternalLinks);
  } else {
    document.addEventListener('DOMContentLoaded', markExternalLinks);
  }
})();
