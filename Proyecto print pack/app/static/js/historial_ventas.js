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
        
        if (!response.ok) {
            alert(`Error en el servidor: ${response.status}`);
            return;
        }

        const rawData = await response.json();
        console.log("Datos crudos recibidos:", rawData);

        // 1. AUTO-NORMALIZACIÓN: Por si los datos vienen envueltos en una lista o en una propiedad '.data'
        let data = rawData;
        if (Array.isArray(rawData)) {
            data = rawData[0];
        } else if (rawData && rawData.data) {
            data = rawData.data;
        }

        if (!data) {
            alert("La API devolvió un objeto vacío.");
            return;
        }

        // 2. AVISO DE DIAGNÓSTICO TEMPORAL: Te dirá exactamente qué llaves detecta el navegador
        const llavesDetectadas = Object.keys(data).join(", ");
        alert(`¡Conexión exitosa!\nLlaves que envió el servidor: [${llavesDetectadas}]`);

        // 3. LLENAR DATOS DE LA CABECERA (Soporta minúsculas y mayúsculas comunes)
        document.getElementById('tituloModalFactura').innerText = `Factura #${data.id || idVenta}`;
        document.getElementById('detalleCliente').innerText = data.nombre_cliente || data.cliente || data.Cliente || 'N/A';
        document.getElementById('detalleFecha').innerText = data.fecha || data.Fecha ? new Date(data.fecha || data.Fecha).toLocaleString('es-CO') : 'N/A';
        document.getElementById('detalleTotal').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.total || data.Total || 0);

        // 4. PROCESAR PRODUCTOS VINCULADOS
        const items = data.items || data.productos || data.Productos || [];
        const tbodyItems = document.getElementById('tablaDetalleItems');
        
        if (tbodyItems) {
            tbodyItems.innerHTML = '';
            
            if (items && items.length > 0) {
                items.forEach(item => {
                    // Soporta variaciones comunes de nombres de columnas
                    const nombreProd = item.nombre_producto || item.producto || item.nombre || 'Desconocido';
                    const cantidad = item.cantidad || item.Cant || 0;
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
                tbodyItems.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No se encontraron productos vinculados en esta estructura.</td></tr>`;
            }
        }

        modalDetalle.show();

    } catch (error) {
        console.error("Error en JS:", error);
        alert("Error en el navegador:\n" + error.message);
    }
}
