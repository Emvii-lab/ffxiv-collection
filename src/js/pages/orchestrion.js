import { requireAuth, logout } from '../auth.js';
import { initTheme } from '../theme.js';
import { injectCommonUI } from '../ui.js';
import { initAudioListeners, checkTransitionSounds } from '../audio.js';

async function init() {
    console.log('Orchestrion init starting...');

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
}

console.log('Orchestrion script loading...');
init();
