// Pure, side-effect-free helpers for the collection pages.
// Kept separate from collection-page.js so they can be unit-tested without
// pulling in the Supabase client (which requires runtime env vars).

/**
 * Escapes a string for safe insertion into HTML (text or attribute context).
 */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Resolves the patch version/major for an item, handling both the joined
 * `patches` object (or array) and the raw `patch_id` fallback.
 */
export function getPatchInfo(item) {
    const patchData = Array.isArray(item.patches) ? item.patches[0] || null : item.patches || null;

    let version = '?';
    let major = '2';
    if (patchData && patchData.version) {
        version = patchData.version;
        major = String(version).charAt(0);
    } else if (item.patch_id) {
        version = item.patch_id;
        major = String(item.patch_id).charAt(0);
    }
    return { patchData, version, major };
}

/**
 * Pure predicate deciding whether an item passes the active filters.
 */
export function matchesFilters(item, filters, userCollection) {
    if (filters.collection === 'collected' && !userCollection.has(item.id)) return false;
    if (filters.collection === 'missing' && userCollection.has(item.id)) return false;

    if (filters.patch) {
        let pVer = '2.0';
        if (item.patches && item.patches.version) pVer = String(item.patches.version);
        else if (item.patch_id) pVer = String(item.patch_id);
        if (!pVer.startsWith(filters.patch)) return false;
    }

    if (filters.search) {
        const name = (item.name || '').toLowerCase();
        if (!name.includes(filters.search)) return false;
    }
    return true;
}
