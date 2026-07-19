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
        const data = await response.json();

        // NUEVO: Si el backend responde con un error (404 o 500), muéstralo directamente
        if (!response.ok) {
            alert("Error del servidor: " + (data.mensaje || "Error desconocido"));
            return;
        }

        // Llenar datos de la cabecera del modal
        document.getElementById('tituloModalFactura').innerText = `Factura #${data.id}`;
        document.getElementById('detalleCliente').innerText = data.nombre_cliente;
        document.getElementById('detalleFecha').innerText = new Date(data.fecha).toLocaleString('es-CO');
        document.getElementById('detalleTotal').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.total);

        // Llenar tabla de items
        const tbodyItems = document.getElementById('tablaDetalleItems');
        if (tbodyItems) {
            tbodyItems.innerHTML = '';
            
            data.items.forEach(item => {
                const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.precio_unitario);
                const subtotalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.subtotal);
                
                tbodyItems.innerHTML += `
                    <tr>
                        <td>${item.nombre_producto}</td>
                        <td class="text-center">${item.cantidad}</td>
                        <td class="text-end text-muted">${precioFmt}</td>
                        <td class="text-end fw-bold">${subtotalFmt}</td>
                    </tr>
                `;
            });
        }

        modalDetalle.show();
    } catch (error) {
        console.error("Error al cargar detalle:", error);
        alert("Error de renderizado o comunicación en el navegador.");
    }
}
