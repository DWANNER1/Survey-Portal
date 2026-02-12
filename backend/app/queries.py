from typing import Any

ALLOWED_DIMENSIONS = {"industry", "region", "gender", "vote"}


def build_where_clause(filters: dict[str, str], question_code: str) -> tuple[str, list[Any]]:
    clauses = ["q.code = %s"]
    params: list[Any] = [question_code]

    for key, value in filters.items():
        if key in ALLOWED_DIMENSIONS and value:
            clauses.append(f"resp.{key} = %s")
            params.append(value)

    return " AND ".join(clauses), params
