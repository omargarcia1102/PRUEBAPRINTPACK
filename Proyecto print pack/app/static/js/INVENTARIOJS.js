document.addEventListener("DOMContentLoaded", async () => {

    // Cargar productos desde la BD
    await cargarProductos();

    // --- AGREGAR ---
    const formAgregar = document.querySelector("#form-agregar form");
    formAgregar.onsubmit = async (e) => {
        e.preventDefault();
        const inputs  = formAgregar.querySelectorAll('input');
        const selects = formAgregar.querySelectorAll('select');
        const textarea = formAgregar.querySelector('textarea');

        const nuevo = {
            nombre: inputs[0].value,   codigo:   inputs[1].value,
            tipo:   selects[0].value,  categoria: selects[1].value,
            capas:  inputs[2].value,   espesor:  inputs[3].value,
            material: inputs[4].value, color:    inputs[5].value,
            dimensiones: inputs[6].value, peso:  inputs[7].value,
            stock:  inputs[8].value,   unidad:   selects[2].value,
            bodega: inputs[9].value,   proveedor: inputs[10].value,
            costo:  inputs[11].value,  fecha:    inputs[12].value,
            notas:  textarea.value
        };

        const res = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevo)
        });

        if (res.ok) {
            alert("Producto guardado");
            formAgregar.reset();
            await cargarProductos();
        }
    };

    // --- EDITAR (CORREGIDO CON EL NUEVO INPUT DE MATERIAL) ---
    const formEditar  = document.querySelector("#form-editar form");
    const selectEditar = document.getElementById("select-editar-producto");

    selectEditar.onchange = () => {
        const id = selectEditar.value;
        if (!id) return;
        const p = productos.find(x => x.id == id);
        const inputs  = formEditar.querySelectorAll('input');
        const selects = formEditar.querySelectorAll('select:not(#select-editar-producto)');
        const textarea = formEditar.querySelector('textarea');

        // Mapeo ajustado por la inserción de Material Base
        inputs[0].value  = p.nombre   || '';
        inputs[1].value  = p.codigo   || '';
        selects[0].value = p.tipo     || '';
        inputs[2].value  = p.capas    || '';
        inputs[3].value  = p.espesor  || '';
        inputs[4].value  = p.material || ''; // <-- NUEVO: Ahora sí muestra el Material Base aquí
        inputs[5].value  = p.color    || ''; // Movido al índice 5
        inputs[6].value  = p.stock    || ''; // Movido al índice 6
        inputs[7].value  = p.bodega   || ''; // Movido al índice 7
        inputs[8].value  = p.costo    || ''; // Movido al índice 8
        inputs[9].value  = p.fecha_ingreso || p.fecha || ''; // Movido al índice 9
        textarea.value   = p.notas    || '';
    };

    formEditar.onsubmit = async (e) => {
        e.preventDefault();
        const id = selectEditar.value;
        if (!id) { alert("Selecciona un producto"); return; }

        const inputs  = formEditar.querySelectorAll('input');
        const selects = formEditar.querySelectorAll('select:not(#select-editar-producto)');
        const textarea = formEditar.querySelector('textarea');

        // Recolección de datos ajustada con los nuevos índices +1
        const actualizado = {
            nombre:   inputs[0].value,  
            codigo:   inputs[1].value,
            tipo:     selects[0].value, 
            capas:    inputs[2].value,
            espesor:  inputs[3].value,  
            material: inputs[4].value, // <-- NUEVO: Envía el material modificado
            color:    inputs[5].value,  
            stock:    inputs[6].value,  
            bodega:   inputs[7].value,  
            costo:    inputs[8].value,  
            fecha:    inputs[9].value,
            notas:    textarea.value
        };

        const res = await fetch(`/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actualizado)
        });

        if (res.ok) {
            alert("Producto actualizado");
            formEditar.reset();
            await cargarProductos();
        }
    };
});

// --- VARIABLES Y FUNCIONES GLOBALES ---
let productos = [];

async function cargarProductos() {
    const res = await fetch('/api/productos');
    productos = await res.json();
    actualizarTablaYSelects();
}

function convertirFecha(fechaUTC) {
    const fecha = new Date(fechaUTC + ' UTC');
    return fecha.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function actualizarTablaYSelects() {
    const cuerpo     = document.getElementById("cuerpo-tabla");
    const selectEdit = document.getElementById("select-editar-producto");
    const selectDel  = document.getElementById("select-eliminar-producto");
    const statTotal    = document.getElementById("stat-total-productos");
    const statUnidades = document.getElementById("stat-total-unidades");

    cuerpo.innerHTML     = "";
    selectEdit.innerHTML = '<option value="">-- Selecciona --</option>';
    selectDel.innerHTML  = '<option value="">-- Selecciona --</option>';

    let unidadesTotales = 0;

    productos.forEach(p => {
        const precio = p.costo 
            ? new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(p.costo)
            : 'No definido';

        const stockNum = Number(p.stock) || 0;
        unidadesTotales += stockNum;

        let badgeClase = 'badge-ok';
        let badgeTexto = 'En stock';
        if (stockNum === 0) { badgeClase = 'badge-out'; badgeTexto = 'Agotado'; }
        else if (stockNum <= 10) { badgeClase = 'badge-low'; badgeTexto = 'Stock bajo'; }

        cuerpo.innerHTML += `
            <tr>
                <td class="col-nombre">${p.nombre}</td>
                <td>${p.codigo || '—'}</td>
                <td><span class="badge ${badgeClase}">${badgeTexto} · ${stockNum}</span></td>
                <td>${precio}</td>
                <td>${p.bodega || '—'}</td>
            </tr>`;
        const opt = `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`;
        selectEdit.innerHTML += opt;
        selectDel.innerHTML  += opt;
    });

    if (statTotal) statTotal.textContent = productos.length;
    if (statUnidades) statUnidades.textContent = unidadesTotales.toLocaleString('es-CO');
}

function mostrarSubSeccionInventario(tipo, elemento) {
    document.querySelectorAll('.admin-options a').forEach(a => a.classList.remove('option-active'));
    elemento.classList.add('option-active');
    document.querySelectorAll('.inventario-form').forEach(f => f.classList.remove('active-form'));
    document.getElementById(`form-${tipo}`).classList.add('active-form');

     if (tipo === 'historial') cargarHistorial();
}

async function confirmarEliminacion() {
    const select = document.getElementById("select-eliminar-producto");
    const id = select.value;
    if (!id) { alert("Selecciona un producto"); return; }

    const p = productos.find(x => x.id == id);
    if (confirm(`¿Seguro que quieres eliminar ${p.nombre}?`)) {
        const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Eliminado correctamente");
            await cargarProductos();
        }
    }
}

async function cargarHistorial() {
    const res = await fetch('/api/movimientos');
    const movimientos = await res.json();
    const cuerpo = document.getElementById('cuerpo-historial');
    cuerpo.innerHTML = '';

    const clases = {
        'AGREGAR':  'badge-ok',
        'EDITAR':   'badge-low',
        'ELIMINAR': 'badge-out'
    };

    movimientos.forEach(m => {
        cuerpo.innerHTML += `
            <tr>
                <td>${convertirFecha(m.fecha)}</td>
                <td>${m.nombre_producto}</td>
                <td><span class="badge ${clases[m.tipo_movimiento] || 'badge-low'}">${m.tipo_movimiento}</span></td>
                <td>${m.usuario}</td>
                <td>${m.stock_anterior} → ${m.stock_nuevo}</td>
            </tr>
        `;
    });
}
