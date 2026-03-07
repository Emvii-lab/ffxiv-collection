import { supabase } from './supabase.js';
import { playCollectSound, playUncollectSound, playMenuSound } from './audio.js';
import { openModal, initModalListeners } from './modal.js';

let bardingsCache = null;
let userCollection = new Set();
let activeFilters = {
    collection: null,
    patch: null,
    search: ''
};

export async function loadBardings(currentUser) {
    const list = document.getElementById('bardings-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; padding:2rem;">Chargement des bardes...</p>';

    if (currentUser) {
        const { data: userBardings, error: userError } = await supabase
            .from('user_bardings')
            .select('barding_id')
            .eq('user_id', currentUser.id);

        if (!userError && userBardings) {
            userCollection = new Set(userBardings.map(row => row.barding_id));
        }
    }

    if (!bardingsCache) {
        const { data, error } = await supabase
            .from('bardings')
            .select(`
                *,
                patches (*),
                barding_sources (
                    details,
                    cost,
                    lodestone_url,
                    location,
                    created_at,
                    sources ( name, icon_source_url ),
                    currencies ( name, icon_currency_url )
                )
            `)
            .order('name', { ascending: true })
            .limit(1000);

        if (error) {
            list.innerHTML = `<p style="color:red; text-align:center;">Erreur de chargement: ${error.message}</p>`;
            return;
        }
        bardingsCache = data;
    }

    setupFilterListeners();
    initModalListeners();
    renderBardings(bardingsCache);
}

function setupFilterListeners() {
    const filterBar = document.querySelector('.filter-bar');
    if (!filterBar || filterBar.dataset.init === 'true') return;
    filterBar.dataset.init = 'true';

    filterBar.querySelectorAll('.btn-star-unified').forEach(btn => {
        btn.addEventListener('click', () => {
            playMenuSound();
            const filterType = btn.dataset.filter;
            if (activeFilters.collection === filterType) {
                activeFilters.collection = null;
                btn.classList.remove('active');
            } else {
                activeFilters.collection = filterType;
                filterBar.querySelectorAll('.btn-star-unified').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            renderBardings(bardingsCache);
        });
    });

    const patchContainer = filterBar.querySelector('.patch-filters');
    if (patchContainer) {
        patchContainer.querySelectorAll('.btn-patch-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                playMenuSound();
                const patchVer = btn.dataset.patch;
                if (activeFilters.patch === patchVer) {
                    activeFilters.patch = null;
                    btn.classList.remove('active');
                } else {
                    activeFilters.patch = patchVer;
                    patchContainer.querySelectorAll('.btn-patch-filter').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                renderBardings(bardingsCache);
            });
        });
    }

    const searchInput = document.getElementById('barding-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value.trim().toLowerCase();
            renderBardings(bardingsCache);
        });
    }

    const resetBtn = document.getElementById('filter-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            playMenuSound();
            activeFilters = { collection: null, patch: null, search: '' };
            if (searchInput) searchInput.value = '';
            filterBar.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
            renderBardings(bardingsCache);
        });
    }

    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => syncBardings());
    }
}

