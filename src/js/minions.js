import { createCollectionPage } from './collection-page.js';

const page = createCollectionPage({
    entity: 'minion',
    table: 'minions',
    sourcesKey: 'minion_sources',
    userTable: 'user_minions',
    userColumn: 'minion_id',
    iconField: 'icon_minion_url',
    rowPrefix: 'minion',
    listId: 'minions-list',
    searchId: 'minion-search',
    resetId: 'filter-reset',
    syncId: 'btn-sync',
    syncEndpoint: 'minions',
    loadingLabel: 'Chargement des mascottes...',
    emptyLabel: 'Aucune mascotte ne correspond aux filtres.',
    syncSuccessNoun: 'nouvelles mascottes ajoutées.',
});

export const loadMinions = page.load;
export const renderMinions = page.render;
