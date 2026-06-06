import { initAudioListeners, startBgMusic, checkTransitionSounds } from '../audio.js';
import { initTheme } from '../theme.js';
import { requestPasswordReset } from '../auth.js';
import { injectCommonUI } from '../ui.js';

async function init() {
    injectCommonUI();
    initTheme();
    initAudioListeners();
    checkTransitionSounds();
    startBgMusic();

    const form = document.getElementById('forgot-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const msg = document.getElementById('form-msg');
        const btn = document.getElementById('submit-btn');

        msg.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Envoi...';

        const { error } = await requestPasswordReset(email);
        if (error) {
            // Logged for debugging, but we never reveal whether the email exists.
            console.error('Reset request error:', error);
        }

        // Generic message regardless of outcome (avoids account enumeration).
        msg.className = 'form-msg success';
        msg.textContent =
            "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.";
        msg.style.display = 'block';

        btn.disabled = false;
        btn.textContent = 'Envoyer le lien';
    });
}

init();
