import { DEFAULT_NAV_ITEMS } from './constants.js';
import { playMenuSound } from './audio.js';

export function injectCommonUI() {
    // Inject Banner
    const bannerContainer = document.querySelector('.banner-container');
    if (bannerContainer && !bannerContainer.hasChildNodes()) {
        bannerContainer.innerHTML = `
            <div class="logo-circle logo-corner">
                <img id="main-logo"
                    src="https://res.cloudinary.com/dd4rdtrig/image/upload/v1765754698/ffxiv_logo_black_text_patch_7.0_pgijf1.png"
                    alt="Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
            </div>
        `;
    }

    // Inject Toggles if missing
    if (!document.getElementById('audio-toggle')) {
        const audioBtn = document.createElement('button');
        audioBtn.id = 'audio-toggle';
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '<span id="audio-icon">🔇</span>';
        document.body.appendChild(audioBtn);
    }
    if (!document.getElementById('theme-toggle')) {
        const themeBtn = document.createElement('button');
        themeBtn.id = 'theme-toggle';
        themeBtn.className = 'theme-btn';
        themeBtn.innerHTML = '<span id="theme-icon">🌙</span>';
        document.body.appendChild(themeBtn);
    }

    // Inject Nav
    const navContainer = document.querySelector('.main-nav');
    if (navContainer && !navContainer.hasChildNodes()) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navList = DEFAULT_NAV_ITEMS.map(item => `
            <li><a href="${item.url}" class="nav-link ${currentPage === item.url ? 'active' : ''}">${item.label}</a></li>
        `).join('');

        navContainer.innerHTML = `
            <ul class="nav-list">
                ${navList}
                <li><button id="logout-btn" class="btn-logout" title="Se déconnecter">
                        <img src="https://ffxiv.gamerescape.com/w/images/2/2b/Player2_Icon.png" alt="Logout"
                            class="logout-icon">
                    </button></li>
            </ul>
        `;

        // Add menu sound to nav links
        navContainer.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                localStorage.setItem('pendingMenuSound', 'true');
            });
        });
    }
}

export function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<p style="text-align:center; padding:2rem;">Chargement...</p>';
}
