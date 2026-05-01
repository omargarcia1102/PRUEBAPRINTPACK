-- 1. Crear la base de datos para PrintPack
CREATE DATABASE IF NOT EXISTS printpack_db;
USE printpack_db;

-- 2. Crear tabla de usuarios para el login
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE
);

-- 3. Crear tabla de productos (El inventario especializado)
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

-- 4. Crear usuario administrador de prueba
INSERT IGNORE INTO usuarios (usuario, password, es_admin) 
VALUES ('admin', 'admin123', TRUE);