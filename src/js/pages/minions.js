import { requireAuth, logout } from '../auth.js';
import { initTheme } from '../theme.js';
import { injectCommonUI } from '../ui.js';
import { loadMinions } from '../minions.js';
import { initAudioListeners, checkTransitionSounds } from '../audio.js';

async function init() {
    console.log('Minions init starting...');

    // 1. UI & Audio (Immediate)
    injectCommonUI();
    initTheme();
    initAudioListeners();
    checkTransitionSounds();

    // 2. Auth (Async)
    const session = await requireAuth();
    if (!session) return;

    // 3. Listeners & Data
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    loadMinions(session.user);
}

console.log('Minions page script loading...');
init();
