import { supabase } from './supabase.js';
import { playCollectSound, playUncollectSound, playMenuSound } from './audio.js';
import { openModal, initModalListeners } from './modal.js';

let mountsCache = null;
let userMountCollection = new Set();
let activeMountFilters = {
    collection: null,
    patch: null,
    search: ''
};

export async function loadMounts(currentUser) {
    const list = document.getElementById('mounts-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; padding:2rem;">Chargement des montures...</p>';

    if (currentUser) {
        const { data: userMounts, error: userError } = await supabase
            .from('user_mounts')
            .select('mount_id')
            .eq('user_id', currentUser.id);

        if (!userError && userMounts) {
            userMountCollection = new Set(userMounts.map(row => row.mount_id));
        }
    }

    if (!mountsCache) {
        const { data, error } = await supabase
            .from('mounts')
            .select(`
                *,
                patches (*),
                mount_sources (
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
        mountsCache = data;
    }

    setupMountFilterListeners();
    initModalListeners();
    renderMounts(mountsCache);
}

function setupMountFilterListeners() {
    const view = document.getElementById('mounts-view');
    if (!view || view.dataset.init === 'true') return;
    view.dataset.init = 'true';

    const filterBar = view.querySelector('.filter-bar');

    filterBar.querySelectorAll('.btn-star-unified').forEach(btn => {
        btn.addEventListener('click', () => {
            playMenuSound();
            const filterType = btn.dataset.filter;
            if (activeMountFilters.collection === filterType) {
                activeMountFilters.collection = null;
                btn.classList.remove('active');
            } else {
                activeMountFilters.collection = filterType;
                filterBar.querySelectorAll('.btn-star-unified').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            renderMounts(mountsCache);
        });
    });

    const patchContainer = filterBar.querySelector('.patch-filters');
    if (patchContainer) {
        patchContainer.querySelectorAll('.btn-patch-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                playMenuSound();
                const patchVer = btn.dataset.patch;
                if (activeMountFilters.patch === patchVer) {
                    activeMountFilters.patch = null;
                    btn.classList.remove('active');
                } else {
                    activeMountFilters.patch = patchVer;
                    patchContainer.querySelectorAll('.btn-patch-filter').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                renderMounts(mountsCache);
            });
        });
    }

    const searchInput = document.getElementById('mount-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeMountFilters.search = e.target.value.trim().toLowerCase();
            renderMounts(mountsCache);
        });
    }

    const resetBtn = document.getElementById('mount-filter-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            playMenuSound();
            activeMountFilters = { collection: null, patch: null, search: '' };
            if (searchInput) searchInput.value = '';
            filterBar.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
            renderMounts(mountsCache);
        });
    }

    const syncBtn = document.getElementById('btn-sync-mounts');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => syncMounts());
    }
}

export function renderMounts(data) {
    const list = document.getElementById('mounts-list');
    if (!list) return;
    list.innerHTML = '';

    let filteredData = data;
    if (activeMountFilters.collection || activeMountFilters.patch || activeMountFilters.search) {
        filteredData = data.filter(mount => {
            if (activeMountFilters.collection === 'collected') {
                if (!userMountCollection.has(mount.id)) return false;
            } else if (activeMountFilters.collection === 'missing') {
                if (userMountCollection.has(mount.id)) return false;
            }

            let pVer = '2.0';
            if (mount.patches && mount.patches.version) pVer = String(mount.patches.version);
            else if (mount.patch_id) pVer = String(mount.patch_id);

            if (activeMountFilters.patch) {
                if (!pVer.startsWith(activeMountFilters.patch)) return false;
            }

            if (activeMountFilters.search) {
                const name = (mount.name || '').toLowerCase();
                if (!name.includes(activeMountFilters.search)) return false;
            }
            return true;
        });
    }

    if (!filteredData || filteredData.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding: 2rem; color: #888;">Aucune monture ne correspond aux filtres.</p>';
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
    filteredData.forEach((mount, index) => {
        const row = createMountRow(mount, index, observer);
        fragment.appendChild(row);
    });
    list.appendChild(fragment);
}

function createMountRow(mount, index, observer) {
    let patchData = null;
    if (mount.patches && !Array.isArray(mount.patches)) { patchData = mount.patches; }
    else if (Array.isArray(mount.patches) && mount.patches.length > 0) { patchData = mount.patches[0]; }

    let patchVersion = '?';
    let patchMajor = '2';
    if (patchData && patchData.version) {
        patchVersion = patchData.version;
        patchMajor = String(patchVersion).charAt(0);
    } else if (mount.patch_id) {
        patchVersion = mount.patch_id;
        patchMajor = String(mount.patch_id).charAt(0);
    }

    const isCollected = userMountCollection.has(mount.id);
    const collectedClass = isCollected ? 'collected' : '';
    const unavailableClass = (mount.available === false) ? 'unavailable' : '';

    const row = document.createElement('div');
    row.className = `minion-row row-${patchMajor} ${collectedClass} ${unavailableClass}`;
    row.style.animationDelay = `${index * 0.05}s`;
    observer.observe(row);

    const iconUrl = mount.icon_mount_url || 'https://xivapi.com/i/000000/000405.png';
    const name = mount.name || 'Inconnu';
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
    const sourceIconsHtml = (mount.mount_sources || []).map(ms => {
        const s = ms.sources;
        if (!s) return '';
        if (ms.lodestone_url) return '';
        let tooltip = s.name;
        if (ms.details) tooltip += `: ${ms.details}`;
        const iconSrc = s.icon_source_url || '';
        if (s.name && (s.name.toLowerCase().includes('boutique') || s.name.toLowerCase().includes('cdjapan'))) {
            if (mount.shop_url) {
                shopIconRendered = true;
                return `<a href="${mount.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="${tooltip}"></i></a>`;
            }
        }
        if (iconSrc && !iconSrc.startsWith('http')) {
            return `<i class="${iconSrc} meta-icon-fa" title="${tooltip}"></i>`;
        }
        return '';
    }).join('');

    const standaloneShopHtml = (mount.shop_url && !shopIconRendered)
        ? `<a href="${mount.shop_url}" target="_blank" class="shop-link" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping meta-icon-fa" title="Acheter en ligne"></i></a>`
        : '';

    const acquisitionText = (mount.acquisition && sourceIconsHtml === '') ? `<i class="fa-solid fa-circle-info meta-icon-fa" title="${mount.acquisition}"></i>` : '';

    row.innerHTML = `
        <img src="${iconUrl}" class="minion-icon" alt="${name}">
        <div class="minion-info">
             <div style="margin-right:auto; display:flex; flex-direction:column; align-items:flex-start;">
                <span class="minion-name">
                        <span class="minion-name-link">${name}</span>
                        <button class="btn-sources-trigger" title="Infos & Sources"><i class="fa-solid fa-magnifying-glass"></i></button>
                        ${mount.hôtel_des_ventes ? '<i class="fa-solid fa-gavel meta-icon-fa" title="Disponible à l\'hôtel des ventes"></i>' : ''}
                        ${mount.malle_surprise ? '<i class="fa-solid fa-box-open meta-icon-fa" title="Disponible dans une malle-surprise"></i>' : ''}
                        ${sourceIconsHtml}
                        ${standaloneShopHtml}
                        ${sourceIconsHtml === '' && standaloneShopHtml === '' ? acquisitionText : ''}
                </span>
            </div>
        </div>
        <div class="minion-center-text" title="${mount.tooltip ? mount.tooltip.replace(/"/g, '&quot;') : ''}">
             ${mount.tooltip ? `<i class="fa-solid fa-quote-left quote-icon"></i> ${mount.tooltip} <i class="fa-solid fa-quote-right quote-icon"></i>` : ''} 
        </div>
        <div class="minion-meta">
            <div class="col-badge">${badgeHtml}</div>
            <div class="col-logo">${logoHtml}</div>
            <div class="btn-collect-container"></div> 
        </div>
    `;

    row.querySelector('.minion-name-link').addEventListener('click', () => {
        playMenuSound();
        window.location.href = `detail.html?type=mount&id=${mount.id}`;
    });

    row.querySelector('.btn-sources-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        playMenuSound();
        openModal(mount, patchData, 'mount');
    });

    const btnContainer = row.querySelector('.btn-collect-container');
    const btnCollect = document.createElement('button');
    btnCollect.className = isCollected ? 'btn-star-unified collected' : 'btn-star-unified';
    btnCollect.innerHTML = isCollected ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    btnCollect.addEventListener('click', async (e) => {
        e.stopPropagation();
        const wasCollected = row.classList.contains('collected');
        if (wasCollected) {
            userMountCollection.delete(mount.id);
            row.classList.remove('collected');
            btnCollect.classList.remove('collected');
            btnCollect.innerHTML = '<i class="fa-regular fa-star"></i>';
            playUncollectSound();
            await toggleMountCollection(mount.id, false);
        } else {
            userMountCollection.add(mount.id);
            row.classList.add('collected');
            btnCollect.classList.add('collected');
            btnCollect.innerHTML = '<i class="fa-solid fa-star"></i>';
            playCollectSound();
            await toggleMountCollection(mount.id, true);
        }
    });
    btnContainer.appendChild(btnCollect);

    return row;
}

