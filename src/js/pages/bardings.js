import { requireAuth, logout } from '../auth.js';
import { initTheme } from '../theme.js';
import { injectCommonUI } from '../ui.js';
import { initAudioListeners, checkTransitionSounds } from '../audio.js';
import { loadBardings } from '../bardings.js';

async function init() {
    console.log('Bardings init starting...');

    // 1. UI & Audio (Immediate)
    injectCommonUI();
    initTheme();
    initAudioListeners();
    checkTransitionSounds();

    // 2. Auth (Async)
    const session = await requireAuth();
    if (!session) return;

    // 3. Listeners
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // 4. Load Data
    loadBardings(session.user);
}

console.log('Bardings script loading...');
init();
