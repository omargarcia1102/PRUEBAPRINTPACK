from flask import Flask
from flask_cors import CORS
from flask_mysqldb import MySQL
from config import Config

mysql = MySQL()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    from config import Config
    app.config.from_object(Config)
    app.config['SESSION_PERMANENT'] = False

    mysql.init_app(app)

    from app.routes import main
    app.register_blueprint(main)

    return app
