// Variables globales del módulo de ventas
let productosStock = [];
let carrito = [];
let modalCliente;

// Inicialización al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    // Inicializar el modal de Bootstrap de forma segura
    const modalElement = document.getElementById('modalNuevoCliente');
    if (modalElement) {
        modalCliente = new bootstrap.Modal(modalElement);
    }
    
    cargarClientes();
    cargarProductos();
});

// ==========================================
// LOGICA DE CONSUMO DE APIS (FETCH)
// ==========================================
async function cargarClientes() {
    try {
        const res = await fetch('/api/clientes');
        const clientes = await res.json();
        const select = document.getElementById('selectCliente');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione un cliente...</option>';
        clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre} ${c.empresa ? ' - ' + c.empresa : ''}</option>`;
        });
    } catch (error) {
        console.error("Error cargando clientes:", error);
    }
}

async function cargarProductos() {
    try {
        const res = await fetch('/api/productos');
        productosStock = await res.json();
        renderizarCatalogo(productosStock);
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// ==========================================
// LOGICA DEL CATÁLOGO DE PRODUCTOS
// ==========================================
function renderizarCatalogo(productos) {
    const contenedor = document.getElementById('listaProductos');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    productos.forEach(p => {
        const sinStock = p.stock <= 0;
        const badgeColor = sinStock ? 'bg-danger' : (p.stock <= 50 ? 'bg-warning text-dark' : 'bg-success');
        const precioFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.costo || 0);
        
        contenedor.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 producto-card ${sinStock ? 'opacity-50' : ''}" onclick="${sinStock ? '' : `agregarAlCarrito(${p.id})`}">
                    <div class="card-body p-3">
                        <h6 class="card-title text-truncate mb-1" title="${p.nombre}">${p.nombre}</h6>
                        <small class="text-muted d-block mb-2">Cód: ${p.codigo}</small>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-primary">${precioFmt}</span>
                            <span class="badge ${badgeColor}">${p.stock} unds</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function filtrarProductos() {
    const texto = document.getElementById('buscarProducto').value.toLowerCase();
    const filtrados = productosStock.filter(p => 
        p.nombre.toLowerCase().includes(texto) || p.codigo.toLowerCase().includes(texto)
    );
    renderizarCatalogo(filtrados);
}

// ==========================================
// LOGICA DEL CARRITO DE COMPRAS
// ==========================================
function agregarAlCarrito(idProducto) {
    const prod = productosStock.find(p => p.id === idProducto);
    if (!prod || prod.stock <= 0) return;

    const itemExistente = carrito.find(i => i.id_producto === idProducto);
    
    if (itemExistente) {
        if (itemExistente.amount < prod.stock) {
            itemExistente.cantidad++;
        } else {
            alert(`No puedes agregar más. El stock máximo es de ${prod.stock} unidades.`);
        }
    } else {
        carrito.push({
            id_producto: prod.id,
            nombre_producto: prod.nombre,
            precio_unitario: parseFloat(prod.costo || 0),
            cantidad: 1,
            stock_maximo: prod.stock
        });
    }
    actualizarUI();
}

function modificarCantidad(idProducto, delta) {
    const item = carrito.find(i => i.id_producto === idProducto);
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad > item.stock_maximo) {
        alert(`Límite de stock excedido. Máximo disponible: ${item.stock_maximo}`);
        return;
    }
    
    if (nuevaCantidad <= 0) {
        carrito = carrito.filter(i => i.id_producto !== idProducto);
    } else {
        item.cantidad = nuevaCantidad;
    }
    actualizarUI();
}

// NUEVA FUNCIÓN: Permite la escritura manual de datos validando los límites
function cambiarCantidadManual(idProducto, valor) {
    const item = carrito.find(i => i.id_producto === idProducto);
    if (!item) return;

    let nuevaCantidad = parseInt(valor);

    // Validar que sea un número real y positivo
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
        alert("Cantidad inválida. Se restablecerá a 1.");
        item.cantidad = 1;
    } 
    // Validar que no supere el inventario físico
    else if (nuevaCantidad > item.stock_maximo) {
        alert(`Stock insuficiente. Solo quedan ${item.stock_maximo} unidades disponibles.`);
        item.cantidad = item.stock_maximo;
    } 
    else {
        item.cantidad = nuevaCantidad;
    }
    actualizarUI();
}

function actualizarUI() {
    const tbody = document.getElementById('tablaCarrito');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;

    carrito.forEach(item => {
        const subtotal = item.cantidad * item.precio_unitario;
        total += subtotal;
        
        const pFmt = new Intl.NumberFormat('es-CO').format(item.precio_unitario);
        const subFmt = new Intl.NumberFormat('es-CO').format(subtotal);

        tbody.innerHTML += `
            <tr>
                <td class="text-truncate" style="max-width: 140px;" title="${item.nombre_producto}">
                    <small class="fw-bold">${item.nombre_producto}</small>
                </td>
                <td>
                    <!-- Control con input manual y libre -->
                    <div class="input-group input-group-sm" style="width: 100px;">
                        <button class="btn btn-outline-secondary px-2" type="button" onclick="modificarCantidad(${item.id_producto}, -1)">-</button>
                        <input type="number" class="form-control text-center px-1" value="${item.cantidad}" min="1" max="${item.stock_maximo}" onchange="cambiarCantidadManual(${item.id_producto}, this.value)">
                        <button class="btn btn-outline-secondary px-2" type="button" onclick="modificarCantidad(${item.id_producto}, 1)">+</button>
                    </div>
                </td>
                <td><small>$${pFmt}</small></td>
                <td class="fw-bold text-end">$${subFmt}</td>
                <td class="text-end">
                    <button class="btn btn-sm text-danger p-1" onclick="modificarCantidad(${item.id_producto}, -999)" title="Eliminar item">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById('totalVenta').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total);
}

