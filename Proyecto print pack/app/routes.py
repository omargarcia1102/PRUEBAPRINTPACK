import MySQLdb.cursors
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app import mysql
import os
import requests
from datetime import timedelta
import MySQLdb
from werkzeug.security import generate_password_hash, check_password_hash
import random
from datetime import datetime


def enviar_telegram(mensaje):
    token = os.environ.get('TELEGRAM_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        return
    try:
        requests.post(
            f'https://api.telegram.org/bot{token}/sendMessage',
            json={
                'chat_id': chat_id,
                'text': mensaje,
                'parse_mode': 'HTML'
            },
            timeout=5
        )
    except Exception:
        pass


def hora_colombia():
    from datetime import datetime
    return (datetime.utcnow() + timedelta(hours=-5)).strftime('%d/%m/%Y, %I:%M:%S %p')


def nivel_stock(stock):
    try:
        s = int(stock)
        if s == 0:
            return "🔴 SIN STOCK"
        if s <= 50:
            return "🟡 STOCK BAJO"
        return "🟢 STOCK ALTO"
    except:
        return "⚪ N/A"

main = Blueprint('main', __name__)

# PAGINAS 


@main.route('/')
def inicio():
    return render_template('INICIO.html')


@main.route('/acceder')
def acceder():
    return render_template('ACCEDER.html')


@main.route('/inventario')
def inventario():
    if session.get('rol') != 'admin':
        return redirect(url_for('main.acceder'))
    return render_template('INVENTARIO.html')

# Admin y asesor
@main.route('/ventas')
def ventas():
    if session.get('rol') not in ['admin', 'asesor']:
        return redirect(url_for('main.acceder'))
    return render_template('VENTAS.html')


@main.route('/productos')
def productos():
    return render_template('PRODUCTOS.html')


@main.route('/procesos')
def procesos():
    return render_template('PROCESOS.html')


@main.route('/contacto')
def contacto():
    return render_template('CONTACTO.html')


# LOGIN 
from werkzeug.security import check_password_hash

@main.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    usuario  = data.get('usuario')
    password = data.get('password')

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute(
        "SELECT * FROM usuarios WHERE usuario = %s AND estado = 'activo'",
        (usuario,)
    )
    user = cursor.fetchone()
    cursor.close()

    if user and check_password_hash(user['password'], password):
        session['usuario']  = user['usuario']
        session['rol']      = user['rol']
        session['es_admin'] = user['rol'] == 'admin'
        return jsonify({'ok': True, 'rol': user['rol']})
    else:
        return jsonify({'ok': False, 'mensaje': 'Credenciales incorrectas'}), 401

# LOGOUT
@main.route('/logout')
def logout():
    session.pop('usuario', None)
    session.pop('es_admin', None)
    session.modified = True
    response = redirect(url_for('main.inicio'))
    response.delete_cookie('session', path='/')
    return response

# INVENTARIO CRUD 

@main.route('/api/productos', methods=['GET'])
def get_productos():
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor) 
    cursor.execute("SELECT * FROM productos")
    resultado = cursor.fetchall()
    cursor.close()
    return jsonify(resultado)


@main.route('/api/productos', methods=['POST'])
def crear_producto():
    d = request.get_json()
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    
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
    
    id_nuevo = cursor.lastrowid  

   
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
    alerta = nivel_stock(d.get('stock'))
    precio = f"${int(float(d.get('costo') or 0)):,}".replace(',', '.')
    mensaje = (
        f"🟢 <b>PRODUCTO AGREGADO</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 <b>Producto:</b> {d.get('nombre')}\n"
        f"👤 <b>Usuario:</b> {session.get('usuario')}\n"
        f"🏷️ <b>Tipo movimiento:</b> AGREGAR\n"
        f"📊 <b>Stock nuevo:</b> {d.get('stock')} unidades\n"
        f"💰 <b>Precio:</b> {precio} COP\n"
        f"📍 <b>Bodega:</b> {d.get('bodega') or 'No especificada'}\n"
        f"⏰ <b>Hora:</b> {hora_colombia()}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"{alerta}"
        )
    enviar_telegram(mensaje)

    mysql.connection.commit()
    cursor.close()
    return jsonify({'ok': True}), 201

