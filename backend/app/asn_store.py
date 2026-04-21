from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from threading import Lock


DEFAULT_STORE = {
    "auditLog": [
        {
            "timestamp": "2024-07-10T09:30:00Z",
            "action": "reserve",
            "pool": "2-byte",
            "asn": "AS64526",
            "actor": "Planning",
            "message": "Reserved ASN for CNX customer expansion hold.",
        },
        {
            "timestamp": "2024-06-15T11:10:00Z",
            "action": "assign",
            "pool": "2-byte",
            "asn": "AS64521",
            "actor": "IPCORE-ENG",
            "message": "Assigned ASN for BKK customer edge handoff.",
        },
        {
            "timestamp": "2024-06-14T08:20:00Z",
            "action": "assign",
            "pool": "4-byte",
            "asn": "AS4200000017",
            "actor": "MPLS-OPS",
            "message": "Assigned 4-byte ASN for HKT service edge.",
        },
    ],
    "pools": {
        "2-byte": {
        "rangeLabel": "2-byte pool: 64512-65534",
        "minAsn": 64512,
        "maxAsn": 65534,
        "rows": [
            {
                "asn": "AS64512",
                "site": "BKK-POP-01",
                "region": "BKK",
                "router": "bkk-pe01.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-03-10",
                "assignedBy": "NOC-TH",
                "description": "PE backbone expansion",
            },
            {
                "asn": "AS64513",
                "site": "BKK-POP-02",
                "region": "BKK",
                "router": "bkk-pe02.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-03-10",
                "assignedBy": "NOC-TH",
                "description": "PE backbone expansion",
            },
            {
                "asn": "AS64514",
                "site": "CNX-POP-01",
                "region": "CNX",
                "router": "cnx-pe01.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-04-01",
                "assignedBy": "NOC-NORTH",
                "description": "Regional backbone node",
            },
            {
                "asn": "AS64515",
                "site": "HKT-POP-01",
                "region": "HKT",
                "router": "hkt-pe01.ipcore.net",
                "type": "MPLS",
                "status": "Assigned",
                "assigned": "2024-04-15",
                "assignedBy": "MPLS-OPS",
                "description": "Service edge turn-up",
            },
            {
                "asn": "AS64516",
                "site": "KKN-POP-01",
                "region": "KKN",
                "router": "kkn-pe01.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-05-20",
                "assignedBy": "NOC-TH",
                "description": "Capacity expansion",
            },
            {
                "asn": "AS64521",
                "site": "BKK-CE-CUST-B",
                "region": "BKK",
                "router": "bkk-ce01-custB.net",
                "type": "eBGP",
                "status": "Assigned",
                "assigned": "2024-06-15",
                "assignedBy": "IPCORE-ENG",
                "description": "Customer CE handoff",
            },
            {
                "asn": "AS64525",
                "site": "UBN-POP-01",
                "region": "UBN",
                "router": "ubn-pe01.ipcore.net",
                "type": "iBGP",
                "status": "Reserved",
                "assigned": "2024-07-01",
                "assignedBy": "Planning",
                "description": "Planned PoP onboarding",
            },
            {
                "asn": "AS64526",
                "site": "CNX-CE-CUST-C",
                "region": "CNX",
                "router": "-",
                "type": "eBGP",
                "status": "Reserved",
                "assigned": "2024-07-10",
                "assignedBy": "Planning",
                "description": "Customer expansion hold",
            },
            {
                "asn": "AS64518",
                "site": "OLD-HKT-02",
                "region": "HKT",
                "router": "hkt-pe02-old.net",
                "type": "iBGP",
                "status": "Decom",
                "assigned": "2023-12-01",
                "assignedBy": "Lifecycle",
                "description": "Legacy node decommissioned",
            },
        ],
        },
        "4-byte": {
        "rangeLabel": "4-byte pool: 4200000000-4294967294",
        "minAsn": 4200000000,
        "maxAsn": 4294967294,
        "rows": [
            {
                "asn": "AS4200000001",
                "site": "BKK-DC-FABRIC",
                "region": "BKK",
                "router": "bkk-fabric01.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-02-02",
                "assignedBy": "DC-OPS",
                "description": "Datacenter fabric control-plane",
            },
            {
                "asn": "AS4200000002",
                "site": "CNX-EVPN-LAB",
                "region": "CNX",
                "router": "cnx-lab01.ipcore.net",
                "type": "iBGP",
                "status": "Assigned",
                "assigned": "2024-02-08",
                "assignedBy": "LAB-OPS",
                "description": "EVPN validation lab",
            },
            {
                "asn": "AS4200000009",
                "site": "BKK-CE-HYPER",
                "region": "BKK",
                "router": "bkk-ce-hyper.net",
                "type": "eBGP",
                "status": "Reserved",
                "assigned": "2024-06-01",
                "assignedBy": "Planning",
                "description": "Hyper-scale CE reserve",
            },
            {
                "asn": "AS4200000017",
                "site": "HKT-SERVICE-EDGE",
                "region": "HKT",
                "router": "hkt-edge01.ipcore.net",
                "type": "MPLS",
                "status": "Assigned",
                "assigned": "2024-06-14",
                "assignedBy": "MPLS-OPS",
                "description": "Service edge handoff",
            },
        ],
        },
    },
}

DATA_DIR = Path(os.getenv("ASN_DATA_DIR", "/app/data"))
DATA_FILE = Path(os.getenv("ASN_DATA_FILE", DATA_DIR / "asn_store.json"))
STORE_LOCK = Lock()


def ensure_store() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps(DEFAULT_STORE, indent=2), encoding="utf-8")


def normalize_store(store: dict) -> dict:
    if "pools" in store:
        normalized = {
            "auditLog": store.get("auditLog", []),
            "pools": store["pools"],
        }
    else:
        normalized = {
            "auditLog": [],
            "pools": store,
        }
    return normalized


def load_store() -> dict:
    ensure_store()
    with STORE_LOCK:
        raw_store = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    normalized = normalize_store(raw_store)
    if normalized != raw_store:
        save_store(normalized)
    return normalized


def save_store(store: dict) -> dict:
    ensure_store()
    with STORE_LOCK:
        DATA_FILE.write_text(json.dumps(store, indent=2), encoding="utf-8")
    return deepcopy(store)


def reset_store() -> dict:
    return save_store(deepcopy(DEFAULT_STORE))
