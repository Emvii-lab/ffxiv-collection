import { supabase } from './supabase.js';

// Data layer for collection pages. ALL Supabase / FFXIV Collect access lives
// here, behind a small interface. The presentation/use-case layer
// (collection-page.js) depends on this abstraction, not on Supabase directly —
// which keeps the UI decoupled and makes the data layer mockable in tests.

const itemsSelectQuery = (sourcesKey) => `
    *,
    patches (*),
    ${sourcesKey} (
        details,
        cost,
        lodestone_url,
        location,
        created_at,
        sources ( name, icon_source_url ),
        currencies ( name, icon_currency_url )
    )
`;

/**
 * Builds a repository bound to a single entity (minions / mounts / bardings).
 * `cfg` provides: table, sourcesKey, userTable, userColumn, syncEndpoint.
 */
export function createCollectionRepository(cfg) {
    /** @returns the currently authenticated user, or null. */
    async function getCurrentUser() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return user;
    }

    /** @returns {Promise<{ids: Array, error}>} the item ids the user owns. */
    async function getUserCollectionIds(userId) {
        const { data, error } = await supabase
            .from(cfg.userTable)
            .select(cfg.userColumn)
            .eq('user_id', userId);
        if (error || !data) return { ids: [], error };
        return { ids: data.map((row) => row[cfg.userColumn]), error: null };
    }

    /** @returns {Promise<{data, error}>} all items with patches + sources. */
    async function getItems() {
        return supabase
            .from(cfg.table)
            .select(itemsSelectQuery(cfg.sourcesKey))
            .order('name', { ascending: true })
            .limit(1000);
    }

    /** @returns {Promise<{error}>} */
    async function add(userId, itemId) {
        return supabase.from(cfg.userTable).insert([{ user_id: userId, [cfg.userColumn]: itemId }]);
    }

    /** @returns {Promise<{error}>} */
    async function remove(userId, itemId) {
        return supabase
            .from(cfg.userTable)
            .delete()
            .eq('user_id', userId)
            .eq(cfg.userColumn, itemId);
    }

    /** @returns {Promise<{error}>} inserts many ownerships in one call. */
    async function bulkAdd(userId, itemIds) {
        const rows = itemIds.map((id) => ({ user_id: userId, [cfg.userColumn]: id }));
        return supabase.from(cfg.userTable).insert(rows);
    }

    /** @returns {Promise<{characterId, error}>} the user's linked FFXIV character. */
    async function getLinkedCharacterId(userId) {
        const { data, error } = await supabase
            .from('characters')
            .select('character_id')
            .eq('user_id', userId)
            .single();
        return { characterId: data ? data.character_id : null, error };
    }

    /** @returns {Promise<Array>} owned FFXIV Collect ids. Throws on HTTP error. */
    async function fetchOwnedIdsFromFfxiv(characterId) {
        const response = await fetch(
            `https://ffxivcollect.com/api/characters/${characterId}/${cfg.syncEndpoint}/owned`
        );
        if (!response.ok) throw new Error('API FFXIV Collect Error');
        const owned = await response.json();
        return owned.map((m) => m.id);
    }

    /** @returns {Promise<Map>} FFXIV Collect id -> local db id. Throws on error. */
    async function getFfxivToLocalIdMap() {
        const { data, error } = await supabase
            .from(cfg.table)
            .select('id, ffxiv_collect_id')
            .not('ffxiv_collect_id', 'is', null);
        if (error) throw error;
        const map = new Map();
        data.forEach((m) => map.set(m.ffxiv_collect_id, m.id));
        return map;
    }

    return {
        getCurrentUser,
        getUserCollectionIds,
        getItems,
        add,
        remove,
        bulkAdd,
        getLinkedCharacterId,
        fetchOwnedIdsFromFfxiv,
        getFfxivToLocalIdMap,
    };
}
