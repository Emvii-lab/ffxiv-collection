import { supabase } from './supabase.js';

export let currentUser = null;

export async function initAuth(onAuthStateChange) {
    const { data: { session } } = await supabase.auth.getSession();

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
        password
    });

    if (!error) {
        localStorage.setItem('pendingLoginSound', 'true');
    }

    return { data, error };
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
    return session;
}
