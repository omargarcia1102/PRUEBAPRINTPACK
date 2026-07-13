import os

class Config:
    # Buscar datos en render
    MYSQL_HOST = os.getenv("DB_HOST")
    MYSQL_PORT = int(os.getenv("DB_PORT", 28731))
    MYSQL_USER = os.getenv("DB_USER")
    MYSQL_PASSWORD = os.getenv("DB_PASSWORD")
    MYSQL_DB = os.getenv("DB_NAME")
    
    SECRET_KEY = os.getenv("SECRET_KEY")
    
    # Lineas para que aiven funcione
    MYSQL_CUSTOM_OPTIONS = {"ssl": {"ca": "ca.pem"}}
    SESSION_PERMANENT = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True
