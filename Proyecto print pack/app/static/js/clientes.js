let modalCliente;

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar el modal de Bootstrap
    const modalElement = document.getElementById('modalNuevoCliente');
    if (modalElement) {
        modalCliente = new bootstrap.Modal(modalElement);
    }
    
    // Cargar la tabla al iniciar
    cargarClientes();
});

// Consumir API (GET)
async function cargarClientes() {
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error("Error en el servidor");
        
        const clientes = await response.json();
        renderizarTabla(clientes);
    } catch (error) {
        console.error(error);
        alert("Hubo un problema al cargar los clientes.");
    }
}

// Pintar la tabla
function renderizarTabla(clientes) {
    const tbody = document.getElementById('tablaClientes');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay clientes registrados aún.</td></tr>';
        return;
    }

    clientes.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${c.nombre || 'N/A'}</td>
                <td>${c.telefono || 'N/A'}</td>
                <td><span class="badge bg-secondary">${c.empresa || 'Ninguna'}</span></td>
                <td>${c.email || 'N/A'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" title="Editar (Próximamente)">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Abrir el modal limpio
function abrirModalCliente() {
    document.getElementById('formCliente').reset();
    modalCliente.show();
}

// Enviar datos a la API (POST)
async function guardarCliente() {
    const nombre = document.getElementById('cliNombre').value.trim();
    const telefono = document.getElementById('cliTelefono').value.trim();
    
    if (!nombre || !telefono) {
        alert("El nombre y el teléfono son obligatorios.");
        return;
    }

    const payload = {
        nombre: nombre,
        telefono: telefono,
        empresa: document.getElementById('cliEmpresa').value.trim(),
        email: document.getElementById('cliEmail').value.trim()
    };

    const boton = document.getElementById('btnGuardar');
    boton.disabled = true;
    boton.innerHTML = "Guardando...";

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.ok) {
            alert("¡Cliente registrado con éxito!");
            modalCliente.hide();
            cargarClientes(); // Recargar la tabla automáticamente
        } else {
            alert("Error al registrar: " + (data.mensaje || "Revisa la conexión."));
        }
    } catch (error) {
        alert("Fallo de red al intentar guardar el cliente.");
    } finally {
        boton.disabled = false;
        boton.innerHTML = '<i class="bi bi-save"></i> Guardar Cliente';
    }
}
