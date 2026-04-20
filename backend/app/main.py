from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.asn_data import AsnRepository, filter_assignments


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Project 1 API")
repository = AsnRepository()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard() -> dict[str, object]:
    data = repository.load()
    return {
        "generated_at": data["generated_at"],
        "source_dir": data["source_dir"],
        "source_files": data["source_files"],
        "summary": data["summary"],
        "blocks": data["blocks"],
        "recommendations": data["recommendations"],
        "duplicate_asns": data["duplicate_asns"],
        "route_snapshots": data["route_snapshots"],
        "warnings": data["warnings"],
    }


@app.get("/api/asns")
def list_asns(query: str = Query(default=""), limit: int = Query(default=50, le=200)) -> JSONResponse:
    data = repository.load()
    items = filter_assignments(data["assignments"], query, limit)
    return JSONResponse({"items": items, "count": len(items)})


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    def serve_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")
