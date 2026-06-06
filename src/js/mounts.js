import { createCollectionPage } from './collection-page.js';

const page = createCollectionPage({
    entity: 'mount',
    table: 'mounts',
    sourcesKey: 'mount_sources',
    userTable: 'user_mounts',
    userColumn: 'mount_id',
    iconField: 'icon_mount_url',
    rowPrefix: 'minion', // mounts reuse the minion-* CSS classes
    listId: 'mounts-list',
    searchId: 'mount-search',
    resetId: 'mount-filter-reset',
    syncId: 'btn-sync-mounts',
    syncEndpoint: 'mounts',
    loadingLabel: 'Chargement des montures...',
    emptyLabel: 'Aucune monture ne correspond aux filtres.',
    syncSuccessNoun: 'nouvelles montures ajoutées.',
});

export const loadMounts = page.load;
export const renderMounts = page.render;
