import MySQLdb.cursors
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app import mysql

main = Blueprint('main', __name__)

# --- PÁGINAS ---


@main.route('/')
def inicio():
    return render_template('INICIO.html')


@main.route('/acceder')
def acceder():
    return render_template('ACCEDER.html')


@main.route('/inventario')
def inventario():
    if not session.get('es_admin'):
        return redirect(url_for('main.acceder'))
    return render_template('INVENTARIO.html')


@main.route('/productos')
def productos():
    return render_template('PRODUCTOS.html')


@main.route('/procesos')
def procesos():
    return render_template('PROCESOS.html')


@main.route('/contacto')
def contacto():
    return render_template('CONTACTO.html')


# --- LOGIN REAL ---
@main.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    usuario = data.get('usuario')
    password = data.get('password')

    cursor = mysql.connection.cursor()
    cursor.execute(
        "SELECT * FROM usuarios WHERE usuario = %s AND password = %s",
        (usuario, password)
    )
    user = cursor.fetchone()
    cursor.close()

    if user:
        session['usuario'] = user[1]
        session['es_admin'] = user[3]
        return jsonify({'ok': True, 'es_admin': user[3]})
    else:
        return jsonify({'ok': False, 'mensaje': 'Credenciales incorrectas'}), 401


# --- LOGOUT ---
@main.route('/logout')
def logout():
    session.pop('usuario', None)
    session.pop('es_admin', None)
    session.modified = True
    response = redirect(url_for('main.inicio'))
    response.delete_cookie('session', path='/')
    return response

# --- INVENTARIO CRUD REAL ---

@main.route('/api/productos', methods=['GET'])
def get_productos():
    # CAMBIO: Usar DictCursor para que los datos tengan nombre
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor) 
    cursor.execute("SELECT * FROM productos")
    resultado = cursor.fetchall()
    cursor.close()
    return jsonify(resultado)


@main.route('/api/productos', methods=['POST'])
def crear_producto():
    d = request.get_json()
    cursor = mysql.connection.cursor()
    
    cursor.execute("""
        INSERT INTO productos 
        (nombre, codigo, tipo, categoria, capas, espesor, material,
         color, dimensiones, peso, stock, unidad, bodega, proveedor,
         costo, fecha_ingreso, notas)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        d.get('nombre'), d.get('codigo'), d.get('tipo'),
        d.get('categoria'), d.get('capas'), d.get('espesor'),
        d.get('material'), d.get('color'), d.get('dimensiones'),
        d.get('peso'), d.get('stock'), d.get('unidad'),
        d.get('bodega'), d.get('proveedor'), d.get('costo'),
        d.get('fecha'), d.get('notas')
    ))
    
    id_nuevo = cursor.lastrowid  # ID del producto recién creado

    # Registrar movimiento
    cursor.execute("""
        INSERT INTO movimientos 
        (id_producto, nombre_producto, tipo_movimiento, usuario, detalle, stock_anterior, stock_nuevo)
        VALUES (%s, %s, 'AGREGAR', %s, %s, %s, %s)
    """, (
        id_nuevo,
        d.get('nombre'),
        session.get('usuario'),
        f"Producto agregado al inventario",
        0,
        d.get('stock')
    ))

    mysql.connection.commit()
    cursor.close()
    return jsonify({'ok': True}), 201

@main.route('/api/productos/<int:id>', methods=['PUT'])
def actualizar_producto(id):
    d = request.get_json()
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    # Primero obtenemos el stock actual antes de editar
    cursor.execute("SELECT nombre, stock FROM productos WHERE id=%s", (id,))
    producto_actual = cursor.fetchone()
    stock_anterior = producto_actual['stock'] if producto_actual else 0
    nombre_producto = producto_actual['nombre'] if producto_actual else ''

    cursor.execute("""
        UPDATE productos SET
        nombre=%s, codigo=%s, tipo=%s, capas=%s,
        espesor=%s, color=%s, stock=%s, bodega=%s,
        costo=%s, fecha_ingreso=%s, notas=%s
        WHERE id=%s
    """, (
        d.get('nombre'), d.get('codigo'), d.get('tipo'),
        d.get('capas'), d.get('espesor'), d.get('color'),
        d.get('stock'), d.get('bodega'), d.get('costo'),
        d.get('fecha'), d.get('notas'), id
    ))

    # Registrar movimiento
    cursor.execute("""
        INSERT INTO movimientos 
        (id_producto, nombre_producto, tipo_movimiento, usuario, detalle, stock_anterior, stock_nuevo)
        VALUES (%s, %s, 'EDITAR', %s, %s, %s, %s)
    """, (
        id,
        nombre_producto,
        session.get('usuario'),
        f"Producto editado",
        stock_anterior,
        d.get('stock')
    ))

    mysql.connection.commit()
    cursor.close()
    return jsonify({'ok': True})


@main.route('/api/productos/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    # 1. Obtener info antes de eliminar
    cursor.execute("SELECT nombre, stock FROM productos WHERE id=%s", (id,))
    producto = cursor.fetchone()
    nombre_producto = producto['nombre'] if producto else ''
    stock_actual = producto['stock'] if producto else 0

    # 2. Registrar movimiento PRIMERO
    cursor.execute("""
        INSERT INTO movimientos 
        (id_producto, nombre_producto, tipo_movimiento, usuario, detalle, stock_anterior, stock_nuevo)
        VALUES (%s, %s, 'ELIMINAR', %s, %s, %s, %s)
    """, (
        id,
        nombre_producto,
        session.get('usuario'),
        "Producto eliminado del inventario",
        stock_actual,
        0
    ))

    # 3. Eliminar el producto DESPUÉS
    cursor.execute("DELETE FROM productos WHERE id=%s", (id,))

    mysql.connection.commit()
    cursor.close()
    return jsonify({'ok': True})

@main.route('/api/movimientos', methods=['GET'])
def get_movimientos():
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("""
        SELECT * FROM movimientos 
        ORDER BY fecha DESC 
        LIMIT 100
    """)
    resultado = cursor.fetchall()
    cursor.close()
    # Convertir fechas a string para JSON
    for row in resultado:
        if row.get('fecha'):
            row['fecha'] = row['fecha'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(resultado)
    


@main.route('/api/sesion')
def sesion():
    return jsonify({
        'activo': bool(session.get('usuario')),
        'es_admin': bool(session.get('es_admin'))
    })