async function toggleMountCollection(mountId, isCollected) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isCollected) {
        await supabase.from('user_mounts').insert([{ user_id: user.id, mount_id: mountId }]);
    } else {
        await supabase.from('user_mounts').delete().eq('user_id', user.id).eq('mount_id', mountId);
    }
}

// --- SYNC WITH FFXIV COLLECT ---
async function syncMounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Veuillez vous connecter pour synchroniser votre collection.");
        return;
    }

    const syncBtn = document.getElementById('btn-sync-mounts');
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
        console.log(`Syncing mounts for character ID: ${charId}`);

        // 2. Fetch from FFXIV Collect API
        const response = await fetch(`https://ffxivcollect.com/api/characters/${charId}/mounts/owned`);
        if (!response.ok) throw new Error("API FFXIV Collect Error");

        const ownedData = await response.json();
        const apiOwnedIds = new Set(ownedData.map(m => m.id));

        console.log(`API reports ${apiOwnedIds.size} mounts owned.`);

        // 3. Fetch Local Mount Map
        const { data: allMounts, error: mapError } = await supabase
            .from('mounts')
            .select('id, ffxiv_collect_id')
            .not('ffxiv_collect_id', 'is', null);

        if (mapError) throw mapError;

        const ffxivMap = new Map();
        allMounts.forEach(m => ffxivMap.set(m.ffxiv_collect_id, m.id));

        // 4. Find Missing Mounts
        const mountsToAdd = [];
        for (const apiId of apiOwnedIds) {
            const localDbId = ffxivMap.get(apiId);
            if (localDbId && !userMountCollection.has(localDbId)) {
                mountsToAdd.push({
                    user_id: user.id,
                    mount_id: localDbId
                });
            }
        }

        console.log(`Found ${mountsToAdd.length} new montures to add.`);

        if (mountsToAdd.length === 0) {
            alert("Votre collection est déjà à jour !");
        } else {
            // 5. Bulk Insert
            const { error: insertError } = await supabase
                .from('user_mounts')
                .insert(mountsToAdd);

            if (insertError) {
                console.error("Bulk insert error:", insertError);
                if (insertError.code === '23505') { // Unique violation
                    alert("Certaines montures étaient déjà en cours d'ajout. Veuillez rafraîchir.");
                } else {
                    throw insertError;
                }
            } else {
                mountsToAdd.forEach(item => userMountCollection.add(item.mount_id));
                renderMounts(mountsCache);
                alert(`Succès ! ${mountsToAdd.length} nouvelles montures ajoutées.`);
                try { playCollectSound(); } catch (e) { }
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
