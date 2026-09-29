/* global sourceMatchesAny */
// Shared by background.js and popup.js, which cannot import from each other:
// they are separate bundles, so the helper is loaded as a plain script by
// manifest.json background.scripts and by a <script> tag in popup.html.
//
// A user agent can be published in more than one source: upstream generates
// common/ from data/, so a measured-common string is also a latest one. Both
// filters therefore match on overlap rather than equality, and a record whose
// `source` is a bare string still matches (older cached records look like that).
function sourceMatchesAny(uaSource, wanted) {
  const own = Array.isArray(uaSource) ? uaSource : [uaSource];
  return own.some(source => wanted.includes(source));
}
