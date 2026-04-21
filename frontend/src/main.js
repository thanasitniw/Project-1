import "./styles.css";

const statusText = document.querySelector("#status-text");
const statsGrid = document.querySelector("#stats-grid");
const asnTableBody = document.querySelector("#asn-table-body");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const typeFilter = document.querySelector("#type-filter");
const utilizationText = document.querySelector("#utilization-text");
const utilizationFill = document.querySelector("#utilization-fill");
const poolLabel = document.querySelector("#pool-label");
const poolButtons = document.querySelectorAll("[data-pool]");

const pools = {
  "2-byte": {
    rangeLabel: "2-byte pool: 64512-65534",
    total: 1023,
    assigned: 18,
    reserved: 4,
    available: 1001,
    nextFree: 64530,
    rows: [
      { asn: "AS64512", site: "BKK-POP-01", region: "BKK", router: "bkk-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-03-10" },
      { asn: "AS64513", site: "BKK-POP-02", region: "BKK", router: "bkk-pe02.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-03-10" },
      { asn: "AS64514", site: "CNX-POP-01", region: "CNX", router: "cnx-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-04-01" },
      { asn: "AS64515", site: "HKT-POP-01", region: "HKT", router: "hkt-pe01.ipcore.net", type: "MPLS", status: "Assigned", assigned: "2024-04-15" },
      { asn: "AS64516", site: "KKN-POP-01", region: "KKN", router: "kkn-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-05-20" },
      { asn: "AS64521", site: "BKK-CE-CUST-B", region: "BKK", router: "bkk-ce01-custB.net", type: "eBGP", status: "Assigned", assigned: "2024-06-15" },
      { asn: "AS64525", site: "UBN-POP-01", region: "UBN", router: "ubn-pe01.ipcore.net", type: "iBGP", status: "Reserved", assigned: "2024-07-01" },
      { asn: "AS64526", site: "CNX-CE-CUST-C", region: "CNX", router: "-", type: "eBGP", status: "Reserved", assigned: "2024-07-10" },
      { asn: "AS64518", site: "OLD-HKT-02", region: "HKT", router: "hkt-pe02-old.net", type: "iBGP", status: "Decom", assigned: "2023-12-01" },
    ],
  },
  "4-byte": {
    rangeLabel: "4-byte pool: 4200000000-4294967294",
    total: 94967295,
    assigned: 22,
    reserved: 3,
    available: 94967270,
    nextFree: 4200000040,
    rows: [
      { asn: "AS4200000001", site: "BKK-DC-FABRIC", region: "BKK", router: "bkk-fabric01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-02-02" },
      { asn: "AS4200000002", site: "CNX-EVPN-LAB", region: "CNX", router: "cnx-lab01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-02-08" },
      { asn: "AS4200000009", site: "BKK-CE-HYPER", region: "BKK", router: "bkk-ce-hyper.net", type: "eBGP", status: "Reserved", assigned: "2024-06-01" },
      { asn: "AS4200000017", site: "HKT-SERVICE-EDGE", region: "HKT", router: "hkt-edge01.ipcore.net", type: "MPLS", status: "Assigned", assigned: "2024-06-14" },
    ],
  },
};

let activePool = "2-byte";

function renderStats() {
  const pool = pools[activePool];
  const usedPercent = ((pool.assigned / pool.total) * 100).toFixed(1);

  statsGrid.innerHTML = `
    <article class="summary-card">
      <p>Total pool</p>
      <h3>${pool.total.toLocaleString()}</h3>
      <span>${pool.rangeLabel.replace(" pool:", " -")}</span>
    </article>
    <article class="summary-card">
      <p>Assigned</p>
      <h3 class="accent-green">${pool.assigned}</h3>
      <span>${usedPercent}% used</span>
    </article>
    <article class="summary-card">
      <p>Reserved</p>
      <h3 class="accent-amber">${pool.reserved}</h3>
      <span>planned sites</span>
    </article>
    <article class="summary-card">
      <p>Available</p>
      <h3>${pool.available.toLocaleString()}</h3>
      <span>next free: ${pool.nextFree}</span>
    </article>
  `;

  utilizationText.textContent = `${pool.assigned + pool.reserved} / ${pool.total.toLocaleString()} used (${(((pool.assigned + pool.reserved) / pool.total) * 100).toFixed(1)}%)`;
  utilizationFill.style.width = `${Math.max(((pool.assigned + pool.reserved) / pool.total) * 100, 1)}%`;
  poolLabel.textContent = pool.rangeLabel;
}

function statusChipClass(status) {
  return {
    Assigned: "status-assigned",
    Reserved: "status-reserved",
    Decom: "status-decom",
  }[status] || "";
}

function typeChipClass(type) {
  return {
    iBGP: "type-ibgp",
    eBGP: "type-ebgp",
    MPLS: "type-mpls",
  }[type] || "";
}

function renderTable() {
  const pool = pools[activePool];
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const type = typeFilter.value;

  const filtered = pool.rows.filter((row) => {
    const text = `${row.asn} ${row.site} ${row.region} ${row.router}`.toLowerCase();
    const queryMatch = !query || text.includes(query);
    const statusMatch = status === "all" || row.status === status;
    const typeMatch = type === "all" || row.type === type;
    return queryMatch && statusMatch && typeMatch;
  });

  asnTableBody.innerHTML = filtered
    .map(
      (row) => `
        <tr>
          <td class="asn-link">${row.asn}</td>
          <td>${row.site}</td>
          <td>${row.region}</td>
          <td class="router-cell">${row.router}</td>
          <td><span class="type-chip ${typeChipClass(row.type)}">${row.type}</span></td>
          <td><span class="status-chip ${statusChipClass(row.status)}">${row.status}</span></td>
          <td>${row.assigned}</td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  renderStats();
  renderTable();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    statusText.textContent = `Backend status: ${health.status}`;
  } catch (error) {
    statusText.textContent = "Backend status: unavailable";
  }
}

searchInput.addEventListener("input", renderTable);
statusFilter.addEventListener("change", renderTable);
typeFilter.addEventListener("change", renderTable);

poolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activePool = button.dataset.pool;
    poolButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

render();
loadStatus();
