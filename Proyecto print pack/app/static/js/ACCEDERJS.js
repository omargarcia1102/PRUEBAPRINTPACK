document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const usuario = document.getElementById("userInput").value;
            const password = document.getElementById("passInput").value;

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });

            const data = await res.json();

            if (data.ok) {
                alert("¡Bienvenido, Administrador!");
                window.location.href = "/inventario";
            } else {
                alert(data.mensaje || "Credenciales incorrectas");
            }
        });
    }
});