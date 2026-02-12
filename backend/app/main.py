import csv
import io
import json
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import get_current_user_id
from app.config import settings
from app.db import get_conn
from app.queries import ALLOWED_DIMENSIONS, build_where_clause

app = FastAPI(title="Survey Portal API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _current_filters(industry: str | None, region: str | None, gender: str | None, vote: str | None) -> dict[str, str]:
    return {"industry": industry or "", "region": region or "", "gender": gender or "", "vote": vote or ""}


def _timeseries_query(study_id: int, question_code: str, filters: dict[str, str]) -> list[dict[str, Any]]:
    where_clause, params = build_where_clause(filters, question_code)
    params = [study_id, *params]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT sw.label, sw.wave_date, AVG(r.numeric_value)::float
            FROM responses r
            JOIN respondents resp ON resp.id = r.respondent_id
            JOIN survey_waves sw ON sw.id = resp.wave_id
            JOIN questions q ON q.id = r.question_id
            WHERE sw.study_id = %s AND {where_clause}
            GROUP BY sw.label, sw.wave_date
            ORDER BY sw.wave_date
            """,
            params,
        )
        rows = cur.fetchall()
    return [{"wave": row[0], "wave_date": str(row[1]), "value": round(row[2], 2) if row[2] is not None else None} for row in rows]


def _distribution_query(study_id: int, question_code: str, dimension: str, filters: dict[str, str]) -> list[dict[str, Any]]:
    where_clause, params = build_where_clause(filters, question_code)
    params = [study_id, *params]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT resp.{dimension}, AVG(r.numeric_value)::float
            FROM responses r
            JOIN respondents resp ON resp.id = r.respondent_id
            JOIN survey_waves sw ON sw.id = resp.wave_id
            JOIN questions q ON q.id = r.question_id
            WHERE sw.study_id = %s AND {where_clause}
            GROUP BY resp.{dimension}
            ORDER BY resp.{dimension}
            """,
            params,
        )
        rows = cur.fetchall()
    return [{"group": row[0], "value": round(row[1], 2) if row[1] is not None else None} for row in rows]


@app.get("/api/studies")
def list_studies() -> list[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, slug, name, description
            FROM studies
            ORDER BY id
            """
        )
        rows = cur.fetchall()
    return [
        {"id": row[0], "slug": row[1], "name": row[2], "description": row[3]}
        for row in rows
    ]


@app.get("/api/studies/{study_id}/filters")
def filter_values(study_id: int) -> dict[str, list[str]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM studies WHERE id = %s", (study_id,))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Study not found")

        result: dict[str, list[str]] = {}
        for dim in ALLOWED_DIMENSIONS:
            cur.execute(
                f"""
                SELECT DISTINCT resp.{dim}
                FROM respondents resp
                JOIN survey_waves sw ON sw.id = resp.wave_id
                WHERE sw.study_id = %s
                ORDER BY resp.{dim}
                """,
                (study_id,),
            )
            result[dim] = [row[0] for row in cur.fetchall() if row[0] is not None]

    return result


@app.get("/api/studies/{study_id}/timeseries")
def study_timeseries(
    study_id: int,
    question_code: str = Query(...),
    industry: str | None = None,
    region: str | None = None,
    gender: str | None = None,
    vote: str | None = None,
) -> list[dict[str, Any]]:
    return _timeseries_query(study_id, question_code, _current_filters(industry, region, gender, vote))


@app.get("/api/studies/{study_id}/distribution")
def study_distribution(
    study_id: int,
    question_code: str = Query(...),
    dimension: str = Query(...),
    industry: str | None = None,
    region: str | None = None,
    gender: str | None = None,
    vote: str | None = None,
) -> list[dict[str, Any]]:
    if dimension not in ALLOWED_DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported dimension: {dimension}")

    return _distribution_query(study_id, question_code, dimension, _current_filters(industry, region, gender, vote))


@app.get("/api/studies/{study_id}/export.csv")
def export_csv(
    study_id: int,
    question_code: str = Query(...),
    dimension: str = Query(...),
    industry: str | None = None,
    region: str | None = None,
    gender: str | None = None,
    vote: str | None = None,
    _: str = Depends(get_current_user_id),
) -> StreamingResponse:
    if dimension not in ALLOWED_DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported dimension: {dimension}")

    filters = _current_filters(industry, region, gender, vote)
    timeseries = _timeseries_query(study_id, question_code, filters)
    distribution = _distribution_query(study_id, question_code, dimension, filters)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timeseries"])
    writer.writerow(["wave", "wave_date", "value"])
    for row in timeseries:
        writer.writerow([row["wave"], row["wave_date"], row["value"]])
    writer.writerow([])
    writer.writerow(["distribution_by", dimension])
    writer.writerow(["group", "value"])
    for row in distribution:
        writer.writerow([row["group"], row["value"]])

    output.seek(0)
    filename = f"study_{study_id}_{question_code}_{dimension}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class SaveViewPayload(BaseModel):
    study_id: int
    name: str = Field(min_length=1, max_length=120)
    question_code: str
    distribution_dimension: str
    filters: dict[str, str]


@app.get("/api/saved-views")
def list_saved_views(study_id: int = Query(...), user_id: str = Depends(get_current_user_id)) -> list[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, question_code, distribution_dimension, filters, created_at
            FROM saved_views
            WHERE study_id = %s AND user_external_id = %s
            ORDER BY created_at DESC
            """,
            (study_id, user_id),
        )
        rows = cur.fetchall()
    return [
        {
            "id": row[0],
            "name": row[1],
            "question_code": row[2],
            "distribution_dimension": row[3],
            "filters": row[4],
            "created_at": row[5].isoformat(),
        }
        for row in rows
    ]


@app.post("/api/saved-views")
def create_saved_view(payload: SaveViewPayload, user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    if payload.distribution_dimension not in ALLOWED_DIMENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported distribution dimension")

    safe_filters = {key: payload.filters.get(key, "") for key in ALLOWED_DIMENSIONS}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO saved_views (study_id, user_external_id, name, question_code, distribution_dimension, filters)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb)
            RETURNING id, created_at
            """,
            (
                payload.study_id,
                user_id,
                payload.name,
                payload.question_code,
                payload.distribution_dimension,
                json.dumps(safe_filters),
            ),
        )
        row = cur.fetchone()
        conn.commit()
    return {"id": row[0], "created_at": row[1].isoformat()}


@app.delete("/api/saved-views/{view_id}")
def delete_saved_view(view_id: int, user_id: str = Depends(get_current_user_id)) -> dict[str, str]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM saved_views WHERE id = %s AND user_external_id = %s RETURNING id",
            (view_id, user_id),
        )
        row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status_code=404, detail="Saved view not found")
    return {"status": "deleted"}
