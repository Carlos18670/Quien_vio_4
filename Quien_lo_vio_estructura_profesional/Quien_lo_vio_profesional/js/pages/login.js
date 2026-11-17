
import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {

    const formLogin = document.getElementById('form-login');

    if (!formLogin) {
        console.error('No se encontró el formulario form-login');
        return;
    }

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const identificador = document
            .getElementById('login-identificador').value.trim();

        const password = document
            .getElementById('login-password').value;

        if (!identificador || !password) {
            alert('Completa todos los campos');
            return;
        }

        try {

            let correo = identificador;

            // Buscar correo si escribió username
            if (!identificador.includes('@')) {

                const { data: usuarioData, error: usuarioError } =
                    await supabase
                        .from('usuarios')
                        .select('correo')
                        .eq('nombre_usuario', identificador)
                        .maybeSingle();

                if (usuarioError) {
                    console.error(usuarioError);
                    alert('Error al buscar el usuario en Supabase');
                    return;
                }

                if (!usuarioData) {
                    alert('El nombre de usuario no existe');
                    return;
                }

                correo = usuarioData.correo;
            }

            // Validar inicio de sesión
            const { data, error } = await supabase.auth.signInWithPassword({
                email: correo,
                password: password
            });

            if (error) {
                console.error(error);
                alert('Correo o contraseña incorrectos');
                return;
            }

            alert('¡Inicio de sesión exitoso!');

            window.location.href = 'inicio.html';

        } catch (error) {

            console.error('ERROR:', error);
            alert('Ocurrió un error: ' + error.message);

        }

    });

});
