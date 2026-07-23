let listaVentas = [];
let modalDetalle;

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('modalDetalleVenta');
    if (modalElement) {
        modalDetalle = new bootstrap.Modal(modalElement);
    }
    cargarVentas();
});


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


function filtrarVentas() {
    const texto = document.getElementById('buscarFactura').value.toLowerCase();
    const filtrados = listaVentas.filter(v => 
        v.nombre_cliente.toLowerCase().includes(texto) || 
        v.id.toString().includes(texto)
    );
    renderizarTablaVentas(filtrados);
}


async function verDetalle(idVenta) {
    try {
        const response = await fetch(`/api/ventas/${idVenta}`);
        
        if (!response.ok) {
            alert(`Error en el servidor al consultar la factura.`);
            return;
        }

        const data = await response.json();

      
        const venta = data.venta;
        const detalles = data.detalle;

        if (!venta) {
            alert("No se encontró la información principal de la venta.");
            return;
        }

        
        document.getElementById('tituloModalFactura').innerText = `Factura #${venta.id || idVenta}`;
        document.getElementById('detalleCliente').innerText = venta.nombre_cliente || venta.cliente || 'N/A';
        document.getElementById('detalleFecha').innerText = venta.fecha ? new Date(venta.fecha).toLocaleString('es-CO') : 'N/A';
        document.getElementById('detalleTotal').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(venta.total || 0);

        
        const tbodyItems = document.getElementById('tablaDetalleItems');
        
        if (tbodyItems) {
            tbodyItems.innerHTML = '';
            
            if (detalles && detalles.length > 0) {
                detalles.forEach(item => {
                    const nombreProd = item.nombre_producto || item.producto || item.nombre || 'Desconocido';
                    const cantidad = item.cantidad || 0;
                    const precio = item.precio_unitario || item.precio || 0;
                    const subtotal = item.subtotal || (cantidad * precio);

                    const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(precio);
                    const subtotalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subtotal);
                    
                    tbodyItems.innerHTML += `
                        <tr>
                            <td>${nombreProd}</td>
                            <td class="text-center">${cantidad}</td>
                            <td class="text-end text-muted">${precioFmt}</td>
                            <td class="text-end fw-bold">${subtotalFmt}</td>
                        </tr>
                    `;
                });
            } else {
                tbodyItems.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No se encontraron productos vinculados en esta factura.</td></tr>`;
            }
        }

        modalDetalle.show();

    } catch (error) {
        console.error("Error en JS:", error);
        alert("Ocurrió un error al procesar los datos de la factura.");
    }
}
