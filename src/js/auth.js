import { supabase } from './supabase.js';

export let currentUser = null;

export async function initAuth(onAuthStateChange) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session) {
        currentUser = session.user;
    }

    onAuthStateChange(session);

    supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session ? session.user : null;
        onAuthStateChange(session);
    });
}

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (!error) {
        localStorage.setItem('pendingLoginSound', 'true');
    }

    return { data, error };
}

/**
 * Sends a password-reset email. The link in the email points to
 * reset-password.html, where the user sets a new password.
 */
export async function requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}/reset-password.html`;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

/**
 * Updates the password of the currently-authenticated (recovery) session.
 */
export async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
}

export async function logout() {
    await supabase.auth.signOut();
    localStorage.setItem('pendingLogoutSound', 'true');
    window.location.href = 'index.html';
}

/**
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
    return session;
}

/**
 * Returns the authenticated user (or null) without redirecting.
 * Useful for UI that adapts to login state.
 */
export async function getSessionUser() {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session ? session.user : null;
}
