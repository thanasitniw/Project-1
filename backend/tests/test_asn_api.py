import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


def clear_app_modules() -> None:
    for module_name in ("app.main", "app.asn_store"):
        sys.modules.pop(module_name, None)


class ASNApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store_file = Path(self.temp_dir.name) / "asn_store.json"
        os.environ["ASN_DATA_FILE"] = str(self.store_file)

        clear_app_modules()
        asn_store = importlib.import_module("app.asn_store")
        self.default_store = json.loads(json.dumps(asn_store.DEFAULT_STORE))
        self.store_file.write_text(json.dumps(self.default_store, indent=2), encoding="utf-8")

        self.main = importlib.import_module("app.main")
        testclient_module = importlib.import_module("fastapi.testclient")
        self.client = testclient_module.TestClient(self.main.app)

    def tearDown(self) -> None:
        self.client.close()
        self.temp_dir.cleanup()
        os.environ.pop("ASN_DATA_FILE", None)
        clear_app_modules()

    def test_pool_stats_count_decommissioned_entries_as_occupied(self) -> None:
        response = self.client.get("/api/asn-pools")

        self.assertEqual(response.status_code, 200)
        pool = response.json()["pools"]["2-byte"]

        self.assertEqual(pool["stats"]["assigned"], 6)
        self.assertEqual(pool["stats"]["reserved"], 2)
        self.assertEqual(pool["stats"]["decom"], 1)
        self.assertEqual(pool["stats"]["available"], 1014)
        self.assertEqual(pool["stats"]["nextFree"], 64517)

    def test_update_assignment_allows_decom_status(self) -> None:
        payload = {
            "site": "BKK-POP-01",
            "region": "bkk",
            "router": "bkk-pe01.ipcore.net",
            "type": "iBGP",
            "status": "Decom",
            "assigned_by": "QA",
            "description": "Lifecycle retire validation",
        }

        response = self.client.put("/api/assignments/2-byte/AS64512", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["assignment"]["status"], "Decom")
        self.assertEqual(body["assignment"]["assignedBy"], "QA")
        self.assertEqual(body["pools"]["2-byte"]["stats"]["assigned"], 5)
        self.assertEqual(body["pools"]["2-byte"]["stats"]["decom"], 2)
        self.assertEqual(body["pools"]["2-byte"]["stats"]["available"], 1014)
        self.assertEqual(body["auditLog"][0]["action"], "edit")

        persisted = json.loads(self.store_file.read_text(encoding="utf-8"))
        updated_row = next(row for row in persisted["pools"]["2-byte"]["rows"] if row["asn"] == "AS64512")
        self.assertEqual(updated_row["status"], "Decom")


if __name__ == "__main__":
    unittest.main()
