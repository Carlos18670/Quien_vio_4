
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // PROTEGER LA PÁGINA
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    // ELEMENTOS HTML
    const searchInput = document.getElementById('search');
    const selectFilter = document.querySelector('.toolbar select');
    const botonBuscar = document.querySelector('.toolbar button');
    const main = document.querySelector('.main main');

    let coincidencias = [];
    let totalPerdidos = 0;
    let totalEncontrados = 0;
    let mejorPorcentaje = 0;

    // NORMALIZAR TEXTOS
    function normalizar(texto) {
        return (texto || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    // COMPARAR DOS TEXTOS
    function compararTextos(texto1, texto2) {

        const a = normalizar(texto1);
        const b = normalizar(texto2);

        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.85;

        const palabrasA = new Set(a.split(/\s+/));
        const palabrasB = new Set(b.split(/\s+/));

        const comunes = [...palabrasA].filter(p =>
            palabrasB.has(p)
        );

        return comunes.length /
            new Set([...palabrasA, ...palabrasB]).size;
    }

    // CALCULAR PORCENTAJE DE SIMILITUD
    function calcularCoincidencia(perdido, encontrado) {

        const comparaciones = [
            { campo1: 'nombre_objeto', campo2: 'nombre_objeto', peso: 30 },
            { campo1: 'categoria', campo2: 'categoria', peso: 15 },
            { campo1: 'marca', campo2: 'marca', peso: 15 },
            { campo1: 'color', campo2: 'color', peso: 15 },
            { campo1: 'descripcion', campo2: 'descripcion', peso: 10 },
            { campo1: 'lugar_perdida', campo2: 'lugar_encontrado', peso: 15 }
        ];

        let puntos = 0;
        let pesoDisponible = 0;

        comparaciones.forEach(item => {

            const valor1 = perdido[item.campo1];
            const valor2 = encontrado[item.campo2];

            if (
                valor1 &&
                valor2 &&
                normalizar(valor1) !== '' &&
                normalizar(valor2) !== ''
            ) {
                puntos += compararTextos(valor1, valor2) * item.peso;
                pesoDisponible += item.peso;
            }

        });

        if (pesoDisponible === 0) return 0;

        return Math.round((puntos / pesoDisponible) * 100);
    }

    // ESCAPAR TEXTO PARA HTML
    function escapar(texto) {

        return String(texto || '').replace(/[&<>"']/g, caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[caracter]);

    }

    // MOSTRAR MENSAJES
    function mostrarMensaje(mensaje) {

        let contenedor = document.getElementById(
            'resultados-coincidencias'
        );

        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.id = 'resultados-coincidencias';
            main.appendChild(contenedor);
        }

        contenedor.innerHTML = `
            <div class="empty">
                <p>${escapar(mensaje)}</p>
            </div>
        `;
    }

    // CARGAR OBJETOS DESDE SUPABASE
    async function cargarObjetos() {

        mostrarMensaje('Buscando posibles coincidencias...');

        try {

            const [perdidos, encontrados] = await Promise.all([

                supabase
                    .from('objetos_perdidos')
                    .select('*')
                    .eq('estado', 'activo'),

                supabase
                    .from('objetos_encontrados')
                    .select('*')
                    .eq('estado', 'activo')

            ]);

            if (perdidos.error) throw perdidos.error;
            if (encontrados.error) throw encontrados.error;

            totalPerdidos = perdidos.data?.length || 0;
            totalEncontrados = encontrados.data?.length || 0;

            await analizarCoincidencias(
                perdidos.data || [],
                encontrados.data || []
            );

        } catch (error) {

            console.error('Error al cargar reportes:', error);

            mostrarMensaje(
                'No se pudieron cargar los reportes: ' + error.message
            );

        }
    }

    // GENERAR NOTIFICACIONES DE COINCIDENCIAS
    async function generarNotificacionesCoincidencias() {

        const { data: usuarioData, error: usuarioError } =
            await supabase.auth.getUser();

        if (usuarioError || !usuarioData.user) {
            console.error(
                'No se pudo identificar al usuario:',
                usuarioError
            );
            return;
        }

        const usuario = usuarioData.user;

        for (const item of coincidencias) {

            // Solo procesar coincidencias donde participa el usuario
            const esParticipante =
                usuario.id === item.perdido.usuario_id ||
                usuario.id === item.encontrado.usuario_id;

            if (!esParticipante) continue;

            const { error } = await supabase.rpc(
                'generar_notificacion_coincidencia',
                {
                    p_objeto_perdido_id: item.perdido.id,
                    p_objeto_encontrado_id: item.encontrado.id,
                    p_porcentaje: item.porcentaje
                }
            );

            if (error) {
                console.error(
                    'Error al generar notificación:',
                    error
                );
            }
        }
    }

    // ANALIZAR COINCIDENCIAS
    async function analizarCoincidencias(perdidos, encontrados) {

        coincidencias = [];
        mejorPorcentaje = 0;

        perdidos.forEach(perdido => {

            encontrados.forEach(encontrado => {

                // NO COMPARAR REPORTES DE LA MISMA PERSONA
                if (perdido.usuario_id === encontrado.usuario_id) {
                    return;
                }

                const porcentaje = calcularCoincidencia(
                    perdido,
                    encontrado
                );

                if (porcentaje > mejorPorcentaje) {
                    mejorPorcentaje = porcentaje;
                }

                if (porcentaje >= 35) {
                    coincidencias.push({
                        perdido,
                        encontrado,
                        porcentaje
                    });
                }

            });

        });

        coincidencias.sort((a, b) =>
            b.porcentaje - a.porcentaje
        );

        // GUARDAR NOTIFICACIONES EN SUPABASE
        await generarNotificacionesCoincidencias();

        mostrarCoincidencias();
    }

    // CREAR TARJETA DE CADA OBJETO
    function crearTarjeta(objeto, tipo) {

        const nombre = escapar(objeto.nombre_objeto);
        const marca = escapar(objeto.marca || 'No especificada');
        const color = escapar(objeto.color || 'No especificado');

        const descripcion = escapar(
            objeto.descripcion || 'Sin descripción'
        );

        const lugar = escapar(
            tipo === 'perdido'
                ? objeto.lugar_perdida
                : objeto.lugar_encontrado
        );

        const imagen = objeto.imagen_url
            ? `<img src="${escapar(objeto.imagen_url)}" alt="${nombre}">`
            : `<div class="coincidencia-sin-imagen">📦</div>`;

        return `
            <div class="coincidencia-objeto">
                ${imagen}

                <div class="coincidencia-datos">

                    <span class="coincidencia-tipo ${tipo}">
                        ${tipo === 'perdido'
                            ? 'Objeto perdido'
                            : 'Objeto encontrado'}
                    </span>

                    <h3>${nombre}</h3>

                    <p><strong>Marca:</strong> ${marca}</p>
                    <p><strong>Color:</strong> ${color}</p>
                    <p><strong>Lugar:</strong> ${lugar}</p>

                    <p class="coincidencia-descripcion">
                        ${descripcion}
                    </p>

                </div>
            </div>
        `;
    }

    // BUSCAR CONVERSACIÓN ENTRE DOS PERSONAS
    async function buscarConversacion(reportanteId, interesadoId) {

        const { data, error } = await supabase
            .from('conversaciones')
            .select('id')
            .or(
                `and(reportante_id.eq.${reportanteId},interesado_id.eq.${interesadoId}),and(reportante_id.eq.${interesadoId},interesado_id.eq.${reportanteId})`
            )
            .limit(1);

        if (error) throw error;

        return data?.[0] || null;
    }

    // INICIAR CONTACTO DESDE UNA COINCIDENCIA
    async function iniciarContactoCoincidencia(item, boton) {

        const textoOriginal = boton.innerHTML;

        try {

            boton.disabled = true;
            boton.innerHTML = 'Abriendo conversación...';

            // OBTENER USUARIO ACTUAL
            const { data: usuarioData, error: usuarioError } =
                await supabase.auth.getUser();

            if (usuarioError || !usuarioData.user) {
                alert('Debes iniciar sesión para contactar a la persona.');
                window.location.href = 'login.html';
                return;
            }

            const usuario = usuarioData.user;

            const perdido = item.perdido;
            const encontrado = item.encontrado;

            const reportanteId = perdido.usuario_id;
            const interesadoId = encontrado.usuario_id;

            // VERIFICAR PARTICIPANTES
            if (
                usuario.id !== reportanteId &&
                usuario.id !== interesadoId
            ) {
                alert(
                    'Solo las personas que reportaron estos objetos pueden iniciar esta conversación.'
                );
                return;
            }

            if (reportanteId === interesadoId) {
                alert('Ambos reportes pertenecen a la misma persona.');
                return;
            }

            // BUSCAR CONVERSACIÓN EXISTENTE
            let conversacion = await buscarConversacion(
                reportanteId,
                interesadoId
            );

            // CREAR SOLO SI NO EXISTE
            if (!conversacion) {

                const { data: nueva, error: errorCrear } =
                    await supabase
                        .from('conversaciones')
                        .insert({
                            objeto_perdido_id: perdido.id,
                            reportante_id: reportanteId,
                            interesado_id: interesadoId,
                            tipo_contacto: 'informacion'
                        })
                        .select('id')
                        .single();

                if (errorCrear) {

                    // SI YA EXISTÍA, RECUPERARLA
                    if (errorCrear.code === '23505') {

                        conversacion = await buscarConversacion(
                            reportanteId,
                            interesadoId
                        );

                        if (!conversacion) {
                            throw errorCrear;
                        }

                    } else {
                        throw errorCrear;
                    }

                } else {
                    conversacion = nueva;
                }
            }

            const idConversacion = conversacion.id;

            // COMPROBAR MENSAJE INICIAL
            const { data: mensajesExistentes, error: errorMensajes } =
                await supabase
                    .from('mensajes')
                    .select('id')
                    .eq('conversacion_id', idConversacion)
                    .eq('remitente_id', usuario.id)
                    .eq('objeto_perdido_id', perdido.id)
                    .limit(1);

            if (errorMensajes) throw errorMensajes;

            // ENVIAR MENSAJE SI NO EXISTE
            if (!mensajesExistentes || mensajesExistentes.length === 0) {

                const contenido =
                    `Hola, vi una posible coincidencia entre tu reporte de "${perdido.nombre_objeto}" y el objeto encontrado "${encontrado.nombre_objeto}". ¿Podemos intercambiar información para verificar si se trata del mismo objeto?`;

                const { error: errorEnviar } = await supabase
                    .from('mensajes')
                    .insert({
                        conversacion_id: idConversacion,
                        remitente_id: usuario.id,
                        objeto_perdido_id: perdido.id,
                        contenido
                    });

                if (errorEnviar) throw errorEnviar;
            }

            // ABRIR CONVERSACIÓN
            window.location.href =
                `mensajes.html?conversacion=${idConversacion}`;

        } catch (error) {

            console.error('Error al iniciar contacto:', error);

            alert(
                'No se pudo abrir la conversación: ' + error.message
            );

            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }

    // MOSTRAR RESULTADOS
    function mostrarCoincidencias() {

        let contenedor = document.getElementById(
            'resultados-coincidencias'
        );

        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.id = 'resultados-coincidencias';
            main.appendChild(contenedor);
        }

        const busqueda = normalizar(searchInput?.value);
        const filtro = selectFilter?.value || 'Todos';

        let resultados = coincidencias.filter(item => {

            const textoPerdido = normalizar([
                item.perdido.nombre_objeto,
                item.perdido.marca,
                item.perdido.color,
                item.perdido.lugar_perdida
            ].join(' '));

            const textoEncontrado = normalizar([
                item.encontrado.nombre_objeto,
                item.encontrado.marca,
                item.encontrado.color,
                item.encontrado.lugar_encontrado
            ].join(' '));

            const texto = textoPerdido + ' ' + textoEncontrado;

            if (busqueda && !texto.includes(busqueda)) {
                return false;
            }

            if (
                filtro === 'Perdidos' &&
                !textoPerdido.includes(busqueda) &&
                busqueda
            ) {
                return false;
            }

            if (
                filtro === 'Encontrados' &&
                !textoEncontrado.includes(busqueda) &&
                busqueda
            ) {
                return false;
            }

            return true;
        });

        // SI NO HAY COINCIDENCIAS
        if (resultados.length === 0) {

            contenedor.innerHTML = `

                <div class="empty">

                    <h3>No encontramos coincidencias</h3>

                    <p>
                        Todavía no encontramos objetos similares.
                    </p>

                    <div style="
                        margin-top: 20px;
                        padding: 15px;
                        background: #f1f5f9;
                        border-radius: 12px;
                        text-align: left;
                    ">

                        <strong>Información de comprobación</strong>

                        <p>Objetos perdidos cargados: ${totalPerdidos}</p>

                        <p>Objetos encontrados cargados: ${totalEncontrados}</p>

                        <p>Mejor similitud calculada: ${mejorPorcentaje}%</p>

                        <p>Coincidencias encontradas: ${coincidencias.length}</p>

                    </div>

                </div>

            `;

            return;
        }

        // MOSTRAR COINCIDENCIAS
        contenedor.innerHTML = `

            <div class="coincidencias-encabezado">

                <h2>Resultados encontrados</h2>

                <span>
                    ${resultados.length} posibles coincidencias
                </span>

            </div>

            <div class="coincidencias-lista">

                ${resultados.map((item, indice) => `

                    <article class="coincidencia-card">

                        <div class="coincidencia-porcentaje">

                            <strong>${item.porcentaje}%</strong>

                            <span>Similitud</span>

                        </div>

                        <div class="coincidencia-comparacion">

                            ${crearTarjeta(item.perdido, 'perdido')}

                            <div class="coincidencia-conector">
                                <span>↔</span>
                                <small>Posible coincidencia</small>
                            </div>

                            ${crearTarjeta(item.encontrado, 'encontrado')}

                        </div>

                        <div class="acciones-coincidencia">

                            <button
                                class="btn-contactar"
                                type="button"
                                data-indice="${indice}"
                            >
                                <span>💬</span>
                                Contactar a la persona
                            </button>

                        </div>

                    </article>

                `).join('')}

            </div>

        `;

        // ACTIVAR BOTONES
        contenedor.querySelectorAll('.btn-contactar').forEach(boton => {

            boton.addEventListener('click', () => {

                const indice = Number(boton.dataset.indice);
                const item = resultados[indice];

                iniciarContactoCoincidencia(item, boton);

            });

        });
    }

    // EVENTOS DE BÚSQUEDA
    searchInput?.addEventListener(
        'input',
        mostrarCoincidencias
    );

    selectFilter?.addEventListener(
        'change',
        mostrarCoincidencias
    );

    botonBuscar?.addEventListener(
        'click',
        mostrarCoincidencias
    );

    // INICIAR
    await cargarObjetos();

});
