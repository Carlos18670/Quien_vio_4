
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // PROTEGER LA PÁGINA
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    // ELEMENTOS HTML
    const contenedor = document.getElementById('mis-reportes-lista');
    const buscador = document.getElementById('buscar-mis-reportes');
    const filtro = document.getElementById('filtro-reportes');

    // OBTENER USUARIO ACTUAL
    const { data: usuarioData, error: errorUsuario } =
        await supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) return;

    const usuario = usuarioData.user;

    // ALMACENAR LOS REPORTES POR SEPARADO
    let reportesPerdidos = [];
    let reportesEncontrados = [];

    // ESCAPAR TEXTO
    function escapar(texto) {
        return String(texto || '').replace(/[&<>"']/g, caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[caracter]);
    }

    // CARGAR REPORTES DEL USUARIO
    async function cargarReportes() {

        contenedor.innerHTML = '<p>Cargando tus reportes...</p>';

        try {

            const [perdidos, encontrados] = await Promise.all([

                // OBJETOS PERDIDOS
                supabase
                    .from('objetos_perdidos')
                    .select('*')
                    .eq('usuario_id', usuario.id)
                    .order('fecha_registro', { ascending: false }),

                // OBJETOS ENCONTRADOS
                supabase
                    .from('objetos_encontrados')
                    .select('*')
                    .eq('usuario_id', usuario.id)
                    .order('fecha_registro', { ascending: false })

            ]);

            if (perdidos.error) throw perdidos.error;
            if (encontrados.error) throw encontrados.error;

            reportesPerdidos = perdidos.data || [];
            reportesEncontrados = encontrados.data || [];

            mostrarReportes();

        } catch (error) {

            console.error('Error al cargar reportes:', error);

            contenedor.innerHTML = `
                <p class="empty">
                    No se pudieron cargar tus reportes:
                    ${escapar(error.message)}
                </p>
            `;
        }
    }

    // CREAR TARJETA DE REPORTE
    function crearTarjeta(objeto, tipo) {

        const tarjeta = document.createElement('article');
        tarjeta.className = 'mi-reporte-card';

        // FOTOGRAFÍA
        const imagen = document.createElement('img');
        imagen.className = 'mi-reporte-imagen';
        imagen.alt = objeto.nombre_objeto || 'Objeto reportado';

        if (objeto.imagen_url) {

            imagen.src = objeto.imagen_url;

            imagen.onerror = () => {
                imagen.style.display = 'none';
            };

        } else {
            imagen.style.display = 'none';
        }

        // CONTENIDO
        const contenido = document.createElement('div');
        contenido.className = 'mi-reporte-contenido';

        // NOMBRE
        const nombre = document.createElement('h3');
        nombre.textContent = objeto.nombre_objeto || 'Sin nombre';

        // TIPO DE REPORTE
        const tipoReporte = document.createElement('span');
        tipoReporte.className = tipo === 'perdido'
            ? 'mi-reporte-estado activo'
            : 'mi-reporte-estado encontrado';

        tipoReporte.textContent = tipo === 'perdido'
            ? 'Objeto perdido'
            : 'Objeto encontrado';

        // DESCRIPCIÓN
        const descripcion = document.createElement('p');
        descripcion.className = 'mi-reporte-descripcion';
        descripcion.textContent =
            objeto.descripcion || 'Sin descripción';

        // MARCA
        const marca = document.createElement('p');
        marca.textContent =
            'Marca: ' + (objeto.marca || 'No especificada');

        // COLOR
        const color = document.createElement('p');
        color.textContent =
            'Color: ' + (objeto.color || 'No especificado');

        // LUGAR
        const lugar = document.createElement('p');
        lugar.className = 'mi-reporte-lugar';

        lugar.textContent = 'Lugar: ' + (
            tipo === 'perdido'
                ? objeto.lugar_perdida || 'No indicado'
                : objeto.lugar_encontrado || 'No indicado'
        );

        // FECHA
        const fecha = document.createElement('p');
        fecha.className = 'mi-reporte-fecha';

        fecha.textContent = 'Fecha: ' + (
            tipo === 'perdido'
                ? objeto.fecha_perdida || 'No indicada'
                : objeto.fecha_encontrado || 'No indicada'
        );

        // ESTADO DEL REPORTE
        const estado = document.createElement('span');

        estado.className = objeto.estado === 'recuperado'
            ? 'mi-reporte-estado recuperado'
            : 'mi-reporte-estado activo';

        estado.textContent =
            objeto.estado === 'recuperado'
                ? '✓ Recuperado'
                : '● Activo';

        contenido.append(
            tipoReporte,
            nombre,
            descripcion,
            marca,
            color,
            lugar,
            fecha,
            estado
        );

        // JUSTIFICACIÓN DE RECUPERACIÓN
        if (
            tipo === 'perdido' &&
            objeto.estado === 'recuperado' &&
            objeto.justificacion_recuperacion
        ) {

            const justificacion = document.createElement('p');

            justificacion.className = 'mi-reporte-justificacion';

            justificacion.textContent =
                'Justificación: ' + objeto.justificacion_recuperacion;

            contenido.appendChild(justificacion);
        }

        // BOTÓN PARA MARCAR COMO RECUPERADO
        // SOLAMENTE PARA OBJETOS PERDIDOS
        if (tipo === 'perdido' && objeto.estado === 'activo') {

            const boton = document.createElement('button');

            boton.type = 'button';
            boton.className = 'btn primary';
            boton.textContent = 'Marcar como recuperado';

            boton.addEventListener('click', () => {
                marcarRecuperado(objeto.id);
            });

            contenido.appendChild(boton);
        }

        tarjeta.append(imagen, contenido);

        return tarjeta;
    }

    // FILTRAR REPORTES
    function filtrarReportes(reportes, tipo) {

        const texto = buscador.value.toLowerCase().trim();
        const estadoFiltro = filtro.value;

        return reportes.filter(objeto => {

            const nombre = (objeto.nombre_objeto || '').toLowerCase();
            const descripcion = (objeto.descripcion || '').toLowerCase();
            const marca = (objeto.marca || '').toLowerCase();
            const color = (objeto.color || '').toLowerCase();

            const lugar = (
                tipo === 'perdido'
                    ? objeto.lugar_perdida
                    : objeto.lugar_encontrado
            ) || '';

            const coincideTexto = [
                nombre,
                descripcion,
                marca,
                color,
                lugar.toLowerCase()
            ].some(valor => valor.includes(texto));

            const coincideEstado =
                estadoFiltro === 'todos' ||
                objeto.estado === estadoFiltro;

            return coincideTexto && coincideEstado;
        });
    }

    // MOSTRAR REPORTES
    function mostrarReportes() {

        contenedor.innerHTML = '';

        // FILTRAR CADA TIPO POR SEPARADO
        const perdidos = filtrarReportes(
            reportesPerdidos,
            'perdido'
        );

        const encontrados = filtrarReportes(
            reportesEncontrados,
            'encontrado'
        );

        // SECCIÓN DE OBJETOS PERDIDOS
        const seccionPerdidos = document.createElement('section');
        seccionPerdidos.className = 'mis-reportes-seccion';

        const tituloPerdidos = document.createElement('h2');
        tituloPerdidos.textContent =
            `Mis objetos perdidos (${perdidos.length})`;

        seccionPerdidos.appendChild(tituloPerdidos);

        if (perdidos.length === 0) {

            const mensaje = document.createElement('p');
            mensaje.className = 'empty';
            mensaje.textContent =
                'No tienes reportes de objetos perdidos para mostrar.';

            seccionPerdidos.appendChild(mensaje);

        } else {

            perdidos.forEach(objeto => {
                seccionPerdidos.appendChild(
                    crearTarjeta(objeto, 'perdido')
                );
            });
        }

        // SECCIÓN DE OBJETOS ENCONTRADOS
        const seccionEncontrados = document.createElement('section');
        seccionEncontrados.className = 'mis-reportes-seccion';

        const tituloEncontrados = document.createElement('h2');
        tituloEncontrados.textContent =
            `Mis objetos encontrados (${encontrados.length})`;

        seccionEncontrados.appendChild(tituloEncontrados);

        if (encontrados.length === 0) {

            const mensaje = document.createElement('p');
            mensaje.className = 'empty';
            mensaje.textContent =
                'Todavía no has reportado objetos encontrados.';

            seccionEncontrados.appendChild(mensaje);

        } else {

            encontrados.forEach(objeto => {
                seccionEncontrados.appendChild(
                    crearTarjeta(objeto, 'encontrado')
                );
            });
        }

        // AGREGAR LAS DOS SECCIONES A LA PÁGINA
        contenedor.append(
            seccionPerdidos,
            seccionEncontrados
        );
    }

    // MARCAR OBJETO PERDIDO COMO RECUPERADO
    async function marcarRecuperado(id) {

        const justificacion = prompt(
            '¿Cómo recuperaste este objeto? Escribe una justificación:'
        );

        if (justificacion === null) return;

        if (justificacion.trim() === '') {
            alert('Debes escribir una justificación para continuar.');
            return;
        }

        const confirmar = confirm(
            '¿Confirmas que recuperaste este objeto?\n\n' +
            'Justificación: ' + justificacion
        );

        if (!confirmar) return;

        const { error } = await supabase
            .from('objetos_perdidos')
            .update({
                estado: 'recuperado',
                justificacion_recuperacion: justificacion.trim()
            })
            .eq('id', id)
            .eq('usuario_id', usuario.id);

        if (error) {

            console.error(error);

            alert(
                'No se pudo actualizar el reporte: ' + error.message
            );

            return;
        }

        alert('¡Objeto marcado como recuperado correctamente!');

        await cargarReportes();
    }

    // BUSCADOR Y FILTRO
    buscador.addEventListener('input', mostrarReportes);
    filtro.addEventListener('change', mostrarReportes);

    // INICIAR
    await cargarReportes();

});
