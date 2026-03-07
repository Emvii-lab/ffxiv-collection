export function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');

    // Check Storage -> System Preference
    const savedTheme = localStorage.getItem('theme');
    let isDark = false;

    if (savedTheme) {
        isDark = (savedTheme === 'dark');
    } else {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    applyTheme(isDark);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newIsDark = (currentTheme !== 'dark');
            applyTheme(newIsDark);
        });
    }
}

export function applyTheme(isDark) {
    const root = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    const mainLogo = document.getElementById('main-logo');

    // Logos
    const logoLight = "https://res.cloudinary.com/dd4rdtrig/image/upload/v1765754698/ffxiv_logo_black_text_patch_7.0_pgijf1.png";
    const logoDark = "https://res.cloudinary.com/dd4rdtrig/image/upload/v1766244166/ffxiv_logo_white_text_patch_7.0_onh610.png";

    if (isDark) {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (mainLogo) mainLogo.src = logoDark;
    } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (mainLogo) mainLogo.src = logoLight;
    }
}
