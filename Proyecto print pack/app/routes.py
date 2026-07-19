import MySQLdb.cursors
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app import mysql
import os
import requests
from datetime import timedelta
import MySQLdb
from werkzeug.security import generate_password_hash, check_password_hash


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
