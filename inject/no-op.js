// Registered as the only content script when the extension is disabled or the
// scope does not cover this tab. Registration is never fully removed on
// purpose: per-tab and late settings changes must be able to flip the scope
// back on without re-navigating, and unregistering everything makes pages that
// already loaded run without the coordinator forever. This script does
// nothing; it exists so the registration slot stays valid.
