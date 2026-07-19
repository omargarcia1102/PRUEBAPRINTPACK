document.addEventListener("DOMContentLoaded", async () => {
    const authButton     = document.getElementById("auth-button");
    const inventarioLink = document.getElementById("inventario-link");
    const panelErpLink   = document.getElementById("panel-erp-link"); // <-- 1. Capturamos el nuevo enlace

    try {
        // Consulta si hay sesion activa
        const res    = await fetch('/api/sesion');
        const sesion = await res.json();

        // Evaluamos solo si está activo (para que entren admins y asesores)
        if (sesion.activo) {
            // Mostrar enlaces
            if (inventarioLink) inventarioLink.style.display = "list-item";
            if (panelErpLink) panelErpLink.style.display = "list-item"; // <-- 2. Lo mostramos

            // Cambiar boton a Cerrar Sesion (Le ponemos el rol dinámico si existe)
            if (authButton) {
                const rolTexto = sesion.rol ? ` (${sesion.rol.toUpperCase()})` : '';
                authButton.textContent = `Cerrar Sesión${rolTexto}`;
                authButton.href = "/logout";
            }
        } else {
            // Sin sesion
            if (authButton) {
                authButton.textContent = "Acceder";
                authButton.href = "/acceder";
            }
            if (inventarioLink) inventarioLink.style.display = "none";
            if (panelErpLink) panelErpLink.style.display = "none"; // <-- 3. Lo ocultamos
        }
    } catch (error) {
        console.error("Error al verificar la sesión:", error);
    }
});
