

import { supabase } from '../supabase.js';

const formRegistro = document.getElementById('form-registro');

// Función para mostrar y ocultar contraseñas
window.mostrarPassword = function(id, boton) {
    const campo = document.getElementById(id);

    if (campo.type === 'password') {
        campo.type = 'text';
        boton.textContent = 'Ocultar';
    } else {
        campo.type = 'password';
        boton.textContent = 'Ver';
    }
};

if (formRegistro) {

    formRegistro.addEventListener('submit', async (e) => {

        e.preventDefault();

        const nombre = document.getElementById('reg-nombre').value.trim();
        const usuario = document.getElementById('reg-usuario').value.trim();
        const correo = document.getElementById('reg-correo').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmarPassword = document.getElementById('reg-confirm-password').value;

        // Validar contraseñas
      
        const mensajePassword = document.getElementById('mensaje-password');

         // Validar que las contraseñas coincidan
        if (password !== confirmarPassword) {
          mensajePassword.textContent = '⚠ Las contraseñas no coinciden';
          return;
        }

         // Limpiar mensaje si coinciden
        mensajePassword.textContent = '';

         // Validar longitud
        if (password.length < 6) {
          mensajePassword.textContent = '⚠ La contraseña debe tener al menos 6 caracteres';
         return;
      }
        try {

            // Registrar usuario en Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: correo,
                password: password,
                options: {
                    data: {
                        nombre_completo: nombre,
                        nombre_usuario: usuario
                    }
                }
            });

            console.log('DATOS:', data);
            console.log('ERROR:', error);

            if (error) {
                alert(error.message);
                return;
            }

            if (!data.user) {
                alert('No se pudo crear el usuario');
                return;
            }

            // El trigger de Supabase guarda automáticamente el perfil

            alert('Registro realizado correctamente. Revisa tu correo si necesitas confirmar la cuenta.');

            window.location.href = 'login.html';

        } catch (error) {

            console.error(error);
            alert('Ocurrió un error: ' + error.message);

        }

    });

}
