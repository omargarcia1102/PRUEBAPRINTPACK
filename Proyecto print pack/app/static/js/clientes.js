let modalCliente;
let listaClientesGlobal = []; // Memoria temporal para poder editar
let clienteEditandoId = null; // Saber si estamos creando o editando

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('modalNuevoCliente');
    if (modalElement) {
        modalCliente = new bootstrap.Modal(modalElement);
    }
    cargarClientes();
});

// ==========================================
// 1. CARGAR DATOS (GET)
// ==========================================
async function cargarClientes() {
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error("Error en el servidor");
        
        listaClientesGlobal = await response.json();
        renderizarTabla(listaClientesGlobal);
    } catch (error) {
        console.error(error);
        alert("Hubo un problema al cargar los clientes.");
    }
}

// ==========================================
// 2. RENDERIZAR TABLA
// ==========================================
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
                    <!-- AQUÍ LE DIMOS VIDA AL LÁPIZ -->
                    <button class="btn btn-sm btn-outline-primary" title="Editar" onclick="abrirModalEditar(${c.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 3. MANEJO DEL MODAL (NUEVO VS EDITAR)
// ==========================================
function abrirModalCliente() {
    clienteEditandoId = null; // Limpiamos el ID porque es uno nuevo
    document.getElementById('formCliente').reset();
    document.querySelector('.modal-title').innerText = "Nuevo Cliente";
    modalCliente.show();
}

function abrirModalEditar(id) {
    clienteEditandoId = id; // Guardamos el ID del cliente que vamos a editar
    
    // Buscamos los datos exactos de ese cliente en nuestra memoria global
    const cliente = listaClientesGlobal.find(c => c.id === id);
    if (!cliente) return;

    // Llenamos el formulario con sus datos actuales
    document.getElementById('cliNombre').value = cliente.nombre || '';
    document.getElementById('cliTelefono').value = cliente.telefono || '';
    document.getElementById('cliEmpresa').value = cliente.empresa || '';
    document.getElementById('cliEmail').value = cliente.email || '';

    // Cambiamos el título visualmente
    document.querySelector('.modal-title').innerText = "Editar Cliente";
    modalCliente.show();
}

// ==========================================
// 4. GUARDAR DATOS (POST o PUT)
// ==========================================
async function guardarCliente() {
    const nombre = document.getElementById('cliNombre').value.trim();
    const telefono = document.getElementById('cliTelefono').value.trim();
    
    if (!nombre || !telefono) {
        return alert("El nombre y el teléfono son obligatorios.");
    }

    const payload = {
        nombre: nombre,
        telefono: telefono,
        empresa: document.getElementById('cliEmpresa').value.trim(),
        email: document.getElementById('cliEmail').value.trim()
    };

    const boton = document.getElementById('btnGuardar');
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    // LÓGICA CLAVE: Si hay un ID guardado, es PUT (Editar). Si es null, es POST (Crear).
    const url = clienteEditandoId ? `/api/clientes/${clienteEditandoId}` : '/api/clientes';
    const metodoHTTP = clienteEditandoId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodoHTTP,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.ok) {
            alert(clienteEditandoId ? "¡Cliente actualizado con éxito!" : "¡Cliente registrado con éxito!");
            modalCliente.hide();
            cargarClientes(); // Recargar la tabla automáticamente con los nuevos datos
        } else {
            alert("Error: " + (data.mensaje || "Revisa la conexión."));
        }
    } catch (error) {
        alert("Fallo de red al intentar comunicarse con el servidor.");
    } finally {
        boton.disabled = false;
        boton.innerHTML = '<i class="bi bi-save"></i> Guardar Cliente';
    }
}
