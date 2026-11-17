
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

const accesoPermitido = await protegerPagina();

if (!accesoPermitido) {
    throw new Error('Debes iniciar sesión para entrar.');
}

let usuarioActual = null;
let conversacionActual = null;
let personaActual = null;
let intervaloMensajes = null;
let cargandoMensajes = false;

document.addEventListener('DOMContentLoaded', async () => {

    const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser();

    if (usuarioError || !usuarioData.user) {
        window.location.href = 'login.html';
        return;
    }

    usuarioActual = usuarioData.user;

    configurarModalContacto();

    await cargarConversaciones();

    const form = document.getElementById('form-mensaje');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enviarMensaje();
    });

    const parametros = new URLSearchParams(window.location.search);
    const idConversacion = parametros.get('conversacion');

    if (idConversacion) {
        await abrirConversacion(idConversacion);
    }
});


// MOSTRAR FOTO DE PERFIL
function colocarFoto(elemento, fotoPerfil) {

    if (!elemento) return;

    elemento.innerHTML = '';

    if (fotoPerfil) {

        const imagen = document.createElement('img');

        imagen.src = fotoPerfil;
        imagen.alt = 'Foto de perfil';
        imagen.className = 'foto-perfil-chat';

        imagen.onerror = () => {
            elemento.innerHTML = '👤';
        };

        elemento.appendChild(imagen);

    } else {

        elemento.textContent = '👤';
    }
}


// CONFIGURAR VENTANA DEL CONTACTO
function configurarModalContacto() {

    const botonContacto =
        document.getElementById('btn-info-contacto');

    const modalContacto =
        document.getElementById('modal-info-contacto');

    const cerrarModal =
        document.getElementById('cerrar-modal-contacto');

    botonContacto.addEventListener('click', () => {

        if (!personaActual) return;

        document.getElementById('info-nombre-usuario').textContent =
            '@' + (personaActual.nombre_usuario || 'Usuario');

        document.getElementById('info-nombre-completo').textContent =
            personaActual.nombre_completo || 'No disponible';

        const avatarModal =
            modalContacto.querySelector('.contacto-avatar');

        colocarFoto(avatarModal, personaActual.foto_perfil);

        modalContacto.hidden = false;
    });

    cerrarModal.addEventListener('click', () => {
        modalContacto.hidden = true;
    });

    modalContacto.addEventListener('click', (e) => {

        if (e.target === modalContacto) {
            modalContacto.hidden = true;
        }

    });

    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {
            modalContacto.hidden = true;
        }

    });
}


// CARGAR CONVERSACIONES
async function cargarConversaciones() {

    const lista = document.getElementById('lista-conversaciones');

    const { data, error } = await supabase
        .from('conversaciones')
        .select(`
            id,
            reportante_id,
            interesado_id,
            reportante:usuarios!conversaciones_reportante_id_fkey(
                nombre_completo,
                nombre_usuario,
                foto_perfil
            ),
            interesado:usuarios!conversaciones_interesado_id_fkey(
                nombre_completo,
                nombre_usuario,
                foto_perfil
            ),
            objeto:objetos_perdidos(nombre_objeto)
        `)
        .or(`reportante_id.eq.${usuarioActual.id},interesado_id.eq.${usuarioActual.id}`)
        .order('fecha_creacion', { ascending: false });

    if (error) {
        console.error(error);
        lista.textContent = 'No se pudieron cargar las conversaciones.';
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = `
            <p class="chat-sin-conversaciones">
                Aún no tienes conversaciones.
            </p>
        `;
        return;
    }

    lista.innerHTML = '';

    data.forEach(conversacion => {

        const soyReportante =
            conversacion.reportante_id === usuarioActual.id;

        const otraPersona = soyReportante
            ? conversacion.interesado
            : conversacion.reportante;

        const boton = document.createElement('button');

        boton.className = 'chat-conversacion';
        boton.type = 'button';

        if (conversacion.id === conversacionActual) {
            boton.classList.add('seleccionada');
        }

        // FOTO DE LA OTRA PERSONA
        const avatar = document.createElement('span');
        avatar.className = 'conversacion-avatar';

        colocarFoto(avatar, otraPersona?.foto_perfil);

        // INFORMACIÓN
        const informacion = document.createElement('span');
        informacion.className = 'conversacion-informacion';

        const nombreElemento = document.createElement('strong');

        nombreElemento.textContent =
            '@' + (otraPersona?.nombre_usuario || 'Usuario');

        const objetoElemento = document.createElement('small');

        objetoElemento.textContent =
            conversacion.objeto?.nombre_objeto || 'Varios objetos';

        informacion.appendChild(nombreElemento);
        informacion.appendChild(objetoElemento);

        boton.appendChild(avatar);
        boton.appendChild(informacion);

        boton.addEventListener('click', async () => {

            await abrirConversacion(conversacion.id);

            document.querySelectorAll('.chat-conversacion')
                .forEach(elemento => {
                    elemento.classList.remove('seleccionada');
                });

            boton.classList.add('seleccionada');
        });

        lista.appendChild(boton);
    });
}


