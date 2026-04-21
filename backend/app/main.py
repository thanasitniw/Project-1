from pathlib import Path
from typing import Literal
from datetime import date
from io import StringIO
import csv

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.asn_store import load_store, save_store


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Project 1 API")


class AssignmentCreate(BaseModel):
    pool: Literal["2-byte", "4-byte"]
    asn_number: int | None = None
    site: str = Field(min_length=1)
    region: str = Field(min_length=1)
    router: str = Field(min_length=1)
    type: Literal["iBGP", "eBGP", "MPLS"]
    status: Literal["Assigned", "Reserved"]
    assigned_by: str = Field(min_length=1)
    description: str = ""


class AssignmentUpdate(BaseModel):
    site: str = Field(min_length=1)
    region: str = Field(min_length=1)
    router: str = Field(min_length=1)
    type: Literal["iBGP", "eBGP", "MPLS"]
    status: Literal["Assigned", "Reserved"]
    assigned_by: str = Field(min_length=1)
    description: str = ""


def parse_asn(value: str) -> int:
    return int(value.removeprefix("AS"))


def find_next_free_asn(pool: dict) -> int | None:
    used = {parse_asn(row["asn"]) for row in pool["rows"]}
    for asn in range(pool["minAsn"], pool["maxAsn"] + 1):
        if asn not in used:
            return asn
    return None


def get_stats(pool: dict) -> dict[str, int | None]:
    total = pool["maxAsn"] - pool["minAsn"] + 1
    assigned = sum(1 for row in pool["rows"] if row["status"] == "Assigned")
    reserved = sum(1 for row in pool["rows"] if row["status"] == "Reserved")
    available = total - assigned - reserved
    return {
        "total": total,
        "assigned": assigned,
        "reserved": reserved,
        "available": available,
        "nextFree": find_next_free_asn(pool),
    }


def get_pool(store: dict, pool_name: str) -> dict:
    if pool_name not in store:
        raise HTTPException(status_code=404, detail=f"Pool {pool_name} was not found.")
    return store[pool_name]


def find_assignment(pool: dict, asn: str) -> dict:
    for row in pool["rows"]:
        if row["asn"] == asn:
            return row
    raise HTTPException(status_code=404, detail=f"Assignment {asn} was not found in this pool.")


def build_response(store: dict) -> dict:
    return {
        "pools": {
            name: {
                **pool,
                "stats": get_stats(pool),
            }
            for name, pool in store.items()
        }
    }


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/asn-pools")
def get_asn_pools() -> dict:
    return build_response(load_store())


@app.post("/api/assignments")
def create_assignment(payload: AssignmentCreate) -> dict:
    store = load_store()
    pool = get_pool(store, payload.pool)

    requested_asn = payload.asn_number if payload.asn_number is not None else find_next_free_asn(pool)
    if requested_asn is None:
        raise HTTPException(status_code=400, detail="No available ASN left in this pool.")

    if requested_asn < pool["minAsn"] or requested_asn > pool["maxAsn"]:
        raise HTTPException(
            status_code=400,
            detail=f"ASN must be within {pool['minAsn']} to {pool['maxAsn']} for the selected pool.",
        )

    if any(parse_asn(row["asn"]) == requested_asn for row in pool["rows"]):
        raise HTTPException(status_code=409, detail=f"ASN {requested_asn} already exists in this pool.")

    assignment = {
        "asn": f"AS{requested_asn}",
        "site": payload.site.strip(),
        "region": payload.region.strip().upper(),
        "router": payload.router.strip() or "-",
        "type": payload.type,
        "status": payload.status,
        "assigned": str(date.today()),
        "assignedBy": payload.assigned_by.strip(),
        "description": payload.description.strip(),
    }

    pool["rows"].insert(0, assignment)
    saved = save_store(store)
    return {
        "message": f"Assignment saved: AS{requested_asn} added to the {payload.pool} pool.",
        "assignment": assignment,
        **build_response(saved),
    }


@app.put("/api/assignments/{pool_name}/{asn}")
def update_assignment(pool_name: str, asn: str, payload: AssignmentUpdate) -> dict:
    store = load_store()
    pool = get_pool(store, pool_name)
    assignment = find_assignment(pool, asn)

    assignment.update(
        {
            "site": payload.site.strip(),
            "region": payload.region.strip().upper(),
            "router": payload.router.strip() or "-",
            "type": payload.type,
            "status": payload.status,
            "assignedBy": payload.assigned_by.strip(),
            "description": payload.description.strip(),
        }
    )

    saved = save_store(store)
    return {
        "message": f"Assignment {asn} updated in the {pool_name} pool.",
        "assignment": assignment,
        **build_response(saved),
    }


@app.post("/api/assignments/{pool_name}/{asn}/decommission")
def decommission_assignment(pool_name: str, asn: str) -> dict:
    store = load_store()
    pool = get_pool(store, pool_name)
    assignment = find_assignment(pool, asn)

    assignment["status"] = "Decom"
    assignment["description"] = assignment.get("description", "").strip() or "Marked as decommissioned"

    saved = save_store(store)
    return {
        "message": f"Assignment {asn} marked as decommissioned.",
        "assignment": assignment,
        **build_response(saved),
    }


@app.get("/api/assignments/export.csv")
def export_assignments_csv(pool: Literal["2-byte", "4-byte"]) -> Response:
    store = load_store()
    selected_pool = get_pool(store, pool)

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["pool", "asn", "site", "region", "router", "type", "status", "assigned", "assigned_by", "description"])
    for row in selected_pool["rows"]:
        writer.writerow(
            [
                pool,
                row["asn"],
                row["site"],
                row["region"],
                row["router"],
                row["type"],
                row["status"],
                row["assigned"],
                row.get("assignedBy", ""),
                row.get("description", ""),
            ]
        )

    csv_content = buffer.getvalue()
    filename = f"asn-assignments-{pool}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    def serve_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")
