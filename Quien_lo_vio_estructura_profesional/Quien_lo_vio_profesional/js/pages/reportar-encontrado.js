
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // PROTEGER LA PÁGINA
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    const form = document.getElementById('formulario-encontrado');

    if (!form) return;

    // OBTENER USUARIO
    const { data: usuarioData, error: errorUsuario } =
        await supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) {
        alert('Debes iniciar sesión para reportar un objeto.');
        return;
    }

    const usuario = usuarioData.user;

    // CAMPOS DEL FORMULARIO
    const nombreObjeto = document.getElementById('nombre-objeto');
    const categoria = document.getElementById('categoria');
    const color = document.getElementById('color');
    const marca = document.getElementById('marca');
    const lugar = document.getElementById('lugar-encontrado');
    const fecha = document.getElementById('fecha-encontrado');
    const hora = document.getElementById('hora-encontrado');
    const descripcion = document.getElementById('descripcion');
    const fotografia = document.getElementById('imagen');

    const boton = form.querySelector('button[type="submit"]');

    // VERIFICAR CAMPOS
    if (
        !nombreObjeto || !categoria || !color || !marca ||
        !lugar || !fecha || !hora || !descripcion || !fotografia
    ) {
        alert('No se encontraron todos los campos del formulario.');
        return;
    }

    // ENVIAR REPORTE
    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        const archivo = fotografia.files[0];

        if (!archivo) {
            alert('Debes seleccionar una fotografía.');
            return;
        }

        if (!archivo.type.startsWith('image/')) {
            alert('El archivo seleccionado debe ser una imagen.');
            return;
        }

        if (archivo.size > 5 * 1024 * 1024) {
            alert('La fotografía no puede superar los 5 MB.');
            return;
        }

        try {

            if (boton) {
                boton.disabled = true;
                boton.textContent = 'Guardando reporte...';
            }

            // SUBIR FOTOGRAFÍA A SUPABASE STORAGE
            const extension = archivo.name.split('.').pop();

            const nombreArchivo =
                `encontrados/${usuario.id}/${crypto.randomUUID()}.${extension}`;

            const { error: errorImagen } = await supabase.storage
                .from('imagenes-objetos')
                .upload(nombreArchivo, archivo);

            if (errorImagen) {
                throw errorImagen;
            }

            // OBTENER URL PÚBLICA
            const { data: urlImagen } = supabase.storage
                .from('imagenes-objetos')
                .getPublicUrl(nombreArchivo);

            // GUARDAR INFORMACIÓN EN SUPABASE
            const { error: errorRegistro } = await supabase
                .from('objetos_encontrados')
                .insert({

                    usuario_id: usuario.id,

                    nombre_objeto: nombreObjeto.value.trim(),

                    categoria: categoria.value,

                    color: color.value.trim(),

                    marca: marca.value.trim(),

                    lugar_encontrado: lugar.value.trim(),

                    fecha_encontrado: fecha.value,

                    hora_encontrado: hora.value || null,

                    descripcion: descripcion.value.trim(),

                    imagen_url: urlImagen.publicUrl,

                    estado: 'activo'

                });

            if (errorRegistro) {
                throw errorRegistro;
            }

            alert('¡Objeto encontrado registrado correctamente!');

            form.reset();

            window.location.href = 'inicio.html';

        } catch (error) {

            console.error('Error al registrar objeto encontrado:', error);

            alert('No se pudo registrar el objeto: ' + error.message);

        } finally {

            if (boton) {
                boton.disabled = false;
                boton.textContent = 'Enviar reporte';
            }
        }
    });

});
