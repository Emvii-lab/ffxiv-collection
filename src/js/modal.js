export function openModal(item, patchData, itemType = 'minion') {
    const modal = document.getElementById('details-modal');
    if (!modal) return;

    const list = document.getElementById('modal-sources-list');
    list.innerHTML = '';

    const sourcesKey = itemType === 'barding' ? 'barding_sources' : (itemType === 'minion' ? 'minion_sources' : 'mount_sources');
    const sources = (item[sourcesKey] || []).sort((a, b) => (a.id || 0) - (b.id || 0));

    if (sources.length === 0 && item.acquisition) {
        list.innerHTML = `
            <div class="source-item">
                <i class="fa-solid fa-circle-info source-icon-fa-large"></i>
                <div class="source-details">
                    <span class="source-name">Autre</span>
                    <span class="source-extra">${item.acquisition}</span>
                </div>
            </div>
        `;
    }

    if (sources && sources.length > 1) {
        list.classList.add('has-multiple-sources');
    } else {
        list.classList.remove('has-multiple-sources');
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    sources.forEach(ms => {
        const s = ms.sources;
        const c = ms.currencies;
        if (!s) return;

        let iconUrl = s.icon_source_url || '';
        if (s.name === 'CDJapan' && isDark) {
            iconUrl = 'https://res.cloudinary.com/dd4rdtrig/image/upload/v1766262130/cdjapan_logo_blanc_vrpgph.png';
        }
        if (s.name === 'Square Enix Boutique' && isDark) {
            iconUrl = 'https://res.cloudinary.com/dd4rdtrig/image/upload/v1765935529/square_enix_boutique_blanc_mbqtdy.webp';
        }

        const isImg = iconUrl.startsWith('http');
        const iconHtml = isImg
            ? `<img src="${iconUrl}" class="source-icon-large">`
            : `<i class="${iconUrl} source-icon-fa-large"></i>`;

        let costHtml = '';
        if (ms.cost && ms.cost > 0) {
            const currencyVal = (c && c.icon_currency_url) ? c.icon_currency_url : '';
            let currencyHtml = '';
            if (currencyVal.startsWith('http')) {
                currencyHtml = `<img src="${currencyVal}" class="currency-icon-img" title="${c ? c.name : ''}">`;
            } else if (currencyVal.startsWith('fa-')) {
                currencyHtml = `<i class="${currencyVal} currency-icon-fa"></i>`;
            } else {
                currencyHtml = `<span class="currency-symbol">${currencyVal}</span>`;
            }

            const formattedCost = (currencyVal === '€' || (c && c.name === 'Euro'))
                ? ms.cost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : ms.cost.toLocaleString('fr-FR');

            costHtml = `
                <div class="source-cost">
                    <span class="cost-value">${formattedCost}</span>
                    ${currencyHtml}
                </div>
            `;
        }

        const div = document.createElement('div');
        div.className = 'source-item';

        let sourceTitleHtml = `<span class="source-title">${s.name}</span>`;
        let sourceDetailsHtml = ms.details ? `<span class="source-details">${ms.details}</span>` : '';

        if (ms.lodestone_url && ms.lodestone_url.trim() !== '') {
            if (ms.details && ms.details.trim() !== '') {
                sourceDetailsHtml = `<a href="${ms.lodestone_url}" class="eorzeadb_link source-details" target="_blank">${ms.details}</a>`;
            } else {
                sourceTitleHtml = `<a href="${ms.lodestone_url}" class="eorzeadb_link source-title" target="_blank">${s.name}</a>`;
            }
        }

        div.innerHTML = `
            ${iconHtml}
            <div class="source-info">
                ${sourceTitleHtml}
                ${sourceDetailsHtml}
                ${ms.location ? `<span class="location-link-container" style="font-weight:bold; font-size:0.85rem;">${ms.location}</span>` : ''}
                ${item.reputation_rank ? `<span style="font-size:0.85rem;">${item.reputation_rank}</span>` : ''}
            </div>
            ${costHtml}
        `;

        if (s.name === 'Boutique' && item.shop_url) {
            div.style.cursor = 'pointer';
            div.onclick = () => window.open(item.shop_url, '_blank');
            div.title = "Ouvrir la boutique";
        }

        list.appendChild(div);
    });

    modal.classList.remove('hidden');
}

export function initModalListeners() {
    const closeBtn = document.getElementById('modal-close');
    const modal = document.getElementById('details-modal');

    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.classList.add('hidden');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }
}
