"""WSGI entrypoint for running the Saiku Lite app with Gunicorn."""

from src.app import create_app

app = create_app()
