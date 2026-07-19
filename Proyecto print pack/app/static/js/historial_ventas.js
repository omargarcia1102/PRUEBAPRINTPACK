let listaVentas = [];
let modalDetalle;

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('modalDetalleVenta');
    if (modalElement) {
        modalDetalle = new bootstrap.Modal(modalElement);
    }
    cargarVentas();
});

// Consumir API para obtener todas las ventas
async function cargarVentas() {
    try {
        const response = await fetch('/api/ventas');
        const data = await response.json();
        listaVentas = data;
        renderizarTablaVentas(listaVentas);
    } catch (error) {
        console.error("Error al cargar el historial:", error);
    }
}

// Renderizar la tabla principal
function renderizarTablaVentas(ventas) {
    const tbody = document.getElementById('tablaVentas');
    if (!tbody) return;
    tbody.innerHTML = '';

    ventas.forEach(venta => {
        const totalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(venta.total);
        const fecha = new Date(venta.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">#${venta.id}</td>
                <td>${fecha}</td>
                <td>${venta.nombre_cliente}</td>
                <td><small class="text-muted">${venta.notas || 'N/A'}</small></td>
                <td class="text-end fw-bold">${totalFmt}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info" onclick="verDetalle(${venta.id})" title="Ver detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// Filtrar ventas en el buscador
function filtrarVentas() {
    const texto = document.getElementById('buscarFactura').value.toLowerCase();
    const filtrados = listaVentas.filter(v => 
        v.nombre_cliente.toLowerCase().includes(texto) || 
        v.id.toString().includes(texto)
    );
    renderizarTablaVentas(filtrados);
}

// Consumir API para ver el detalle de una factura específica
async function verDetalle(idVenta) {
    try {
        const response = await fetch(`/api/ventas/${idVenta}`);
        
        // 1. VERIFICAR PRIMERO: Si Flask respondió con un error (ej. 500 o 404)
        if (!response.ok) {
            const textoError = await response.text();
            console.error("Error detallado del servidor:", textoError);
            alert(`Error en el servidor (Código HTTP ${response.status}).\nRevisa los logs de Render o la consola del navegador (F12).`);
            return;
        }

        // 2. PROCESAR JSON: Solo si el servidor respondió con un estado exitoso (200)
        const data = await response.json();

        // Llenar datos de la cabecera del modal de forma segura
        document.getElementById('tituloModalFactura').innerText = `Factura #${data.id || idVenta}`;
        document.getElementById('detalleCliente').innerText = data.nombre_cliente || 'N/A';
        document.getElementById('detalleFecha').innerText = data.fecha ? new Date(data.fecha).toLocaleString('es-CO') : 'N/A';
        document.getElementById('detalleTotal').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.total || 0);

        // Llenar tabla de items
        const tbodyItems = document.getElementById('tablaDetalleItems');
        if (tbodyItems) {
            tbodyItems.innerHTML = '';
            
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach(item => {
                    const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.precio_unitario || 0);
                    const subtotalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.subtotal || 0);
                    
                    tbodyItems.innerHTML += `
                        <tr>
                            <td>${item.nombre_producto || 'Desconocido'}</td>
                            <td class="text-center">${item.cantidad || 0}</td>
                            <td class="text-end text-muted">${precioFmt}</td>
                            <td class="text-end fw-bold">${subtotalFmt}</td>
                        </tr>
                    `;
                });
            } else {
                tbodyItems.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No se encontraron productos vinculados.</td></tr>';
            }
        }

        // Mostrar el modal si está inicializado
        if (modalDetalle) {
            modalDetalle.show();
        } else {
            alert("El modal no se ha inicializado correctamente en el DOM.");
        }

    } catch (error) {
        // Captura cualquier error de sintaxis o variables no definidas en JavaScript
        console.error("Error completo en JavaScript:", error);
        alert("Error detectado en el navegador:\n" + error.message);
    }
}
