import os

class Config:
    # Estas líneas le dicen a Python: "Busca este dato en Render"
    MYSQL_HOST = os.getenv("DB_HOST")
    MYSQL_PORT = int(os.getenv("DB_PORT", 28731))
    MYSQL_USER = os.getenv("DB_USER")
    MYSQL_PASSWORD = os.getenv("DB_PASSWORD")
    MYSQL_DB = os.getenv("DB_NAME")
    
    # Esta línea es la más importante para que funcione con Aiven
    MYSQL_CUSTOM_OPTIONS = {"ssl": {"ca": "ca.pem"}}
    SESSION_PERMANENT = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True
