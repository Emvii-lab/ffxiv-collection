import { createCollectionPage } from './collection-page.js';

const page = createCollectionPage({
    entity: 'barding',
    table: 'bardings',
    sourcesKey: 'barding_sources',
    userTable: 'user_bardings',
    userColumn: 'barding_id',
    iconField: 'icon_barding_url',
    rowPrefix: 'barding',
    listId: 'bardings-list',
    searchId: 'barding-search',
    resetId: 'filter-reset',
    syncId: 'btn-sync',
    syncEndpoint: 'bardings',
    loadingLabel: 'Chargement des bardes...',
    emptyLabel: 'Aucune barde ne correspond aux filtres.',
    syncSuccessNoun: 'nouvelles bardes ajoutées.',
});

export const loadBardings = page.load;
export const renderBardings = page.render;
