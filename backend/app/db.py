from contextlib import contextmanager
from typing import Generator

import psycopg

from app.config import settings


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    with psycopg.connect(settings.database_url) as conn:
        yield conn
