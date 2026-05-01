document.addEventListener("DOMContentLoaded", async () => {
    const authButton     = document.getElementById("auth-button");
    const inventarioLink = document.getElementById("inventario-link");

    // Consulta al servidor si hay sesión activa
    const res    = await fetch('/api/sesion');
    const sesion = await res.json();

    if (sesion.activo && sesion.es_admin) {
        // Mostrar enlace de inventario
        if (inventarioLink) inventarioLink.style.display = "list-item";

        // Cambiar botón a "Cerrar Sesión"
        if (authButton) {
            authButton.textContent = "Cerrar Sesión (Admin)";
            authButton.href = "/logout";
        }
    } else {
        // Sin sesión, botón normal
        if (authButton) {
            authButton.textContent = "Acceder";
            authButton.href = "/acceder";
        }
        if (inventarioLink) inventarioLink.style.display = "none";
    }
});