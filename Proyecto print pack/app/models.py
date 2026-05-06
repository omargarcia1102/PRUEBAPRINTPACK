class Usuario:
    def __init__(self, id, usuario, password, es_admin):
        self.id = id
        self.usuario = usuario
        self.password = password
        self.es_admin = es_admin

class Producto:
    def __init__(self, id, nombre, codigo, tipo, categoria,
                 capas, espesor, material, color, dimensiones,
                 peso, stock, unidad, bodega, proveedor,
                 costo, fecha_ingreso, notas):
        self.id = id
        self.nombre = nombre
        self.codigo = codigo
        self.tipo = tipo
        self.categoria = categoria
        self.capas = capas
        self.espesor = espesor
        self.material = material
        self.color = color
        self.dimensiones = dimensiones
        self.peso = peso
        self.stock = stock
        self.unidad = unidad
        self.bodega = bodega
        self.proveedor = proveedor
        self.costo = costo
        self.fecha_ingreso = fecha_ingreso
        self.notas = notas
