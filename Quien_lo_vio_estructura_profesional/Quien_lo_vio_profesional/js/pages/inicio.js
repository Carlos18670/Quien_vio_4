
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

// PROTEGER LA PÁGINA
const accesoPermitido = await protegerPagina();

if (!accesoPermitido) {
    throw new Error('Debes iniciar sesión para entrar.');
}

// CARGAR CONTENIDO
document.addEventListener('DOMContentLoaded', async () => {

    const topbarInput = document.querySelector('.topbar input');
    const emptyContainer = document.getElementById('objetos-recientes');

    // ELEMENTOS DEL MODAL
    const modal = document.getElementById('modal-objeto');
    const cerrarModal = document.getElementById('cerrar-modal');

    // BUSCADOR
    if (topbarInput) {
        topbarInput.addEventListener('keypress', (e) => {

            if (e.key === 'Enter' && topbarInput.value.trim() !== '') {

                const query = encodeURIComponent(topbarInput.value.trim());

                window.location.href = `buscar-coincidencias.html?q=${query}`;
            }
        });
    }

    // CERRAR MODAL
    if (cerrarModal && modal) {
        cerrarModal.addEventListener('click', () => {
            modal.hidden = true;
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.hidden = true;
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.hidden = true;
            }
        });
    }

    // FUNCIÓN PARA INICIAR O REUTILIZAR UNA CONVERSACIÓN
    async function iniciarContacto(objeto, tipo) {

        try {

            // OBTENER USUARIO ACTUAL
            const { data: usuarioData, error: usuarioError } =
                await supabase.auth.getUser();

            if (usuarioError || !usuarioData.user) {
                alert('Debes iniciar sesión para contactar.');
                window.location.href = 'login.html';
                return;
            }

            const usuario = usuarioData.user;

            // EVITAR CONTACTAR EL PROPIO REPORTE
            if (usuario.id === objeto.usuario_id) {
                alert('Este es tu propio reporte. Otra persona puede contactarte.');
                return;
            }

            // BUSCAR UNA CONVERSACIÓN ENTRE AMBOS USUARIOS
            const { data: existentes, error: errorBusqueda } = await supabase
                .from('conversaciones')
                .select('id')
                .or(
                    `and(reportante_id.eq.${usuario.id},interesado_id.eq.${objeto.usuario_id}),and(reportante_id.eq.${objeto.usuario_id},interesado_id.eq.${usuario.id})`
                );

            if (errorBusqueda) throw errorBusqueda;

            let idConversacion;

            if (existentes && existentes.length > 0) {

                // REUTILIZAR EL CHAT EXISTENTE
                idConversacion = existentes[0].id;

            } else {

                // CREAR UN CHAT NUEVO
                const { data: nueva, error: errorCrear } = await supabase
                    .from('conversaciones')
                    .insert({
                        objeto_perdido_id: objeto.id,
                        reportante_id: objeto.usuario_id,
                        interesado_id: usuario.id,
                        tipo_contacto: tipo
                    })
                    .select('id')
                    .single();

                if (errorCrear) throw errorCrear;

                idConversacion = nueva.id;
            }

            // ENVIAR MENSAJE INICIAL CON EL OBJETO RELACIONADO
            const contenidoInicial = tipo === 'encontre'
                ? `Hola, encontré tu objeto: ${objeto.nombre_objeto}.`
                : `Hola, tengo información sobre tu objeto: ${objeto.nombre_objeto}.`;

            const { error: errorMensaje } = await supabase
                .from('mensajes')
                .insert({
                    conversacion_id: idConversacion,
                    remitente_id: usuario.id,
                    objeto_perdido_id: objeto.id,
                    contenido: contenidoInicial
                });

            if (errorMensaje) throw errorMensaje;

            // ABRIR EL CHAT
            window.location.href =
                `mensajes.html?conversacion=${idConversacion}`;

        } catch (error) {

            console.error('Error al iniciar conversación:', error);

            alert('No se pudo iniciar la conversación: ' + error.message);
        }
    }

    // MOSTRAR INFORMACIÓN DEL OBJETO
    function mostrarDetalles(item) {

        document.getElementById('detalle-imagen').src =
            item.imagen_url || '';

        document.getElementById('detalle-nombre').textContent =
            item.nombre_objeto || 'Sin nombre';

        document.getElementById('detalle-categoria').textContent =
            item.categoria || 'No especificada';

        document.getElementById('detalle-color').textContent =
            item.color || 'No especificado';

        document.getElementById('detalle-marca').textContent =
            item.marca || 'No especificada';

        document.getElementById('detalle-fecha').textContent =
            item.fecha_perdida || 'No especificada';

        document.getElementById('detalle-hora').textContent =
            item.hora_perdida || 'No especificada';

        document.getElementById('detalle-lugar').textContent =
            item.lugar_perdida || 'No especificado';

        document.getElementById('detalle-descripcion').textContent =
            item.descripcion || 'Sin descripción';

        document.getElementById('detalle-usuario').textContent =
            item.usuarios?.nombre_completo ||
            item.usuarios?.nombre_usuario ||
            'Usuario';

        // BOTÓN: ENCONTRÉ ESTE OBJETO
        document.getElementById('btn-encontre').onclick = () => {
            iniciarContacto(item, 'encontre');
        };

        // BOTÓN: TENGO INFORMACIÓN
        document.getElementById('btn-informacion').onclick = () => {
            iniciarContacto(item, 'informacion');
        };

        modal.hidden = false;
    }

    // CARGAR OBJETOS PERDIDOS DESDE SUPABASE
    try {

        const { data: objetos, error } = await supabase
            .from('objetos_perdidos')
            .select(`
                *,
                usuarios (
                    nombre_completo,
                    nombre_usuario
                )
            `)
            .order('fecha_registro', { ascending: false })
            .limit(6);

        if (error) {
            throw error;
        }

        if (!emptyContainer) {
            console.error('No se encontró el contenedor de objetos recientes.');
            return;
        }

        // SI NO HAY OBJETOS
        if (!objetos || objetos.length === 0) {

            emptyContainer.textContent =
                'No hay objetos perdidos registrados todavía.';

            return;
        }

        // LIMPIAR CONTENEDOR
        emptyContainer.innerHTML = '';

        // MOSTRAR FOTOGRAFÍAS
        objetos.forEach((item) => {

            if (!item.imagen_url) {
                return;
            }

            const tarjeta = document.createElement('button');

            tarjeta.type = 'button';
            tarjeta.className = 'objeto-foto';

            tarjeta.setAttribute(
                'aria-label',
                'Ver detalles de ' + item.nombre_objeto
            );

            const imagen = document.createElement('img');

            imagen.src = item.imagen_url;
            imagen.alt = item.nombre_objeto || 'Objeto perdido';

            tarjeta.appendChild(imagen);

            // ABRIR MODAL AL HACER CLIC
            tarjeta.addEventListener('click', () => {
                mostrarDetalles(item);
            });

            emptyContainer.appendChild(tarjeta);

        });

    } catch (error) {

        console.error('Error al cargar objetos recientes:', error);

        if (emptyContainer) {
            emptyContainer.textContent =
                'No se pudieron cargar los objetos. Intenta nuevamente.';
        }
    }

});
