from flask import Flask
from flask_cors import CORS
from flask_mysqldb import MySQL

mysql = MySQL()


def create_app():
    app = Flask(__name__)
    CORS(app)

    from config import Config
    app.config.from_object(Config)
    app.config['SESSION_PERMANENT'] = False

    mysql.init_app(app)

    from app.routes import main
    app.register_blueprint(main)

    return app