@main.route('/api/productos/<int:id>', methods=['PUT'])
def actualizar_producto(id):
    d = request.get_json()
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    cursor.execute("SELECT nombre, stock FROM productos WHERE id=%s", (id,))
    producto_actual = cursor.fetchone()
    stock_anterior = producto_actual['stock'] if producto_actual else 0
    nombre_producto = producto_actual['nombre'] if producto_actual else ''

    
    cursor.execute("""
        UPDATE productos SET
        nombre=%s, codigo=%s, tipo=%s, capas=%s,
        espesor=%s, material=%s, color=%s, stock=%s, bodega=%s,
        costo=%s, fecha_ingreso=%s, notas=%s
        WHERE id=%s
    """, (
        d.get('nombre'), d.get('codigo'), d.get('tipo'),
        d.get('capas'), d.get('espesor'), d.get('material'), d.get('color'),
        d.get('stock'), d.get('bodega'), d.get('costo'),
        d.get('fecha'), d.get('notas'), id
    ))

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
    
    alerta = nivel_stock(d.get('stock'))
    precio = f"${int(float(d.get('costo') or 0)):,}".replace(',', '.')
    mensaje = (
        f"🟡 <b>PRODUCTO EDITADO</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 <b>Producto:</b> {nombre_producto}\n"
        f"👤 <b>Usuario:</b> {session.get('usuario')}\n"
        f"🏷️ <b>Tipo movimiento:</b> EDITAR\n"
        f"📊 <b>Stock anterior:</b> {stock_anterior} unidades\n"
        f"📊 <b>Stock nuevo:</b> {d.get('stock')} unidades\n"
        f"💰 <b>Precio:</b> {precio} COP\n"
        f"📍 <b>Bodega:</b> {d.get('bodega') or 'No especificada'}\n"
        f"⏰ <b>Hora:</b> {hora_colombia()}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"{alerta}"
        )
    enviar_telegram(mensaje)

    mysql.connection.commit()
    cursor.close()
    return jsonify({'ok': True})