export function renderBardings(data) {
    const list = document.getElementById('bardings-list');
    if (!list) return;
    list.innerHTML = '';

    let filteredData = data;
    if (activeFilters.collection || activeFilters.patch || activeFilters.search) {
        filteredData = data.filter(barding => {
            if (activeFilters.collection === 'collected') {
                if (!userCollection.has(barding.id)) return false;
            } else if (activeFilters.collection === 'missing') {
                if (userCollection.has(barding.id)) return false;
            }

            let pVer = '2.0';
            if (barding.patches && barding.patches.version) pVer = String(barding.patches.version);
            else if (barding.patch_id) pVer = String(barding.patch_id);

            if (activeFilters.patch) {
                if (!pVer.startsWith(activeFilters.patch)) return false;
            }

            if (activeFilters.search) {
                const name = (barding.name || '').toLowerCase();
                if (!name.includes(activeFilters.search)) return false;
            }
            return true;
        });
    }

    if (!filteredData || filteredData.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding: 2rem; color: #888;">Aucune barde ne correspond aux filtres.</p>';
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const fragment = document.createDocumentFragment();
    filteredData.forEach((barding, index) => {
        const row = createBardingRow(barding, index, observer);
        fragment.appendChild(row);
    });
    list.appendChild(fragment);
}

function createBardingRow(barding, index, observer) {
    let patchData = null;
    if (barding.patches && !Array.isArray(barding.patches)) { patchData = barding.patches; }
    else if (Array.isArray(barding.patches) && barding.patches.length > 0) { patchData = barding.patches[0]; }

    let patchVersion = '?';
    let patchMajor = '2';
    if (patchData && patchData.version) {
        patchVersion = patchData.version;
        patchMajor = String(patchVersion).charAt(0);
    } else if (barding.patch_id) {
        patchVersion = barding.patch_id;
        patchMajor = String(barding.patch_id).charAt(0);
    }

    const isUnavailable = (barding.available === false);
    const unavailableClass = isUnavailable ? 'unavailable' : '';
    const isCollected = userCollection.has(barding.id);
    const collectedClass = isCollected ? 'collected' : '';

    const row = document.createElement('div');
    row.className = `barding-row row-${patchMajor} ${unavailableClass} ${collectedClass}`;
    row.style.animationDelay = `${index * 0.05}s`;
    observer.observe(row);

    const iconUrl = barding.icon_barding_url || 'https://xivapi.com/i/000000/000405.png';
    const name = barding.name || 'Inconnu';
    const patchIconUrl = patchData ? patchData.icon_patch_url : null;
    const patchLogoUrl = patchData ? patchData.logo_patch_url : null;

    let badgeHtml = '';
    if (patchIconUrl) {
        badgeHtml = `<img src="${patchIconUrl}" class="patch-badge-img" alt="${patchVersion}" title="Patch ${patchVersion}">`;
    } else {
        badgeHtml = `<span class="patch-badge patch-${patchMajor}">${patchVersion}</span>`;
    }
    let logoHtml = patchLogoUrl ? `<img src="${patchLogoUrl}" class="patch-logo" alt="Logo Patch">` : '';

    let shopIconRendered = false;
    const sourceIconsHtml = (barding.barding_sources || []).map(ms => {
        const s = ms.sources;
        const c = ms.currencies;
        if (!s) return '';
        if (ms.lodestone_url) return '';
        let tooltip = s.name;
        if (ms.details) tooltip += `: ${ms.details}`;
        if (ms.cost) tooltip += ` (${ms.cost.toLocaleString('fr-FR')}${c ? ' ' + c.name : ''})`;
        const iconSrc = s.icon_source_url || '';
        if (s.name && (s.name.toLowerCase().includes('boutique') || s.name.toLowerCase().includes('cdjapan'))) {
            if (barding.shop_url) {
                shopIconRendered = true;
                return `<a href="${barding.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="${tooltip}"></i></a>`;
            }
            return '';
        }
        if (iconSrc && !iconSrc.startsWith('http')) {
            return `<i class="${iconSrc} meta-icon-fa" title="${tooltip}"></i>`;
        }
        return '';
    }).join('');

    const standaloneShopHtml = (barding.shop_url && !shopIconRendered)
        ? `<a href="${barding.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="Acheter en ligne"></i></a>`
        : '';

    row.innerHTML = `
        <img src="${iconUrl}" class="barding-icon" alt="${name}">
        <div class="barding-info">
            <div style="margin-right:auto; display:flex; flex-direction:column; align-items:flex-start;">
                <span class="barding-name">
                        <span class="barding-name-link">${name}</span>
                        <button class="btn-sources-trigger" title="Infos & Sources"><i class="fa-solid fa-magnifying-glass"></i></button>
                        ${barding.hôtel_des_ventes ? '<i class="fa-solid fa-gavel meta-icon-fa" title="Disponible à l\'hôtel des ventes"></i>' : ''}
                        ${barding.malle_surprise ? '<i class="fa-solid fa-box-open meta-icon-fa" title="Disponible dans une malle-surprise"></i>' : ''}
                        ${sourceIconsHtml}
                        ${standaloneShopHtml}
                </span>
            </div>
        </div>
        <div class="barding-center-text" title="${barding.tooltip ? barding.tooltip.replace(/"/g, '&quot;') : ''}">
            ${barding.tooltip ? `<i class="fa-solid fa-quote-left quote-icon"></i> ${barding.tooltip} <i class="fa-solid fa-quote-right quote-icon"></i>` : ''} 
        </div>
        <div class="barding-meta">
            <div class="col-badge">${badgeHtml}</div>
            <div class="col-logo">${logoHtml}</div>
            <div class="btn-collect-container"></div>
        </div>
    `;

    row.querySelector('.barding-name-link').addEventListener('click', () => {
        playMenuSound();
        window.location.href = `detail.html?type=barding&id=${barding.id}`;
    });

    row.querySelector('.btn-sources-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        playMenuSound();
        openModal(barding, patchData, 'barding');
    });

    const btnContainer = row.querySelector('.btn-collect-container');
    const btnCollect = document.createElement('button');
    btnCollect.className = isCollected ? 'btn-star-unified collected' : 'btn-star-unified';
    btnCollect.innerHTML = isCollected ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    btnCollect.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wasCollected = row.classList.contains('collected');
        if (wasCollected) {
            userCollection.delete(barding.id);
            row.classList.remove('collected');
            btnCollect.classList.remove('collected');
            btnCollect.innerHTML = '<i class="fa-regular fa-star"></i>';
            playUncollectSound();
            await toggleCollection(barding.id, false);
        } else {
            userCollection.add(barding.id);
            row.classList.add('collected');
            btnCollect.classList.add('collected');
            btnCollect.innerHTML = '<i class="fa-solid fa-star"></i>';
            playCollectSound();
            await toggleCollection(barding.id, true);
        }
    });
    btnContainer.appendChild(btnCollect);

    return row;
}

