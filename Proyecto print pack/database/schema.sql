CREATE DATABASE IF NOT EXISTS printpack_db;
USE printpack_db;


CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50),
    categoria VARCHAR(50),
    capas INT,
    espesor DECIMAL(10,2),
    material VARCHAR(100),
    color VARCHAR(100),
    dimensiones VARCHAR(100),
    peso DECIMAL(10,2),
    stock INT NOT NULL DEFAULT 0,
    unidad VARCHAR(30),
    bodega VARCHAR(100),
    proveedor VARCHAR(150),
    costo DECIMAL(10,2),
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

CREATE TABLE movimientos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    id_producto   INT NULL,
    nombre_producto VARCHAR(150),
    tipo_movimiento ENUM('AGREGAR', 'EDITAR', 'ELIMINAR') NOT NULL,
    usuario       VARCHAR(50) NOT NULL,
    fecha         DATETIME DEFAULT CURRENT_TIMESTAMP,
    detalle       TEXT,
    stock_anterior INT,
    stock_nuevo    INT,
    FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE SET NULL
);

INSERT IGNORE INTO usuarios (usuario, password, es_admin) 
VALUES ('admin', 'admin123', TRUE);
