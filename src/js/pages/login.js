import { supabase } from '../supabase.js';
import { initAudioListeners, startBgMusic, checkTransitionSounds } from '../audio.js';
import { initTheme } from '../theme.js';
import { login } from '../auth.js';
import { isTooClose } from '../utils.js';
import { injectCommonUI } from '../ui.js';

async function init() {
    console.log('Login init starting...');

    // 1. Core UI & Theme (Immediate)
    injectCommonUI();
    initTheme();
    initAudioListeners();

    // 2. Audio Latency Optimization (Immediate)
    checkTransitionSounds();

    // 3. Background Data / Session (Async)
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData && sessionData.session) {
            window.location.href = 'accueil.html';
            return;
        }
    } catch (e) {
        console.error('Supabase session check failed:', e);
    }

    startBgMusic();
    fetchSprites();

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const submitBtn = document.getElementById('login-btn');

            errorMsg.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Connexion...';

            const { error } = await login(email, password);

            if (error) {
                errorMsg.textContent = "Erreur : " + error.message;
                errorMsg.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Se connecter';
            } else {
                window.location.href = 'accueil.html';
            }
        });
    }
}

async function fetchSprites() {
    const container = document.getElementById('supabase-data');
    if (!container) return;
    const { data, error } = await supabase.from('sprites').select('*');
    if (error || !data) return;

    const placedPositions = [];
    data.forEach((spriteData) => {
        const sprite = document.createElement('div');
        sprite.className = 'floating-sprite';
        const url = spriteData.icon_sprite_url;
        if (!url) return;
        sprite.style.backgroundImage = `url('${url}')`;

        for (let attempt = 0; attempt < 50; attempt++) {
            const cx = Math.random() * 90 + 2;
            const cy = Math.random() * 55 + 35;
            if (cx > 28 && cx < 72) continue;
            if (isTooClose(cx, cy, placedPositions)) continue;
            sprite.style.left = `${cx}%`;
            sprite.style.top = `${cy}%`;
            container.appendChild(sprite);
            placedPositions.push({ x: cx, y: cy });
            break;
        }
    });
}

console.log('Login script loading...');
init();
