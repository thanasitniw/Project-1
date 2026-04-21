from pathlib import Path
from typing import Literal
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
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
    pool = store[payload.pool]

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


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/")
    def serve_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")