@main.route('/api/productos/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

   
    cursor.execute("SELECT nombre, stock FROM productos WHERE id=%s", (id,))
    producto = cursor.fetchone()
    nombre_producto = producto['nombre'] if producto else ''
    stock_actual = producto['stock'] if producto else 0

   
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

    
    cursor.execute("DELETE FROM productos WHERE id=%s", (id,))
    alerta = nivel_stock(0)
    mensaje = (
        f"🔴 <b>PRODUCTO ELIMINADO</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 <b>Producto:</b> {nombre_producto}\n"
        f"👤 <b>Usuario:</b> {session.get('usuario')}\n"
        f"🏷️ <b>Tipo movimiento:</b> ELIMINAR\n"
        f"📊 <b>Stock eliminado:</b> {stock_actual} unidades\n"
        f"📍 <b>Bodega:</b> No disponible (eliminado)\n"
        f"⏰ <b>Hora:</b> {hora_colombia()}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🔴 PRODUCTO FUERA DEL SISTEMA"
        )
    enviar_telegram(mensaje)

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
   
    for row in resultado:
        if row.get('fecha'):
            row['fecha'] = row['fecha'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(resultado)
    


@main.route('/api/sesion')
def sesion():
    return jsonify({
        'activo':   bool(session.get('usuario')),
        'es_admin': session.get('rol') == 'admin',
        'es_asesor': session.get('rol') == 'asesor',
        'rol':      session.get('rol', '')
    })


# ============================================
# CLIENTES
# ============================================

@main.route('/api/clientes', methods=['GET'])
def get_clientes():
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("SELECT * FROM clientes ORDER BY nombre ASC")
    resultado = cursor.fetchall()
    cursor.close()
    return jsonify(resultado)

@main.route('/api/clientes', methods=['POST'])
def crear_cliente():
    d = request.get_json()
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO clientes (nombre, email, telefono, empresa)
            VALUES (%s, %s, %s, %s)
        """, (
            d.get('nombre'),
            d.get('email'),
            d.get('telefono'),
            d.get('empresa')
        ))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'ok': True}), 201
    except Exception as e:
        cursor.close()
        return jsonify({'ok': False, 'mensaje': str(e)}), 400

# ============================================
# VENTAS
# ============================================

def generar_numero_factura():
    anio = datetime.now().strftime('%Y')
    numero = random.randint(1000, 9999)
    return f"FAC-{anio}-{numero}"

@main.route('/api/ventas', methods=['GET'])
def get_ventas():
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("""
        SELECT v.*, c.nombre as nombre_cliente
        FROM ventas v
        JOIN clientes c ON v.id_cliente = c.id
        ORDER BY v.fecha DESC
    """)
    resultado = cursor.fetchall()
    cursor.close()
    for row in resultado:
        if row.get('fecha'):
            row['fecha'] = row['fecha'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(resultado)

@main.route('/api/ventas', methods=['POST'])
def crear_venta():
    d = request.get_json()
    id_cliente = d.get('id_cliente')
    items      = d.get('items')  # lista de {id_producto, cantidad, precio_unitario}
    notas      = d.get('notas', '')

    if not id_cliente or not items:
        return jsonify({'ok': False, 'mensaje': 'Datos incompletos'}), 400

    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    try:
        # Calcular total
        total = sum(i['cantidad'] * i['precio_unitario'] for i in items)

        # Generar número de factura único
        numero_factura = generar_numero_factura()

        # Insertar venta
        cursor.execute("""
            INSERT INTO ventas (numero_factura, id_cliente, id_usuario, total, notas)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            numero_factura,
            id_cliente,
            session.get('usuario'),
            total,
            notas
        ))
        id_venta = cursor.lastrowid

        # Insertar detalle y descontar stock
        for item in items:
            id_producto     = item['id_producto']
            cantidad        = item['cantidad']
            precio_unitario = item['precio_unitario']
            subtotal        = cantidad * precio_unitario
            nombre_producto = item.get('nombre_producto', '')

            # Verificar stock suficiente
            cursor.execute("SELECT stock, nombre FROM productos WHERE id=%s", (id_producto,))
            producto = cursor.fetchone()

            if not producto or producto['stock'] < cantidad:
                raise Exception(f"Stock insuficiente para {nombre_producto}")

            # Insertar detalle
            cursor.execute("""
                INSERT INTO detalle_ventas
                (id_venta, id_producto, nombre_producto, cantidad, precio_unitario, subtotal)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (id_venta, id_producto, nombre_producto, cantidad, precio_unitario, subtotal))

            # Descontar stock
            cursor.execute("""
                UPDATE productos SET stock = stock - %s WHERE id = %s
            """, (cantidad, id_producto))

            # Registrar en movimientos
            cursor.execute("""
                INSERT INTO movimientos
                (id_producto, nombre_producto, tipo_movimiento, usuario, detalle, stock_anterior, stock_nuevo)
                VALUES (%s, %s, 'ELIMINAR', %s, %s, %s, %s)
            """, (
                id_producto,
                nombre_producto,
                session.get('usuario'),
                f"Venta #{numero_factura}",
                producto['stock'],
                producto['stock'] - cantidad
            ))

        mysql.connection.commit()

        # Notificación Telegram
        total_fmt = f"${int(total):,}".replace(',', '.')
        mensaje = (
            f"🧾 <b>NUEVA VENTA REGISTRADA</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📋 <b>Factura:</b> {numero_factura}\n"
            f"👤 <b>Asesor:</b> {session.get('usuario')}\n"
            f"🛍️ <b>Productos:</b> {len(items)}\n"
            f"💰 <b>Total:</b> {total_fmt} COP\n"
            f"⏰ <b>Hora:</b> {hora_colombia()}\n"
            f"━━━━━━━━━━━━━━━━━━━━"
        )
        enviar_telegram(mensaje)

        cursor.close()
        return jsonify({'ok': True, 'numero_factura': numero_factura, 'total': total}), 201

    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'ok': False, 'mensaje': str(e)}), 400

@main.route('/api/ventas/<int:id>', methods=['GET'])
def get_venta_detalle(id):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
    cursor.execute("""
        SELECT v.*, c.nombre as nombre_cliente, c.email, c.empresa, c.telefono
        FROM ventas v
        JOIN clientes c ON v.id_cliente = c.id
        WHERE v.id = %s
    """, (id,))
    venta = cursor.fetchone()

    if not venta:
        cursor.close()
        return jsonify({'ok': False, 'mensaje': 'Venta no encontrada'}), 404

    cursor.execute("""
        SELECT * FROM detalle_ventas WHERE id_venta = %s
    """, (id,))
    detalle = cursor.fetchall()
    cursor.close()

    if venta.get('fecha'):
        venta['fecha'] = venta['fecha'].strftime('%Y-%m-%d %H:%M:%S')

    return jsonify({'venta': venta, 'detalle': detalle})

# =======================================================
#   RUTAS DEL HISTORIAL DE VENTAS (USANDO EL BLUEPRINT)
# =======================================================

# 1. RUTA PARA VER LA PÁGINA WEB
@main.route('/historial-ventas')
def vista_historial_ventas():
    return render_template('HISTORIAL_VENTAS.html')


# 2. API EN PUNTO GET: TRAER TODAS LAS VENTAS
@main.route('/api/ventas', methods=['GET'])
def obtener_todas_las_ventas():
    try:
        conexion = obtener_conexion() 
        with conexion.cursor(dictionary=True) as cursor:
            query = """
                SELECT v.id, v.fecha, v.total, v.notas, c.nombre AS nombre_cliente 
                FROM ventas v
                JOIN clientes c ON v.id_cliente = c.id
                ORDER BY v.fecha DESC
            """
            cursor.execute(query)
            ventas = cursor.fetchall()
        conexion.close()
        return jsonify(ventas), 200
    except Exception as e:
        return jsonify({"ok": False, "mensaje": str(e)}), 500


# 3. API EN PUNTO GET: TRAER EL DETALLE DE UNA FACTURA ESPECÍFICA
@main.route('/api/ventas/<int:id_venta>', methods=['GET'])
def obtener_detalle_factura(id_venta):
    try:
        conexion = obtener_conexion()
        with conexion.cursor(dictionary=True) as cursor:
            query_venta = """
                SELECT v.id, v.fecha, v.total, c.nombre AS nombre_cliente 
                FROM ventas v
                JOIN clientes c ON v.id_cliente = c.id
                WHERE v.id = %s
            """
            cursor.execute(query_venta, (id_venta,))
            venta = cursor.fetchone()

            if not venta:
                return jsonify({"ok": False, "mensaje": "Factura no encontrada"}), 404

            query_items = """
                SELECT p.nombre AS nombre_producto, dv.cantidad, dv.precio_unitario, (dv.cantidad * dv.precio_unitario) AS subtotal
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id
                WHERE dv.id_venta = %s
            """
            cursor.execute(query_items, (id_venta,))
            items = cursor.fetchall()

            venta['items'] = items

        conexion.close()
        return jsonify(venta), 200
    except Exception as e:
        return jsonify({"ok": False, "mensaje": str(e)}), 500


@main.route('/clientes')
def clientes_vista():
    if session.get('rol') not in ['admin', 'asesor']:
        return redirect(url_for('main.acceder'))
    return render_template('CLIENTES.html')


@main.route('/api/clientes/<int:id>', methods=['PUT'])
def actualizar_cliente(id):
    d = request.get_json()
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            UPDATE clientes 
            SET nombre=%s, email=%s, telefono=%s, empresa=%s
            WHERE id=%s
        """, (
            d.get('nombre'),
            d.get('email'),
            d.get('telefono'),
            d.get('empresa'),
            id
        ))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'ok': True, 'mensaje': 'Cliente actualizado correctamente'})
    except Exception as e:
        cursor.close()
        return jsonify({'ok': False, 'mensaje': str(e)}), 400
