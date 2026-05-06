from flask import Flask
from flask_cors import CORS
from flask_mysqldb import MySQL
from config import Config

mysql = MySQL()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['SESSION_PERMANENT'] = False
    CORS(app)



    mysql.init_app(app)

    from app.routes import main
    app.register_blueprint(main)

    return app