// ABRIR CONVERSACIÓN
async function abrirConversacion(id) {

    const { data, error } = await supabase
        .from('conversaciones')
        .select(`
            id,
            reportante_id,
            interesado_id,
            reportante:usuarios!conversaciones_reportante_id_fkey(
                nombre_completo,
                nombre_usuario,
                foto_perfil
            ),
            interesado:usuarios!conversaciones_interesado_id_fkey(
                nombre_completo,
                nombre_usuario,
                foto_perfil
            ),
            objeto:objetos_perdidos(nombre_objeto)
        `)
        .eq('id', id)
        .maybeSingle();

    if (error || !data) {
        alert('No se pudo abrir esta conversación.');
        return;
    }

    if (
        data.reportante_id !== usuarioActual.id &&
        data.interesado_id !== usuarioActual.id
    ) {
        alert('No tienes permiso para ver esta conversación.');
        return;
    }

    // DETENER ACTUALIZACIÓN ANTERIOR
    if (intervaloMensajes) {
        clearInterval(intervaloMensajes);
        intervaloMensajes = null;
    }

    conversacionActual = id;

    const otraPersona = data.reportante_id === usuarioActual.id
        ? data.interesado
        : data.reportante;

    personaActual = otraPersona;

    document.getElementById('chat-titulo').textContent =
        '@' + (otraPersona?.nombre_usuario || 'Usuario');

    document.getElementById('chat-subtitulo').textContent =
        data.objeto?.nombre_objeto || 'Varios objetos';

    // FOTO EN EL ENCABEZADO DEL CHAT
    const avatarChat =
        document.querySelector('.chat-avatar-pequeno');

    colocarFoto(avatarChat, otraPersona?.foto_perfil);

    document.getElementById('chat-vacio').hidden = true;
    document.getElementById('chat-activo').hidden = false;

    await cargarMensajes();

    // ACTUALIZAR MENSAJES CADA 3 SEGUNDOS
    intervaloMensajes = setInterval(async () => {

        if (!document.hidden) {
            await cargarMensajes();
        }

    }, 3000);
}


// CARGAR MENSAJES Y MARCAR COMO LEÍDOS
async function cargarMensajes() {

    if (!conversacionActual || cargandoMensajes) return;

    cargandoMensajes = true;

    const contenedor = document.getElementById('chat-mensajes');

    try {

        const { data, error } = await supabase
            .from('mensajes')
            .select(`
                *,
                objeto:objetos_perdidos(nombre_objeto)
            `)
            .eq('conversacion_id', conversacionActual)
            .order('fecha_envio', { ascending: true });

        if (error) throw error;

        // MARCAR COMO LEÍDOS LOS MENSAJES RECIBIDOS
        const { error: errorLectura } = await supabase
            .from('mensajes')
            .update({ leido: true })
            .eq('conversacion_id', conversacionActual)
            .neq('remitente_id', usuarioActual.id)
            .eq('leido', false);

        if (errorLectura) {
            console.error(
                'Error al marcar mensajes como leídos:',
                errorLectura
            );
        }

        contenedor.innerHTML = '';

        data.forEach(mensaje => {

            const esPropio =
                mensaje.remitente_id === usuarioActual.id;

            const burbuja = document.createElement('div');

            burbuja.className = esPropio
                ? 'mensaje-propio'
                : 'mensaje-otro';

            // NOMBRE DEL OBJETO
            if (mensaje.objeto?.nombre_objeto) {

                const objeto = document.createElement('strong');

                objeto.className = 'mensaje-objeto';
                objeto.textContent = mensaje.objeto.nombre_objeto;

                burbuja.appendChild(objeto);
            }

            // CONTENIDO
            const texto = document.createElement('p');
            texto.textContent = mensaje.contenido;

            burbuja.appendChild(texto);

            // PIE DEL MENSAJE
            const pie = document.createElement('div');
            pie.className = 'mensaje-pie';

            const hora = document.createElement('small');

            hora.textContent = new Date(mensaje.fecha_envio)
                .toLocaleTimeString('es-PA', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

            pie.appendChild(hora);

            // DOS GANCHITOS EN MENSAJES PROPIOS
            if (esPropio) {

                const estado = document.createElement('span');

                estado.className = mensaje.leido
                    ? 'mensaje-estado leido'
                    : 'mensaje-estado';

                estado.textContent = '✓✓';

                estado.title = mensaje.leido
                    ? 'Mensaje leído'
                    : 'Mensaje enviado';

                pie.appendChild(estado);
            }

            burbuja.appendChild(pie);

            contenedor.appendChild(burbuja);
        });

        contenedor.scrollTop = contenedor.scrollHeight;

    } catch (error) {

        console.error('Error al cargar mensajes:', error);

    } finally {

        cargandoMensajes = false;
    }
}


// ENVIAR MENSAJE
async function enviarMensaje() {

    const input = document.getElementById('input-mensaje');
    const boton = document.getElementById('btn-enviar');

    const contenido = input.value.trim();

    if (!contenido || !conversacionActual) return;

    boton.disabled = true;

    try {

        const { error } = await supabase
            .from('mensajes')
            .insert({
                conversacion_id: conversacionActual,
                remitente_id: usuarioActual.id,
                contenido: contenido,
                leido: false
            });

        if (error) throw error;

        input.value = '';

        await cargarMensajes();

    } catch (error) {

        console.error(error);

        alert('No se pudo enviar el mensaje: ' + error.message);

    } finally {

        boton.disabled = false;
        input.focus();
    }
}


// DETENER ACTUALIZACIÓN AL SALIR
window.addEventListener('beforeunload', () => {

    if (intervaloMensajes) {
        clearInterval(intervaloMensajes);
    }

});
