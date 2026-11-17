
document.addEventListener('DOMContentLoaded', () => {

    const barra = document.getElementById('barra-mensajes');

    if (!barra) return;

    barra.innerHTML = `
        <nav class="navegacion-mensajes">

            <a href="inicio.html" class="logo-mensajes">
                ¿Quién lo vio?
            </a>

            <div class="iconos-navegacion">

                <a href="inicio.html" title="Inicio">
                    <span>⌂</span>
                    <small>Inicio</small>
                </a>

                <a href="buscar-coincidencias.html" title="Buscar">
                    <span>⌕</span>
                    <small>Buscar</small>
                </a>

                <a href="mis-reportes.html" title="Mis reportes">
                    <span>▤</span>
                    <small>Reportes</small>
                </a>

                <a href="perfil.html" title="Perfil">
                    <span>♙</span>
                    <small>Perfil</small>
                </a>

                <a href="mensajes.html" class="activo" title="Mensajes">
                    <span>✉</span>
                    <small>Mensajes</small>
                </a>

            </div>

        </nav>
    `;

});
