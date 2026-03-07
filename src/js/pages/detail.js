import { supabase } from '../supabase.js';
import { injectCommonUI } from '../ui.js';
import { initTheme } from '../theme.js';
import { checkTransitionSounds, playMenuSound } from '../audio.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Core UI Init
    injectCommonUI();
    initTheme();
    checkTransitionSounds();

    // 2. Parse URL
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'minion';
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = 'accueil.html';
        return;
    }

    // 3. Back Button logic
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            playMenuSound();
            if (type === 'barding') window.location.href = 'bardings.html';
            else if (type === 'minion') window.location.href = 'minions.html';
            else window.location.href = 'mounts.html';
        });
    }

    // 4. Fetch Data
    await loadDetails(type, id);
});

async function loadDetails(type, id) {
    const table = type === 'barding' ? 'bardings' : (type === 'minion' ? 'minions' : 'mounts');
    const sourceTable = type === 'barding' ? 'barding_sources' : (type === 'minion' ? 'minion_sources' : 'mount_sources');
    const sourcesKey = type === 'barding' ? 'barding_sources' : (type === 'minion' ? 'minion_sources' : 'mount_sources');

    const { data: item, error } = await supabase
        .from(table)
        .select(`
            *,
            patches (*),
            ${sourceTable} (
                id,
                details,
                cost,
                lodestone_url,
                location,
                created_at,
                sources ( name, icon_source_url ),
                currencies ( name, icon_currency_url )
            )
        `)
        .eq('id', id)
        .single();

    if (error || !item) {
        console.error('Error fetching details:', error);
        return;
    }

    renderDetails(item, type, sourcesKey);
}

function renderDetails(item, type, sourcesKey) {
    document.title = `${item.name || 'Détails'} - Into The Mist`;

    const nameEl = document.getElementById('detail-name');
    const imgEl = document.getElementById('detail-img');
    const diaryEl = document.getElementById('detail-diary-text');
    const patchVerEl = document.getElementById('detail-patch-ver');
    const patchLogoEl = document.getElementById('detail-patch-logo');
    const sourcesList = document.getElementById('detail-sources');

    // Name & Theme
    if (nameEl) {
        nameEl.textContent = item.name || 'Inconnu';
        let pMajor = '2';
        if (item.patches && item.patches.version) pMajor = String(item.patches.version).charAt(0);
        else if (item.patch_id) pMajor = String(item.patch_id).charAt(0);

        nameEl.className = `text-patch-${pMajor}`;
        const detailView = document.getElementById('minion-detail-view');
        if (detailView) {
            detailView.className = `dashboard-content theme-patch-${pMajor}`;
        }
    }

    // Image
    if (imgEl) {
        imgEl.src = item.picture_barding_url || item.picture_minion_url || item.picture_mount_url || item.image_url || item.icon_barding_url || item.icon_minion_url || item.icon_mount_url || '';
        imgEl.alt = item.name || '';
    }

    // Diary / Description / Tooltip
    if (diaryEl) {
        diaryEl.textContent = item.diary || item.tooltip || item.description || "Aucune description disponible.";
    }

    // Patch info
    const patchData = Array.isArray(item.patches) ? item.patches[0] : item.patches;
    if (patchVerEl) {
        patchVerEl.textContent = patchData ? `Patch ${patchData.version}` : (item.patch_id ? `Patch ${item.patch_id}` : 'Patch inconnu');
    }
    if (patchLogoEl && patchData && patchData.logo_patch_url) {
        patchLogoEl.src = patchData.logo_patch_url;
        patchLogoEl.style.display = 'block';
    }

    // Sources
    if (sourcesList) {
        const sources = (item[sourcesKey] || []).sort((a, b) => (a.id || 0) - (b.id || 0));
        if (sources.length > 1) sourcesList.classList.add('has-multiple-sources');

        sources.forEach(ms => {
            const row = createSourceRow(ms, item);
            sourcesList.appendChild(row);
        });

        if (sources.length === 0 && item.acquisition) {
            sourcesList.innerHTML = `<div class="source-item-row"><span class="source-name-title">${item.acquisition}</span></div>`;
        }
    }
}

function createSourceRow(ms, item) {
    const s = ms.sources;
    const c = ms.currencies;
    if (!s) return document.createElement('div');

    const div = document.createElement('div');
    div.className = 'source-item-row';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    let iconUrl = s.icon_source_url || '';
    if (s.name === 'CDJapan' && isDark) iconUrl = 'https://res.cloudinary.com/dd4rdtrig/image/upload/v1766262130/cdjapan_logo_blanc_vrpgph.png';
    if (s.name === 'Square Enix Boutique' && isDark) iconUrl = 'https://res.cloudinary.com/dd4rdtrig/image/upload/v1765935529/square_enix_boutique_blanc_mbqtdy.webp';

    const iconHtml = iconUrl.startsWith('http')
        ? `<img src="${iconUrl}" class="source-icon-large">`
        : `<i class="${iconUrl} source-icon-fa-large"></i>`;

    let costHtml = '';
    if (ms.cost) {
        let currencyIcon = '';
        if (c && c.icon_currency_url) {
            const iconVal = c.icon_currency_url;
            currencyIcon = (iconVal.startsWith('http') || iconVal.startsWith('/'))
                ? `<img src="${iconVal}" class="currency-icon-small" alt="${c.name || ''}">`
                : `<span class="currency-text">${iconVal}</span>`;
        } else if (c && c.name) {
            currencyIcon = `<span class="currency-text">${c.name}</span>`;
        }

        let useDecimals = false;
        if (s.name.match(/boutique|mog|station|store/i) || (c && c.icon_currency_url && !c.icon_currency_url.startsWith('http'))) {
            useDecimals = true;
        }

        const costStr = ms.cost.toLocaleString('fr-FR', useDecimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {});
        costHtml = `<span class="source-cost badge-cost">${costStr} ${currencyIcon}</span>`;
    }

    let sourceTitle = `<span class="source-name-title">${s.name}</span>`;
    if (ms.lodestone_url) {
        sourceTitle = `<a href="${ms.lodestone_url}" class="eorzeadb_link source-name-title" target="_blank">${s.name}</a>`;
    }

    // Reputation Rank
    let repHtml = '';
    if (item.reputation_rank) {
        repHtml = `<span class="source-extra-info" style="display:block;"><i class="fa-solid fa-medal"></i> ${item.reputation_rank}</span>`;
    }

    div.innerHTML = `
        <div class="source-left">
            ${iconHtml}
            <div class="source-details section-column">
                ${sourceTitle}
                ${ms.details ? `<span class="source-extra-info">${ms.details}</span>` : ''}
                ${ms.location ? `<span class="source-extra-info" style="display:block;"><i class="fa-solid fa-map-pin"></i> ${ms.location}</span>` : ''}
                ${repHtml}
            </div>
        </div>
        <div class="source-right">
            ${costHtml}
        </div>
    `;

    if (s.name === 'Boutique' && item.shop_url) {
        div.style.cursor = 'pointer';
        div.onclick = () => window.open(item.shop_url, '_blank');
    }

    return div;
}
