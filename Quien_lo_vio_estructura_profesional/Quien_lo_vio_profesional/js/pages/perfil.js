
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // Proteger la página
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    // Obtener usuario autenticado
    const { data: usuarioData, error: errorUsuario } =
        await supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) {
        alert('No se pudo obtener la información del usuario.');
        return;
    }

    const usuario = usuarioData.user;

    // Elementos HTML
    const formulario = document.getElementById('form-perfil');
    const nombre = document.getElementById('nombre-completo');
    const correo = document.getElementById('correo-electronico');
    const telefono = document.getElementById('telefono');
    const ubicacion = document.getElementById('ubicacion');
    const foto = document.getElementById('foto-perfil');

    const nombrePerfil = document.getElementById('nombre-perfil');
    const correoPerfil = document.getElementById('correo-perfil');
    const fotoActual = document.getElementById('foto-perfil-actual');
    const iconoPerfil = document.getElementById('icono-perfil');

    const botonCerrar = document.getElementById('cerrar-sesion');

    // Cargar datos desde Supabase
    async function cargarPerfil() {

        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', usuario.id)
            .single();

        if (error) {
            console.error(error);
            alert('No se pudo cargar tu perfil.');
            return;
        }

        nombre.value = data.nombre_completo || '';
        correo.value = usuario.email || '';
        telefono.value = data.telefono || '';
        ubicacion.value = data.ubicacion || '';

        nombrePerfil.textContent = data.nombre_completo || 'Usuario';
        correoPerfil.textContent = usuario.email || '';

        if (data.foto_perfil) {
            fotoActual.src = data.foto_perfil;
            fotoActual.hidden = false;
            iconoPerfil.hidden = true;
        }
    }

    await cargarPerfil();

    // Vista previa de la fotografía
    foto.addEventListener('change', () => {
        const archivo = foto.files[0];

        if (!archivo) return;

        if (!archivo.type.startsWith('image/')) {
            alert('Selecciona una imagen válida.');
            foto.value = '';
            return;
        }

        if (archivo.size > 5 * 1024 * 1024) {
            alert('La fotografía no debe superar los 5 MB.');
            foto.value = '';
            return;
        }

        fotoActual.src = URL.createObjectURL(archivo);
        fotoActual.hidden = false;
        iconoPerfil.hidden = true;
    });

    // Guardar cambios
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const boton = formulario.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.textContent = 'Guardando...';

        try {
            let urlFoto = null;

            // Subir foto si el usuario seleccionó una
            if (foto.files.length > 0) {
                const archivo = foto.files[0];

                const extension = archivo.name.split('.').pop().toLowerCase();
                const nombreArchivo =
                    `perfiles/${usuario.id}/${crypto.randomUUID()}.${extension}`;

                const { error: errorSubida } = await supabase.storage
                    .from('imagenes-objetos')
                    .upload(nombreArchivo, archivo, {
                        contentType: archivo.type,
                        upsert: false
                    });

                if (errorSubida) throw errorSubida;

                const { data: urlData } = supabase.storage
                    .from('imagenes-objetos')
                    .getPublicUrl(nombreArchivo);

                urlFoto = urlData.publicUrl;
            }

            const cambios = {
                nombre_completo: nombre.value.trim(),
                telefono: telefono.value.trim(),
                ubicacion: ubicacion.value.trim()
            };

            if (urlFoto) {
                cambios.foto_perfil = urlFoto;
            }

            const { error } = await supabase
                .from('usuarios')
                .update(cambios)
                .eq('id', usuario.id);

            if (error) throw error;

            nombrePerfil.textContent = cambios.nombre_completo || 'Usuario';
            correoPerfil.textContent = usuario.email;

            alert('¡Tu perfil se actualizó correctamente!');

            foto.value = '';

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            alert('No se pudieron guardar los cambios: ' + error.message);

        } finally {
            boton.disabled = false;
            boton.textContent = 'Guardar cambios';
        }
    });

// Cerrar sesión
document.addEventListener('click', async (e) => {

    const boton = e.target.closest('#cerrar-sesion');

    if (!boton) return;

    e.preventDefault();

    const confirmar = confirm('¿Deseas cerrar tu sesión?');

    if (!confirmar) return;

    try {
        boton.textContent = 'Cerrando sesión...';

        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        window.location.href = './login.html';

    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('No se pudo cerrar la sesión: ' + error.message);
        boton.textContent = 'Cerrar sesión';
    }

});
   
   

});
