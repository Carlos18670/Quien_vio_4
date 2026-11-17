
import { supabase } from '../supabase.js';
import { protegerPagina } from '../proteger-pagina.js';

document.addEventListener('DOMContentLoaded', async () => {

    const accesoPermitido = await protegerPagina();
    if (!accesoPermitido) return;

    const alertas = document.getElementById('alertas-coincidencias');
    const correo = document.getElementById('notificaciones-correo');
    const mensaje = document.getElementById('mensaje-ajustes');

    const { data: usuarioData } = await supabase.auth.getUser();

    if (!usuarioData.user) return;

    const usuarioId = usuarioData.user.id;

    // CARGAR PREFERENCIAS
    const { data, error } = await supabase
        .from('usuarios')
        .select('alertas_coincidencias, notificaciones_correo')
        .eq('id', usuarioId)
        .single();

    if (error) {
        console.error(error);
        mensaje.textContent = 'No se pudieron cargar los ajustes.';
        return;
    }

    alertas.checked = data.alertas_coincidencias ?? true;
    correo.checked = data.notificaciones_correo ?? true;

    // GUARDAR CAMBIOS
    async function guardarAjustes() {

        mensaje.textContent = 'Guardando...';

        const { error } = await supabase
            .from('usuarios')
            .update({
                alertas_coincidencias: alertas.checked,
                notificaciones_correo: correo.checked
            })
            .eq('id', usuarioId);

        if (error) {
            console.error(error);
            mensaje.textContent = 'Error al guardar los ajustes.';
            return;
        }

        mensaje.textContent = '¡Preferencias guardadas correctamente!';
    }

    alertas.addEventListener('change', guardarAjustes);
    correo.addEventListener('change', guardarAjustes);

});
