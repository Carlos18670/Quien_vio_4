import { supabase } from './supabase.js';

const contenedorMenu = document.getElementById("sidebar-container");

if (contenedorMenu) {

    const paginaActual = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    // OPCIONES DEL MENÚ
    const opciones = [
        { nombre: "Inicio", archivo: "inicio.html", icono: "⌂" },
        { nombre: "Explorar objetos", archivo: "explorar-objetos.html", icono: "⌕" },
        { nombre: "Buscar coincidencias", archivo: "buscar-coincidencias.html", icono: "⌕" },
        { nombre: "Reportar objeto perdido", archivo: "reportar-perdido.html", icono: "＋" },
        { nombre: "Reportar objeto encontrado", archivo: "reportar-encontrado.html", icono: "+" },
        { nombre: "Mis reportes", archivo: "mis-reportes.html", icono: "▤" },
        { nombre: "Mensajes", archivo: "mensajes.html", icono: "✉" },
        { nombre: "Ajustes de la aplicación", archivo: "ajustes.html", icono: "⚙" },
        { nombre: "Sobre ¿Quién lo vio?", archivo: "acerca.html", icono: "ⓘ" },
        { nombre: "Notificaciones", archivo: "notificaciones.html", icono: "🔔" }
    ];

    // CONSTRUIR MENÚ
    contenedorMenu.innerHTML = `
        <aside class="sidebar" id="sidebar">

            <a href="inicio.html" class="brand-link">
                <img
                    src="../css/logo.png"
                    alt="Logo de ¿Quién lo vio?"
                    class="brand-logo"
                >

                <span>
                    <b>¿Quién lo vio?</b>
                    <small>Sistema Inteligente de Objetos Perdidos</small>
                </span>
            </a>

            <nav>
                ${opciones.map(opcion => `
                    <a
                        href="${opcion.archivo}"
                        class="${paginaActual === opcion.archivo ? "active" : ""}"
                    >
                        <span class="nav-icon">${opcion.icono}</span>
                        <span>${opcion.nombre}</span>
                    </a>
                `).join("")}
            </nav>

            <div class="sidebar-footer">
                <a href="#" id="cerrar-sesion" class="logout-link">
                    <span class="nav-icon">↪</span>
                    <span>Cerrar sesión</span>
                </a>
            </div>

        </aside>
    `;

    const sidebar = document.getElementById("sidebar");

    // CREAR BOTÓN HAMBURGUESA
    const botonMenu = document.createElement("button");

    botonMenu.type = "button";
    botonMenu.className = "menu-toggle";
    botonMenu.id = "menu-toggle";
    botonMenu.textContent = "☰";
    botonMenu.setAttribute("aria-label", "Abrir menú");
    botonMenu.setAttribute("aria-expanded", "false");

    // COLOCAR BOTÓN EN LA BARRA SUPERIOR
    const topbar = document.querySelector(".topbar");

    if (topbar) {
        topbar.prepend(botonMenu);
    } else {
        contenedorMenu.before(botonMenu);
    }

    // CREAR FONDO OSCURO
    const overlay = document.createElement("div");

    overlay.className = "sidebar-overlay";
    overlay.id = "sidebar-overlay";

    document.body.appendChild(overlay);

    // DETECTAR CELULAR
    const esMovil = () =>
        window.matchMedia("(max-width: 768px)").matches;

    // ABRIR MENÚ
    function abrirMenu() {

        if (esMovil()) {

            sidebar.classList.add("sidebar-open");
            overlay.classList.add("overlay-visible");

            document.body.classList.add("mobile-menu-open");

            botonMenu.setAttribute("aria-expanded", "true");
            botonMenu.setAttribute("aria-label", "Cerrar menú");

        } else {

            document.body.classList.toggle("sidebar-collapsed");

            const visible =
                !document.body.classList.contains("sidebar-collapsed");

            botonMenu.setAttribute("aria-expanded", String(visible));
        }
    }

    // CERRAR MENÚ
    function cerrarMenu() {

        sidebar.classList.remove("sidebar-open");
        overlay.classList.remove("overlay-visible");

        document.body.classList.remove("mobile-menu-open");

        document.body.classList.remove("sidebar-collapsed");

        botonMenu.setAttribute("aria-expanded", "false");
        botonMenu.setAttribute("aria-label", "Abrir menú");
    }

    // BOTÓN HAMBURGUESA
    botonMenu.addEventListener("click", () => {

        if (esMovil()) {

            if (sidebar.classList.contains("sidebar-open")) {
                cerrarMenu();
            } else {
                abrirMenu();
            }

        } else {
            abrirMenu();
        }

    });

    // CERRAR AL TOCAR EL FONDO
    overlay.addEventListener("click", cerrarMenu);

    // CERRAR AL SELECCIONAR UNA OPCIÓN
    sidebar.querySelectorAll("nav a").forEach(enlace => {

        enlace.addEventListener("click", () => {

            if (esMovil()) {
                cerrarMenu();
            }

        });

    });

    // CERRAR SESIÓN
    const botonCerrarSesion =
        document.getElementById("cerrar-sesion");

    botonCerrarSesion.addEventListener("click", async e => {

        e.preventDefault();

        const confirmar = confirm("¿Deseas cerrar tu sesión?");

        if (!confirmar) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("No se pudo cerrar la sesión: " + error.message);
            return;
        }

        window.location.href = "login.html";
    });

    // CERRAR CON ESCAPE
    document.addEventListener("keydown", e => {

        if (e.key === "Escape") {
            cerrarMenu();
        }

    });

    // ADAPTAR AL CAMBIAR EL TAMAÑO DE PANTALLA
    window.addEventListener("resize", () => {

        cerrarMenu();

    });

}


// =====================================
// CARGAR FOTO DE PERFIL
// =====================================

async function cargarFotoPerfil() {

    const { data: usuarioData, error: errorUsuario } =
        await supabase.auth.getUser();

    if (errorUsuario || !usuarioData.user) return;

    const usuario = usuarioData.user;

    const { data, error } = await supabase
        .from("usuarios")
        .select("foto_perfil")
        .eq("id", usuario.id)
        .single();

    if (error) {
        console.error(
            "Error al cargar la foto de perfil:",
            error
        );
        return;
    }

    if (!data?.foto_perfil) return;

    const avatares = document.querySelectorAll(
        ".topbar .avatar.small"
    );

    avatares.forEach(avatar => {

        const imagen = document.createElement("img");

        imagen.src = data.foto_perfil;
        imagen.alt = "Foto de perfil";
        imagen.className = "foto-avatar-menu";

        avatar.innerHTML = "";
        avatar.appendChild(imagen);

    });

}

cargarFotoPerfil();

