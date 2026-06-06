import { playCollectSound, playUncollectSound, playMenuSound } from './audio.js';
import { openModal, initModalListeners } from './modal.js';
import { escapeHtml, getPatchInfo, matchesFilters } from './collection-utils.js';
import { createCollectionRepository } from './collection-repository.js';

const FALLBACK_ICON = 'https://xivapi.com/i/000000/000405.png';

/**
 * Builds a collection page (minions / mounts / bardings) from a config object.
 * All three pages share identical behaviour; only the table names, DOM ids and
 * CSS prefixes differ — captured in `cfg`.
 */
export function createCollectionPage(cfg) {
    const repo = createCollectionRepository(cfg);
    let cache = null;
    let userCollection = new Set();
    let activeFilters = { collection: null, patch: null, search: '' };

    async function load(currentUser) {
        const list = document.getElementById(cfg.listId);
        if (!list) return;

        list.innerHTML = `<p style="text-align:center; padding:2rem;">${cfg.loadingLabel}</p>`;

        if (currentUser) {
            const { ids } = await repo.getUserCollectionIds(currentUser.id);
            userCollection = new Set(ids);
        }

        if (!cache) {
            const { data, error } = await repo.getItems();
            if (error) {
                list.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement: ${escapeHtml(error.message)}</p>`;
                return;
            }
            cache = data;
        }

        setupFilterListeners();
        initModalListeners();
        render();
    }

    function setupFilterListeners() {
        const filterBar = document.querySelector('.filter-bar');
        if (!filterBar || filterBar.dataset.init === 'true') return;
        filterBar.dataset.init = 'true';

        filterBar.querySelectorAll('.btn-star-unified').forEach((btn) => {
            btn.addEventListener('click', () => {
                playMenuSound();
                const filterType = btn.dataset.filter;
                if (activeFilters.collection === filterType) {
                    activeFilters.collection = null;
                    btn.classList.remove('active');
                } else {
                    activeFilters.collection = filterType;
                    filterBar
                        .querySelectorAll('.btn-star-unified')
                        .forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                render();
            });
        });

        const patchContainer = filterBar.querySelector('.patch-filters');
        if (patchContainer) {
            patchContainer.querySelectorAll('.btn-patch-filter').forEach((btn) => {
                btn.addEventListener('click', () => {
                    playMenuSound();
                    const patchVer = btn.dataset.patch;
                    if (activeFilters.patch === patchVer) {
                        activeFilters.patch = null;
                        btn.classList.remove('active');
                    } else {
                        activeFilters.patch = patchVer;
                        patchContainer
                            .querySelectorAll('.btn-patch-filter')
                            .forEach((b) => b.classList.remove('active'));
                        btn.classList.add('active');
                    }
                    render();
                });
            });
        }

        const searchInput = document.getElementById(cfg.searchId);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                activeFilters.search = e.target.value.trim().toLowerCase();
                render();
            });
        }

        const resetBtn = document.getElementById(cfg.resetId);
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                playMenuSound();
                activeFilters = { collection: null, patch: null, search: '' };
                if (searchInput) searchInput.value = '';
                filterBar
                    .querySelectorAll('.active')
                    .forEach((el) => el.classList.remove('active'));
                render();
            });
        }

        const syncBtn = document.getElementById(cfg.syncId);
        if (syncBtn) {
            syncBtn.addEventListener('click', () => sync());
        }
    }

    function render() {
        const list = document.getElementById(cfg.listId);
        if (!list) return;
        list.innerHTML = '';

        let filteredData = cache || [];
        if (activeFilters.collection || activeFilters.patch || activeFilters.search) {
            filteredData = filteredData.filter((item) =>
                matchesFilters(item, activeFilters, userCollection)
            );
        }

        if (filteredData.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding: 2rem; color: #888;">${cfg.emptyLabel}</p>`;
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('scroll-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        const fragment = document.createDocumentFragment();
        filteredData.forEach((item, index) => {
            fragment.appendChild(createRow(item, index, observer));
        });
        list.appendChild(fragment);
    }

    function createRow(item, index, observer) {
        const { patchData, version, major } = getPatchInfo(item);
        const p = cfg.rowPrefix;

        const isCollected = userCollection.has(item.id);
        const unavailableClass = item.available === false ? 'unavailable' : '';
        const collectedClass = isCollected ? 'collected' : '';

        const row = document.createElement('div');
        row.className = `${p}-row row-${major} ${unavailableClass} ${collectedClass}`;
        row.style.animationDelay = `${index * 0.05}s`;
        observer.observe(row);

        const iconUrl = item[cfg.iconField] || FALLBACK_ICON;
        const name = item.name || 'Inconnu';
        const patchIconUrl = patchData ? patchData.icon_patch_url : null;
        const patchLogoUrl = patchData ? patchData.logo_patch_url : null;

        const badgeHtml = patchIconUrl
            ? `<img src="${patchIconUrl}" class="patch-badge-img" alt="${escapeHtml(version)}" title="Patch ${escapeHtml(version)}">`
            : `<span class="patch-badge patch-${major}">${escapeHtml(version)}</span>`;
        const logoHtml = patchLogoUrl
            ? `<img src="${patchLogoUrl}" class="patch-logo" alt="Logo Patch">`
            : '';

        let shopIconRendered = false;
        const sourceIconsHtml = (item[cfg.sourcesKey] || [])
            .map((ms) => {
                const s = ms.sources;
                const c = ms.currencies;
                if (!s) return '';
                if (ms.lodestone_url) return '';
                let tooltip = s.name;
                if (ms.details) tooltip += `: ${ms.details}`;
                if (ms.cost)
                    tooltip += ` (${ms.cost.toLocaleString('fr-FR')}${c ? ' ' + c.name : ''})`;
                const iconSrc = s.icon_source_url || '';
                if (
                    s.name &&
                    (s.name.toLowerCase().includes('boutique') ||
                        s.name.toLowerCase().includes('cdjapan'))
                ) {
                    if (item.shop_url) {
                        shopIconRendered = true;
                        return `<a href="${item.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="${escapeHtml(tooltip)}"></i></a>`;
                    }
                    return '';
                }
                if (iconSrc && !iconSrc.startsWith('http')) {
                    return `<i class="${iconSrc} meta-icon-fa" title="${escapeHtml(tooltip)}"></i>`;
                }
                return '';
            })
            .join('');

        const standaloneShopHtml =
            item.shop_url && !shopIconRendered
                ? `<a href="${item.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="Acheter en ligne"></i></a>`
                : '';

        const acquisitionHtml =
            item.acquisition && sourceIconsHtml === '' && standaloneShopHtml === ''
                ? `<i class="fa-solid fa-circle-info meta-icon-fa" title="${escapeHtml(item.acquisition)}"></i>`
                : '';

        const auctionHtml = item.hôtel_des_ventes
            ? '<i class="fa-solid fa-gavel meta-icon-fa" title="Disponible à l\'hôtel des ventes"></i>'
            : '';
        const surpriseHtml = item.malle_surprise
            ? '<i class="fa-solid fa-box-open meta-icon-fa" title="Disponible dans une malle-surprise"></i>'
            : '';

        const tooltipText = item.tooltip || '';

        row.innerHTML = `
            <img src="${iconUrl}" class="${p}-icon" alt="${escapeHtml(name)}">
            <div class="${p}-info">
                <div style="margin-right:auto; display:flex; flex-direction:column; align-items:flex-start;">
                    <span class="${p}-name">
                        <span class="${p}-name-link">${escapeHtml(name)}</span>
                        <button class="btn-sources-trigger" title="Infos & Sources"><i class="fa-solid fa-magnifying-glass"></i></button>
                        ${auctionHtml}
                        ${surpriseHtml}
                        ${sourceIconsHtml}
                        ${standaloneShopHtml}
                        ${acquisitionHtml}
                    </span>
                </div>
            </div>
            <div class="${p}-center-text" title="${escapeHtml(tooltipText)}">
                ${tooltipText ? `<i class="fa-solid fa-quote-left quote-icon"></i> ${escapeHtml(tooltipText)} <i class="fa-solid fa-quote-right quote-icon"></i>` : ''}
            </div>
            <div class="${p}-meta">
                <div class="col-badge">${badgeHtml}</div>
                <div class="col-logo">${logoHtml}</div>
                <div class="btn-collect-container"></div>
            </div>
        `;

        row.querySelector(`.${p}-name-link`).addEventListener('click', () => {
            playMenuSound();
            window.location.href = `detail.html?type=${cfg.entity}&id=${item.id}`;
        });

        row.querySelector('.btn-sources-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            playMenuSound();
            openModal(item, patchData, cfg.entity);
        });

        const btnCollect = document.createElement('button');
        const applyCollectedUI = (collected) => {
            row.classList.toggle('collected', collected);
            btnCollect.classList.toggle('collected', collected);
            btnCollect.innerHTML = collected
                ? '<i class="fa-solid fa-star"></i>'
                : '<i class="fa-regular fa-star"></i>';
        };
        btnCollect.className = 'btn-star-unified';
        applyCollectedUI(isCollected);

        btnCollect.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wasCollected = row.classList.contains('collected');
            const newState = !wasCollected;

            // Optimistic update
            if (newState) userCollection.add(item.id);
            else userCollection.delete(item.id);
            applyCollectedUI(newState);
            if (newState) playCollectSound();
            else playUncollectSound();

            const { error } = await toggleCollection(item.id, newState);
            if (error) {
                // Roll back the optimistic update
                if (newState) userCollection.delete(item.id);
                else userCollection.add(item.id);
                applyCollectedUI(wasCollected);
                console.error('Collection update failed:', error);
                alert('La mise à jour de la collection a échoué. Veuillez réessayer.');
            }
        });

        row.querySelector('.btn-collect-container').appendChild(btnCollect);
        return row;
    }

    async function toggleCollection(itemId, isCollected) {
        const user = await repo.getCurrentUser();
        if (!user) return { error: new Error('Not authenticated') };
        return isCollected ? repo.add(user.id, itemId) : repo.remove(user.id, itemId);
    }

    async function sync() {
        const user = await repo.getCurrentUser();
        if (!user) {
            alert('Veuillez vous connecter pour synchroniser votre collection.');
            return;
        }

        const syncBtn = document.getElementById(cfg.syncId);
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sync...';
        }

        try {
            // 1. Get linked character id
            const { characterId, error: charError } = await repo.getLinkedCharacterId(user.id);
            if (charError || !characterId) {
                console.error('Character fetch error:', charError);
                alert(
                    "Aucun personnage lié trouvé. Veuillez lier votre personnage dans les paramètres ou contacter l'admin."
                );
                throw new Error('No character linked');
            }

            // 2. Fetch owned ids from FFXIV Collect + map them to local ids
            const apiOwnedIds = new Set(await repo.fetchOwnedIdsFromFfxiv(characterId));
            const ffxivMap = await repo.getFfxivToLocalIdMap();

            // 3. Find items to add (owned upstream but missing locally)
            const idsToAdd = [];
            for (const apiId of apiOwnedIds) {
                const localDbId = ffxivMap.get(apiId);
                if (localDbId && !userCollection.has(localDbId)) {
                    idsToAdd.push(localDbId);
                }
            }

            if (idsToAdd.length === 0) {
                alert('Votre collection est déjà à jour !');
            } else {
                // 4. Bulk insert
                const { error: insertError } = await repo.bulkAdd(user.id, idsToAdd);

                if (insertError) {
                    console.error('Bulk insert error:', insertError);
                    if (insertError.code === '23505') {
                        alert(
                            `Certains éléments étaient déjà en cours d'ajout. Veuillez rafraîchir.`
                        );
                    } else {
                        throw insertError;
                    }
                } else {
                    idsToAdd.forEach((id) => userCollection.add(id));
                    render();
                    alert(`Succès ! ${idsToAdd.length} ${cfg.syncSuccessNoun}`);
                    playCollectSound();
                }
            }
        } catch (err) {
            console.error('Sync failed:', err);
            if (err.message !== 'No character linked') {
                alert('Erreur lors de la synchronisation : ' + err.message);
            }
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync';
            }
        }
    }

    return { load, render };
}
