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

    // --- EDITAR ---
    const formEditar  = document.querySelector("#form-editar form");
    const selectEditar = document.getElementById("select-editar-producto");

    selectEditar.onchange = () => {
        const id = selectEditar.value;
        if (!id) return;
        const p = productos.find(x => x.id == id);
        const inputs  = formEditar.querySelectorAll('input');
        const selects = formEditar.querySelectorAll('select:not(#select-editar-producto)');
        const textarea = formEditar.querySelector('textarea');

        inputs[0].value  = p.nombre   || '';
        inputs[1].value  = p.codigo   || '';
        selects[0].value = p.tipo     || '';
        inputs[2].value  = p.capas    || '';
        inputs[3].value  = p.espesor  || '';
        inputs[4].value  = p.color    || '';
        inputs[5].value  = p.stock    || '';
        inputs[6].value  = p.bodega   || '';
        inputs[7].value  = p.costo    || '';
        inputs[8].value  = p.fecha_ingreso || '';
        textarea.value   = p.notas    || '';
    };

    formEditar.onsubmit = async (e) => {
        e.preventDefault();
        const id = selectEditar.value;
        if (!id) { alert("Selecciona un producto"); return; }

        const inputs  = formEditar.querySelectorAll('input');
        const selects = formEditar.querySelectorAll('select:not(#select-editar-producto)');
        const textarea = formEditar.querySelector('textarea');

        const actualizado = {
            nombre:  inputs[0].value,  codigo:  inputs[1].value,
            tipo:    selects[0].value, capas:   inputs[2].value,
            espesor: inputs[3].value,  color:   inputs[4].value,
            stock:   inputs[5].value,  bodega:  inputs[6].value,
            costo:   inputs[7].value,  fecha:   inputs[8].value,
            notas:   textarea.value
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

function actualizarTablaYSelects() {
    const cuerpo     = document.getElementById("cuerpo-tabla");
    const selectEdit = document.getElementById("select-editar-producto");
    const selectDel  = document.getElementById("select-eliminar-producto");

    cuerpo.innerHTML     = "";
    selectEdit.innerHTML = '<option value="">-- Selecciona --</option>';
    selectDel.innerHTML  = '<option value="">-- Selecciona --</option>';

    productos.forEach(p => {
        cuerpo.innerHTML += `
            <tr>
                <td style="padding:12px;">${p.nombre}</td>
                <td style="padding:12px;">${p.stock} unidades</td>
                <td style="padding:12px;">${p.bodega}</td>
            </tr>`;
        const opt = `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`;
        selectEdit.innerHTML += opt;
        selectDel.innerHTML  += opt;
    });
}

function mostrarSubSeccionInventario(tipo, elemento) {
    document.querySelectorAll('.admin-options a').forEach(a => a.classList.remove('option-active'));
    elemento.classList.add('option-active');
    document.querySelectorAll('.inventario-form').forEach(f => f.classList.remove('active-form'));
    document.getElementById(`form-${tipo}`).classList.add('active-form');
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