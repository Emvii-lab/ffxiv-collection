import { initAudioListeners, checkTransitionSounds } from '../audio.js';
import { initTheme } from '../theme.js';
import { updatePassword } from '../auth.js';
import { supabase } from '../supabase.js';
import { injectCommonUI } from '../ui.js';

const MIN_PASSWORD_LENGTH = 8;

async function init() {
    injectCommonUI();
    initTheme();
    initAudioListeners();
    checkTransitionSounds();

    const form = document.getElementById('reset-form');
    const msg = document.getElementById('form-msg');
    if (!form) return;

    const showMessage = (text, type) => {
        msg.className = `form-msg ${type}`;
        msg.textContent = text;
        msg.style.display = 'block';
    };

    // Supabase automatically parses the recovery token from the URL and
    // establishes a temporary session (detectSessionInUrl is on by default).
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        showMessage(
            'Lien invalide ou expiré. Veuillez redemander un email de réinitialisation.',
            'error'
        );
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pw = document.getElementById('password').value;
        const pw2 = document.getElementById('password-confirm').value;
        const btn = document.getElementById('submit-btn');

        msg.style.display = 'none';

        if (pw.length < MIN_PASSWORD_LENGTH) {
            showMessage(
                `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
                'error'
            );
            return;
        }
        if (pw !== pw2) {
            showMessage('Les deux mots de passe ne correspondent pas.', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Mise à jour...';

        const { error } = await updatePassword(pw);
        if (error) {
            console.error('Password update error:', error);
            showMessage(
                'Erreur : ' + error.message + ' Le lien a peut-être expiré, redemandez-en un.',
                'error'
            );
            btn.disabled = false;
            btn.textContent = 'Réinitialiser';
            return;
        }

        showMessage('Mot de passe mis à jour ! Redirection vers la connexion...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    });
}

init();
