document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch('/api/sesion');
        const sesion = await res.json();

        if (sesion.activo) {
            // Cambiamos el saludo si tienes el nombre del usuario
            document.getElementById('saludo-usuario').innerText = `Bienvenido al sistema de gestión, ${sesion.usuario || ''}`;
            
            // Si es admin, le quitamos la clase que oculta la tarjeta de usuarios
            if (sesion.rol === 'admin') {
                const cardUsuarios = document.getElementById('card-usuarios');
                if (cardUsuarios) {
                    cardUsuarios.classList.remove('admin-only');
                }
            }
        }
    } catch (error) {
        console.error("Error cargando perfil", error);
    }
});
