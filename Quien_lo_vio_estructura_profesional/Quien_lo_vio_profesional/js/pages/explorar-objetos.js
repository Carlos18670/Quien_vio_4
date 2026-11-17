
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    // PROTEGER LA PÁGINA
    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    // ELEMENTOS HTML
    const buscador = document.getElementById('buscar-objetos');
    const filtroTipo = document.getElementById('tipo-objeto');
    const filtroCategoria = document.getElementById('categoria-objeto');
    const resultados = document.getElementById('resultados-objetos');

    let objetosPerdidos = [];
    let objetosEncontrados = [];

    // CARGAR OBJETOS DESDE SUPABASE
    async function cargarObjetos() {

        resultados.innerHTML = '<p>Cargando objetos...</p>';

        const [perdidos, encontrados] = await Promise.all([

            supabase
                .from('objetos_perdidos')
                .select('*')
                .order('fecha_registro', { ascending: false }),

            supabase
                .from('objetos_encontrados')
                .select('*')
                .order('fecha_registro', { ascending: false })

        ]);

        if (perdidos.error || encontrados.error) {
            console.error(perdidos.error, encontrados.error);
            resultados.innerHTML =
                '<p>No se pudieron cargar los objetos. Intenta nuevamente.</p>';
            return;
        }

        objetosPerdidos = (perdidos.data || []).map(objeto => ({
            ...objeto,
            tipo: 'perdido',
            lugar: objeto.lugar_perdida,
            fecha: objeto.fecha_perdida
        }));

        objetosEncontrados = (encontrados.data || []).map(objeto => ({
            ...objeto,
            tipo: 'encontrado',
            lugar: objeto.lugar_encontrado,
            fecha: objeto.fecha_encontrado
        }));

        // CARGAR LAS CATEGORÍAS REALES
        cargarCategorias();

        // MOSTRAR PUBLICACIONES
        mostrarObjetos();
    }

    // NORMALIZAR TEXTO
    function normalizar(texto) {
        return String(texto || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    // CARGAR CATEGORÍAS DESDE LAS DOS TABLAS
    function cargarCategorias() {

        const categorias = [
            ...objetosPerdidos,
            ...objetosEncontrados
        ]
            .map(objeto => objeto.categoria)
            .filter(categoria =>
                categoria && categoria.trim() !== ''
            );

        // ELIMINAR CATEGORÍAS REPETIDAS
        const categoriasUnicas = new Map();

        categorias.forEach(categoria => {
            const clave = normalizar(categoria);

            if (!categoriasUnicas.has(clave)) {
                categoriasUnicas.set(clave, categoria.trim());
            }
        });

        // REINICIAR SELECTOR
        filtroCategoria.innerHTML =
            '<option value="todas">Todas las categorías</option>';

        // AGREGAR CATEGORÍAS REALES
        [...categoriasUnicas.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .forEach(([valor, nombre]) => {

                const opcion = document.createElement('option');

                opcion.value = valor;
                opcion.textContent = nombre;

                filtroCategoria.appendChild(opcion);
            });
    }

    // CONVERTIR FECHA
    function mostrarFecha(fecha) {

        if (!fecha) return 'Fecha no especificada';

        const partes = fecha.split('-');

        if (partes.length !== 3) return fecha;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // MOSTRAR OBJETOS
    function mostrarObjetos() {

        const busqueda = normalizar(buscador.value);
        const tipo = filtroTipo.value;
        const categoria = filtroCategoria.value;

        let lista = [
            ...objetosPerdidos,
            ...objetosEncontrados
        ];

        // MOSTRAR SOLAMENTE OBJETOS ACTIVOS
        lista = lista.filter(objeto =>
            !objeto.estado || objeto.estado === 'activo'
        );

        // FILTRAR POR TIPO
        if (tipo === 'perdidos') {
            lista = lista.filter(objeto =>
                objeto.tipo === 'perdido'
            );
        }

        if (tipo === 'encontrados') {
            lista = lista.filter(objeto =>
                objeto.tipo === 'encontrado'
            );
        }

        // FILTRAR POR CATEGORÍA
        if (categoria !== 'todas') {

            lista = lista.filter(objeto =>
                normalizar(objeto.categoria) === categoria
            );
        }

        // FILTRAR POR BÚSQUEDA
        if (busqueda) {

            lista = lista.filter(objeto => {

                const contenido = normalizar([
                    objeto.nombre_objeto,
                    objeto.descripcion,
                    objeto.marca,
                    objeto.color,
                    objeto.lugar,
                    objeto.categoria
                ].join(' '));

                return contenido.includes(busqueda);
            });
        }

        // SI NO HAY RESULTADOS
        if (lista.length === 0) {

            resultados.innerHTML = `
                <div class="empty-state">
                    <h3>No encontramos objetos</h3>
                    <p>
                        No hay publicaciones que coincidan con tu búsqueda.
                        Intenta cambiar los filtros.
                    </p>
                </div>
            `;

            return;
        }

        // CREAR TARJETAS
        resultados.innerHTML = `
            <div class="reportes-lista">
                ${lista.map(objeto => crearTarjeta(objeto)).join('')}
            </div>
        `;
    }

    // CREAR TARJETA DE OBJETO
    function crearTarjeta(objeto) {

        const esPerdido = objeto.tipo === 'perdido';

        const tipoTexto = esPerdido
            ? 'Objeto perdido'
            : 'Objeto encontrado';

        const claseTipo = esPerdido
            ? 'perdido'
            : 'encontrado';

        const imagen = objeto.imagen_url
            ? `<img
                    src="${escapar(objeto.imagen_url)}"
                    alt="${escapar(objeto.nombre_objeto)}"
                    class="imagen-objeto"
                >`
            : `<div class="imagen-sin-foto">📦</div>`;

        return `
            <article class="reporte-card tarjeta-explorar">

                ${imagen}

                <div class="reporte-info">

                    <span class="mi-reporte-estado ${claseTipo}">
                        ${tipoTexto}
                    </span>

                    <h3>${escapar(objeto.nombre_objeto)}</h3>

                    <p>
                        ${escapar(objeto.descripcion || 'Sin descripción')}
                    </p>

                    <p>
                        <strong>Categoría:</strong>
                        ${escapar(objeto.categoria || 'No especificada')}
                    </p>

                    <p>
                        <strong>Marca:</strong>
                        ${escapar(objeto.marca || 'No especificada')}
                    </p>

                    <p>
                        <strong>Color:</strong>
                        ${escapar(objeto.color || 'No especificado')}
                    </p>

                    <p>
                        <strong>Lugar:</strong>
                        ${escapar(objeto.lugar || 'No especificado')}
                    </p>

                    <p>
                        <strong>Fecha:</strong>
                        ${mostrarFecha(objeto.fecha)}
                    </p>

                </div>

            </article>
        `;
    }

    // PROTEGER TEXTO MOSTRADO EN HTML
    function escapar(texto) {

        return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[caracter]);
    }

    // EVENTOS DE LOS FILTROS
    buscador.addEventListener('input', mostrarObjetos);
    filtroTipo.addEventListener('change', mostrarObjetos);
    filtroCategoria.addEventListener('change', mostrarObjetos);

    // INICIAR
    await cargarObjetos();

});
