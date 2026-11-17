
import { supabase } from '../supabase.js';

import { protegerPagina } from '../proteger-pagina.js';

const accesoPermitido = await protegerPagina();

if (!accesoPermitido) {
    throw new Error('Debes iniciar sesión para entrar.');
}

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('form-perdido');

    if (!form) {
        console.error('No se encontró el formulario');
        return;
    }

    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        try {

            // 1. Obtener usuario que inició sesión
            const {
                data: { user },
                error: errorUsuario
            } = await supabase.auth.getUser();

               console.log('Usuario conectado:', user);
               console.log('ID del usuario:', user?.id);

            if (errorUsuario || !user) {
                alert('Debes iniciar sesión para reportar un objeto.');
                window.location.href = 'login.html';
                return;
            }

            // 2. Obtener datos del formulario
            const datos = new FormData(form);

            const nombre = datos.get('nombre_objeto');
            const categoria = datos.get('categoria');
            const color = datos.get('color');
            const marca = datos.get('marca');
            const lugar = datos.get('lugar_perdida');
            const fecha = datos.get('fecha_perdida');
            const hora = datos.get('hora_perdida');
            const descripcion = datos.get('descripcion');
            const fotografia = datos.get('fotografia');

            // 3. Subir fotografía a Supabase Storage
            const extension = fotografia.name.split('.').pop();
            const nombreArchivo =
                `${user.id}/${crypto.randomUUID()}.${extension}`;

            const { error: errorImagen } = await supabase
                .storage
                .from('imagenes-objetos')
                .upload(nombreArchivo, fotografia, {
                    contentType: fotografia.type
                });

            if (errorImagen) {
                throw errorImagen;
            }

            // 4. Obtener dirección de la fotografía
            const { data: imagenData } = supabase
                .storage
                .from('imagenes-objetos')
                .getPublicUrl(nombreArchivo);

            const imagenUrl = imagenData.publicUrl;

            // 5. Guardar información en la tabla
            const { error: errorReporte } = await supabase
                .from('objetos_perdidos')
                .insert({
                    usuario_id: user.id,
                    nombre_objeto: nombre,
                    categoria: categoria,
                    color: color,
                    marca: marca,
                    lugar_perdida: lugar,
                    fecha_perdida: fecha,
                    hora_perdida: hora || null,
                    descripcion: descripcion,
                    imagen_url: imagenUrl
                });

            if (errorReporte) {
                throw errorReporte;
            }

            alert('¡Objeto perdido registrado correctamente!');

            form.reset();

            // Redirigir al inicio
            window.location.href = 'inicio.html';

        } catch (error) {

            console.error('Error al registrar:', error);

            alert('No se pudo registrar el objeto: ' + error.message);

        }

    });

});
