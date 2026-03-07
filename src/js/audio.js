export const audioState = {
    bgMusic: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756518/003_Prelude_Discoveries_ofr2of.mp3'),
    loginSound: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756726/FFXIV_Start_Game_hclxwe.mp3'),
    menuSound: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756639/FFXIV_Confirm_k4wbeb.mp3'),
    logoutSound: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756694/FFXIV_Log_Out_vsa9ro.mp3'),
    collectSound: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756662/FFXIV_Incoming_Tell_3_ait6dd.mp3'),
    uncollectSound: new Audio('https://res.cloudinary.com/dd4rdtrig/video/upload/v1765756644/FFXIV_Error_gvhk41.mp3'),
    isPlaying: false,
    userInteracted: false,
    isTransitioning: false,
    isManualStop: localStorage.getItem('audioManualStop') === 'true'
};

// Initial Volumes & Loop
audioState.bgMusic.loop = true;
audioState.bgMusic.volume = 0.5;
audioState.loginSound.volume = 0.6;
audioState.menuSound.volume = 0.6;
audioState.logoutSound.volume = 0.6;
audioState.collectSound.volume = 0.5;
audioState.uncollectSound.volume = 0.5;

export function initAudioListeners() {
    const btn = document.getElementById('audio-toggle');
    if (btn) {
        btn.addEventListener('click', () => {
            playMenuSound();
            if (audioState.isPlaying) {
                stopBgMusic();
            } else {
                startBgMusic(true);
            }
        });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => playMenuSound());
    }

    // Global interaction listener for autoplay
    const handleFirstInteraction = () => {
        audioState.userInteracted = true;
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);

        // Check if we should start music (Login page only)
        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        if (isLoginPage && !audioState.isManualStop && !audioState.isPlaying && !audioState.isTransitioning) {
            // Only auto-start if no logout jingle is pending or once it ends
            if (localStorage.getItem('pendingLogoutSound') !== 'true') {
                startBgMusic();
            }
        }
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
}

export function startBgMusic(force = false) {
    // Only on Login page
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    if (!isLoginPage && !force) return;

    if (audioState.isPlaying || audioState.isTransitioning) return;
    if (audioState.isManualStop && !force) return;

    audioState.isManualStop = false;
    localStorage.setItem('audioManualStop', 'false');

    const playPromise = audioState.bgMusic.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            audioState.isPlaying = true;
            updateAudioIcon(true);
        }).catch(error => {
            console.log("Autoplay blocked. Waiting for interaction.");
            audioState.isPlaying = false;
            updateAudioIcon(false);
        });
    }
}

export function stopBgMusic(isManual = true) {
    audioState.bgMusic.pause();
    audioState.isPlaying = false;
    if (isManual) {
        audioState.isManualStop = true;
        localStorage.setItem('audioManualStop', 'true');
    }
    updateAudioIcon(false);
}

export function updateAudioIcon(isPlaying) {
    const icon = document.getElementById('audio-icon');
    if (icon) icon.textContent = isPlaying ? '🔊' : '🔇';
}

/**
 * Checks for sounds that should play after a redirect
 */
export function checkTransitionSounds() {
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

    // Login Sound (on Dashboard)
    if (!isLoginPage && localStorage.getItem('pendingLoginSound') === 'true') {
        localStorage.removeItem('pendingLoginSound');
        audioState.loginSound.play().catch(e => console.log("Login sound blocked", e));
    }

    // Logout Sound (on Login page)
    if (isLoginPage && localStorage.getItem('pendingLogoutSound') === 'true') {
        localStorage.removeItem('pendingLogoutSound');
        audioState.isTransitioning = true;
        // Stop music if it started somehow
        stopBgMusic(false);

        audioState.logoutSound.play().then(() => {
            // Once logout sound ends, start bgMusic
            audioState.logoutSound.addEventListener('ended', () => {
                audioState.isTransitioning = false;
                if (!audioState.isManualStop) startBgMusic();
            }, { once: true });
        }).catch(e => {
            console.log("Logout sound blocked", e);
            audioState.isTransitioning = false;
            if (!audioState.isManualStop) startBgMusic();
        });
    }

    // Menu Sound (on any page)
    if (localStorage.getItem('pendingMenuSound') === 'true') {
        localStorage.removeItem('pendingMenuSound');
        playMenuSound();
    }
}

export function playMenuSound() {
    audioState.menuSound.currentTime = 0;
    audioState.menuSound.play().catch(() => { });
}

export function playCollectSound() {
    audioState.collectSound.currentTime = 0;
    audioState.collectSound.play().catch(() => { });
}

export function playUncollectSound() {
    audioState.uncollectSound.currentTime = 0;
    audioState.uncollectSound.play().catch(() => { });
}