async function toggleCollection(bardingId, isCollected) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isCollected) {
        await supabase.from('user_bardings').insert([{ user_id: user.id, barding_id: bardingId }]);
    } else {
        await supabase.from('user_bardings').delete().eq('user_id', user.id).eq('barding_id', bardingId);
    }
}

// --- SYNC WITH FFXIV COLLECT ---
async function syncBardings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Veuillez vous connecter pour synchroniser votre collection.");
        return;
    }

    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sync...';
    }

    try {
        // 1. Get Character ID
        const { data: charData, error: charError } = await supabase
            .from('characters')
            .select('character_id')
            .eq('user_id', user.id)
            .single();

        if (charError || !charData) {
            console.error('Character fetch error:', charError);
            alert("Aucun personnage lié trouvé. Veuillez lier votre personnage dans les paramètres ou contacter l'admin.");
            throw new Error("No character linked");
        }

        const charId = charData.character_id;
        console.log(`Syncing bardings for character ID: ${charId}`);

        // 2. Fetch from FFXIV Collect API
        const response = await fetch(`https://ffxivcollect.com/api/characters/${charId}/bardings/owned`);
        if (!response.ok) throw new Error("API FFXIV Collect Error");

        const ownedData = await response.json();
        const apiOwnedIds = new Set(ownedData.map(m => m.id));

        console.log(`API reports ${apiOwnedIds.size} bardings owned.`);

        // 3. Fetch Local Barding Map (FFXIV ID -> Local ID)
        const { data: allBardings, error: mapError } = await supabase
            .from('bardings')
            .select('id, ffxiv_collect_id')
            .not('ffxiv_collect_id', 'is', null);

        if (mapError) throw mapError;

        const ffxivMap = new Map();
        allBardings.forEach(m => ffxivMap.set(m.ffxiv_collect_id, m.id));

        // 4. Find Missing Bardings
        const bardingsToAdd = [];
        for (const apiId of apiOwnedIds) {
            const localDbId = ffxivMap.get(apiId);
            if (localDbId && !userCollection.has(localDbId)) {
                bardingsToAdd.push({
                    user_id: user.id,
                    barding_id: localDbId
                });
            }
        }

        console.log(`Found ${bardingsToAdd.length} new bardings to add.`);

        if (bardingsToAdd.length === 0) {
            alert("Votre collection est déjà à jour !");
        } else {
            // 5. Bulk Insert
            const { error: insertError } = await supabase
                .from('user_bardings')
                .insert(bardingsToAdd);

            if (insertError) {
                console.error("Bulk insert error:", insertError);
                if (insertError.code === '23505') { // Unique violation
                    alert("Certaines bardes étaient déjà en cours d'ajout. Veuillez rafraîchir.");
                } else {
                    throw insertError;
                }
            } else {
                bardingsToAdd.forEach(item => userCollection.add(item.barding_id));
                renderBardings(bardingsCache);
                alert(`Succès ! ${bardingsToAdd.length} nouvelles bardes ajoutées.`);
                playCollectSound();
            }
        }

    } catch (err) {
        console.error("Sync failed:", err);
        if (err.message !== "No character linked") {
            alert("Erreur lors de la synchronisation : " + err.message);
        }
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync';
        }
    }
}
