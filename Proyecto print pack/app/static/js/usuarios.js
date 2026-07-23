let modalUsuario;
let listaUsuariosGlobal = []; 
let usuarioEditandoId = null; 

document.addEventListener("DOMContentLoaded", () => {
    const modalElement = document.getElementById('modalUsuario');
    if (modalElement) {
        modalUsuario = new bootstrap.Modal(modalElement);
    }
    cargarUsuarios();
});

async function cargarUsuarios() {
    try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) throw new Error("No autorizado");
        
        listaUsuariosGlobal = await response.json();
        renderizarTabla(listaUsuariosGlobal);
    } catch (error) {
        console.error(error);
        alert("Hubo un problema al cargar los usuarios. Verifica que tienes permisos de administrador.");
    }
}

function renderizarTabla(usuarios) {
    const tbody = document.getElementById('tablaUsuarios');
    if (!tbody) return;
    tbody.innerHTML = '';

    usuarios.forEach(u => {
        const badgeRol = u.rol === 'admin' ? 'bg-danger' : 'bg-primary';
        const badgeEstado = u.estado === 'activo' ? 'bg-success' : 'bg-secondary';
        
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${u.usuario}</td>
                <td><span class="badge ${badgeRol}">${u.rol.toUpperCase()}</span></td>
                <td><span class="badge ${badgeEstado}">${u.estado.toUpperCase()}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-dark" title="Editar Usuario" onclick="abrirModalEditar(${u.id})">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function abrirModalUsuario() {
    usuarioEditandoId = null;
    document.getElementById('formUsuario').reset();
    document.getElementById('userNombre').disabled = false; 
    document.getElementById('tituloModalUser').innerText = "Nuevo Usuario";
    document.getElementById('notaPassword').style.display = "none";
    modalUsuario.show();
}

function abrirModalEditar(id) {
    usuarioEditandoId = id; 
    
    const usuario = listaUsuariosGlobal.find(u => u.id === id);
    if (!usuario) return;

    document.getElementById('formUsuario').reset();
    document.getElementById('userNombre').value = usuario.usuario;
    document.getElementById('userNombre').disabled = true; 
    document.getElementById('userRol').value = usuario.rol;
    document.getElementById('userEstado').value = usuario.estado;

    document.getElementById('tituloModalUser').innerText = "Editar Usuario: " + usuario.usuario;
    document.getElementById('notaPassword').style.display = "block";
    modalUsuario.show();
}

async function guardarUsuario() {
    const usuario = document.getElementById('userNombre').value.trim();
    const password = document.getElementById('userPassword').value;
    const rol = document.getElementById('userRol').value;
    const estado = document.getElementById('userEstado').value;
    
    if (!usuarioEditandoId && !password) {
        return alert("Debes asignarle una contraseña al usuario nuevo.");
    }

    const payload = {
        usuario: usuario,
        password: password,
        rol: rol,
        estado: estado
    };

    const boton = document.getElementById('btnGuardarUser');
    boton.disabled = true;
    boton.innerHTML = "Guardando...";

    const url = usuarioEditandoId ? `/api/usuarios/${usuarioEditandoId}` : '/api/usuarios';
    const metodoHTTP = usuarioEditandoId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodoHTTP,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.ok) {
            alert(data.mensaje);
            modalUsuario.hide();
            cargarUsuarios(); 
        } else {
            alert("Error: " + (data.mensaje || "Revisa los datos."));
        }
    } catch (error) {
        alert("Fallo de red al intentar comunicarse con el servidor.");
    } finally {
        boton.disabled = false;
        boton.innerHTML = '<i class="bi bi-save"></i> Guardar Usuario';
    }
}