// ==========================================
// PROCESAMIENTO DE ORDEN (POST)
// ==========================================
async function procesarVenta() {
    const idCliente = document.getElementById('selectCliente').value;
    const notas = document.getElementById('notasVenta').value;

    if (!idCliente) return alert('Por favor, seleccione un cliente primero.');
    if (carrito.length === 0) return alert('El carrito de compras está vacío.');

    const boton = document.getElementById('btnProcesarVenta');
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando Factura...';

    try {
        const response = await fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cliente: idCliente,
                notas: notas,
                items: carrito
            })
        });

        const data = await response.json();

        if (data.ok) {
            alert(`¡Venta Exitosa!\nFactura: ${data.numero_factura}\nTotal procesado con éxito.`);
            carrito = []; 
            document.getElementById('notasVenta').value = '';
            document.getElementById('selectCliente').value = '';
            actualizarUI();
            await cargarProductos(); // Sincroniza stocks en tiempo real
        } else {
            alert('Error en servidor: ' + data.mensaje);
        }
    } catch (error) {
        alert('Error fatal de conexión.');
    } finally {
        boton.disabled = false;
        boton.innerHTML = '<i class="bi bi-check-circle"></i> Procesar Venta';
    }
}

// ==========================================
// GESTIÓN DE CLIENTES DESDE MODAL
// ==========================================
function mostrarModalCliente() {
    document.getElementById('formCliente').reset();
    if (modalCliente) modalCliente.show();
}

async function guardarCliente() {
    const nombre = document.getElementById('cliNombre').value.trim();
    const telefono = document.getElementById('cliTelefono').value.trim();
    
    if (!nombre || !telefono) return alert("El nombre y el teléfono son campos obligatorios.");

    const payload = {
        nombre: nombre,
        telefono: telefono,
        empresa: document.getElementById('cliEmpresa').value.trim(),
        email: document.getElementById('cliEmail').value.trim()
    };

    try {
        const response = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            await cargarClientes(); 
            if (modalCliente) modalCliente.hide();
            alert("Cliente registrado correctamente.");
        } else {
            const errData = await response.json();
            alert("No se pudo registrar: " + (errData.mensaje || "Error interno"));
        }
    } catch (error) {
        alert("Error de red al intentar guardar el cliente.");
    }
}
