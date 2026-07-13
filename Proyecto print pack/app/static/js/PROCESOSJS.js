document.addEventListener("DOMContentLoaded", async () => {
    const authButton     = document.getElementById("auth-button");
    const inventarioLink = document.getElementById("inventario-link");

    // Consulta si hay sesión activa
    const res    = await fetch('/api/sesion');
    const sesion = await res.json();

    if (sesion.activo && sesion.es_admin) {
        // Mostrar enlace de inventario
        if (inventarioLink) inventarioLink.style.display = "list-item";

        // Cambiar boton a Cerrar Sesion
        if (authButton) {
            authButton.textContent = "Cerrar Sesión (Admin)";
            authButton.href = "/logout";
        }
    } else {
        // Sin sesion
        if (authButton) {
            authButton.textContent = "Acceder";
            authButton.href = "/acceder";
        }
        if (inventarioLink) inventarioLink.style.display = "none";
    }
});
