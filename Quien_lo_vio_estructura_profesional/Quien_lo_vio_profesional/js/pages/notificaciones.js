
import { supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ELEMENTOS DE LA PÁGINA
    const contador = document.getElementById('contador-notificaciones');
    const lista = document.getElementById('lista-notificaciones');
    const vacias = document.getElementById('notificaciones-vacias');

    // Detectar si estamos en Inicio o en la página completa
    const esInicio = Boolean(contador);

    if (!lista || !vacias) return;

    // OBTENER USUARIO ACTUAL
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return;

    const usuario = data.user;

    // CARGAR NOTIFICACIONES
    async function cargarNotificaciones() {

        // 1. OBTENER NOTIFICACIONES DE LA TABLA
        const { data: avisos, error: errorAvisos } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', usuario.id)
            .order('fecha_creacion', { ascending: false });

        if (errorAvisos) {
            console.error('Error al cargar notificaciones:', errorAvisos);
        }

        const notificaciones = avisos || [];

        // 2. BUSCAR CONVERSACIONES DEL USUARIO
        const { data: conversaciones, error: errorConversaciones } =
            await supabase
                .from('conversaciones')
                .select(`
                    id,
                    reportante_id,
                    interesado_id,
                    reportante:usuarios!conversaciones_reportante_id_fkey(nombre_completo, nombre_usuario),
                    interesado:usuarios!conversaciones_interesado_id_fkey(nombre_completo, nombre_usuario)
                `)
                .or(`reportante_id.eq.${usuario.id},interesado_id.eq.${usuario.id}`);

        if (errorConversaciones) {
            console.error('Error al cargar conversaciones:', errorConversaciones);
        }

        const listaConversaciones = conversaciones || [];

        // 3. BUSCAR MENSAJES SIN LEER
        let mensajes = [];

        if (listaConversaciones.length > 0) {

            const ids = listaConversaciones.map(c => c.id);

            const { data: datosMensajes, error: errorMensajes } =
                await supabase
                    .from('mensajes')
                    .select('id, conversacion_id, contenido, fecha_envio, remitente_id')
                    .in('conversacion_id', ids)
                    .neq('remitente_id', usuario.id)
                    .eq('leido', false)
                    .order('fecha_envio', { ascending: false });

            if (errorMensajes) {
                console.error('Error al cargar mensajes:', errorMensajes);
            } else {
                mensajes = datosMensajes || [];
            }
        }

        // 4. CONTAR NOTIFICACIONES SIN LEER
        const avisosPendientes = notificaciones.filter(n => !n.leida);

        const totalPendientes = avisosPendientes.length + mensajes.length;

        if (contador) {
            contador.textContent = totalPendientes;
            contador.hidden = totalPendientes === 0;
        }

        // 5. UNIR LOS DOS TIPOS DE AVISOS
        let elementos = [
            ...notificaciones.map(n => ({
                tipo: 'aviso',
                fecha: n.fecha_creacion,
                datos: n
            })),

            ...mensajes.map(m => ({
                tipo: 'mensaje',
                fecha: m.fecha_envio,
                datos: m
            }))
        ];

        // Ordenar del más reciente al más antiguo
        elementos.sort((a, b) =>
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        // En Inicio mostrar solamente los 5 más recientes
        if (esInicio) {
            elementos = elementos.slice(0, 5);
        }

        // 6. MOSTRAR NOTIFICACIONES
        lista.innerHTML = '';

        vacias.hidden = elementos.length > 0;

        elementos.forEach(elemento => {

            const aviso = document.createElement('div');
            aviso.className = 'notificacion-mensaje';

            const titulo = document.createElement('strong');
            const texto = document.createElement('p');
            const fecha = document.createElement('small');

            if (elemento.tipo === 'aviso') {

                const notificacion = elemento.datos;

                titulo.textContent = notificacion.titulo;
                texto.textContent = notificacion.mensaje;

                fecha.textContent = new Date(notificacion.fecha_creacion)
                    .toLocaleString('es-PA');

                if (!notificacion.leida) {
                    aviso.classList.add('no-leida');
                }

                // Botón para marcar como leída
                const boton = document.createElement('button');
                boton.type = 'button';
                boton.textContent = notificacion.leida
                    ? 'Leída'
                    : 'Marcar como leída';

                boton.disabled = notificacion.leida;

                boton.addEventListener('click', async () => {

                    const { error: errorActualizar } = await supabase
                        .from('notificaciones')
                        .update({ leida: true })
                        .eq('id', notificacion.id)
                        .eq('usuario_id', usuario.id);

                    if (errorActualizar) {
                        console.error(errorActualizar);
                        alert('No se pudo actualizar la notificación.');
                        return;
                    }

                    await cargarNotificaciones();
                });

                aviso.appendChild(titulo);
                aviso.appendChild(texto);
                aviso.appendChild(fecha);
                aviso.appendChild(boton);

            } else {

                const mensaje = elemento.datos;

                const conversacion = listaConversaciones.find(
                    c => c.id === mensaje.conversacion_id
                );

                if (!conversacion) return;

                const remitente = mensaje.remitente_id === conversacion.reportante_id
                    ? conversacion.reportante
                    : conversacion.interesado;

                titulo.textContent =
                    remitente?.nombre_completo ||
                    remitente?.nombre_usuario ||
                    'Usuario';

                texto.textContent = mensaje.contenido;

                fecha.textContent = new Date(mensaje.fecha_envio)
                    .toLocaleString('es-PA');

                const enlace = document.createElement('a');
                enlace.href = `mensajes.html?conversacion=${mensaje.conversacion_id}`;
                enlace.textContent = 'Ver mensaje';

                aviso.appendChild(titulo);
                aviso.appendChild(texto);
                aviso.appendChild(fecha);
                aviso.appendChild(enlace);
            }

            lista.appendChild(aviso);
        });
    }

    // CARGA INICIAL
    await cargarNotificaciones();

    // ACTUALIZAR CADA 5 SEGUNDOS SOLAMENTE EN INICIO
    if (esInicio) {
        setInterval(cargarNotificaciones, 5000);
    }

});
