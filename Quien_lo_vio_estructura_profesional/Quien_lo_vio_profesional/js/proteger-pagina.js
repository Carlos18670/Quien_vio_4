
import { supabase } from './supabase.js';

export async function protegerPagina() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.href = 'login.html';
        return false;
    }

    console.log('Sesión activa:', data.session.user.email);

    return true;
}
