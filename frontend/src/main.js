import "./styles.css";

const statusText = document.querySelector("#status-text");
const statsGrid = document.querySelector("#stats-grid");
const chartGrid = document.querySelector("#chart-grid");
const asnTableBody = document.querySelector("#asn-table-body");
const requestList = document.querySelector("#request-list");
const timeline = document.querySelector("#timeline");
const searchInput = document.querySelector("#search-input");
const poolButtons = document.querySelectorAll("[data-pool]");

const dashboardData = {
  "2-byte": {
    stats: [
      { label: "Total Pool", value: "1,023", accent: "blue" },
      { label: "Assigned", value: "612", accent: "purple" },
      { label: "Reserved", value: "143", accent: "orange" },
      { label: "Conflict Alerts", value: "4", accent: "red" },
    ],
    chart: [36, 44, 48, 57, 63, 68, 76, 78, 82, 87, 91, 94],
    requests: [
      { title: "Request ASN for BKK-Metro-CE-07", meta: "Engineer: Narin | eBGP to CE", status: "Needs review" },
      { title: "Reserve ASN for CNX Edge Rollout", meta: "Engineer: Nicha | MPLS migration", status: "Reserved" },
      { title: "Decommission HKT-Legacy-ASN", meta: "Engineer: Tanawat | Legacy cleanup", status: "Pending" },
    ],
  },
  "4-byte": {
    stats: [
      { label: "Total Pool", value: "94,967,295", accent: "blue" },
      { label: "Assigned", value: "88", accent: "purple" },
      { label: "Reserved", value: "16", accent: "orange" },
      { label: "Conflict Alerts", value: "0", accent: "green" },
    ],
    chart: [8, 11, 15, 18, 21, 28, 31, 33, 39, 43, 49, 55],
    requests: [
      { title: "Reserve 4-byte ASN for EVPN Expansion", meta: "Engineer: Sirapop | Spine overlay", status: "Ready" },
      { title: "Assign 4-byte ASN to SGP Transit Lab", meta: "Engineer: Kanya | Testbed", status: "Pending" },
    ],
  },
};

const inventoryRows = [
  {
    asn: "64588",
    site: "BKK-Core / RST",
    router: "RST-CRR-01",
    purpose: "iBGP Route Reflector",
    status: "Assigned",
    assignedBy: "admin.tn",
    peers: [
      { ip: "10.10.40.1", remoteAs: "64588", state: "Established" },
      { ip: "10.10.40.2", remoteAs: "64588", state: "Established" },
    ],
  },
  {
    asn: "64612",
    site: "Chiang Mai / CNX",
    router: "CNX-PE-02",
    purpose: "eBGP to CE",
    status: "Reserved",
    assignedBy: "engineer.nn",
    peers: [
      { ip: "172.22.10.1", remoteAs: "65010", state: "Idle" },
      { ip: "172.22.10.5", remoteAs: "65010", state: "Active" },
    ],
  },
  {
    asn: "64740",
    site: "South / HKT",
    router: "HKT-MPLS-01",
    purpose: "MPLS Core",
    status: "Conflict",
    assignedBy: "admin.tn",
    peers: [
      { ip: "192.0.2.41", remoteAs: "64740", state: "Established" },
      { ip: "192.0.2.42", remoteAs: "64740", state: "Established" },
    ],
  },
  {
    asn: "4200001021",
    site: "Testbed / LAB",
    router: "LAB-EVPN-01",
    purpose: "EVPN Overlay",
    status: "Assigned",
    assignedBy: "engineer.ks",
    peers: [
      { ip: "198.51.100.10", remoteAs: "4200001021", state: "Established" },
    ],
  },
];

const auditEvents = [
  "08:21 admin.tn assigned AS64588 to RST-CRR-01",
  "08:08 engineer.nn reserved AS64612 for CNX-PE-02",
  "07:55 system flagged AS64740 as conflict candidate",
  "07:41 admin.tn exported ASN inventory to CSV",
];

let activePool = "2-byte";

function renderStats() {
  statsGrid.innerHTML = dashboardData[activePool].stats
    .map(
      (item) => `
        <article class="metric-card metric-${item.accent}">
          <p class="metric-label">${item.label}</p>
          <p class="metric-value">${item.value}</p>
        </article>
      `,
    )
    .join("");
}

function renderChart() {
  chartGrid.innerHTML = dashboardData[activePool].chart
    .map(
      (value, index) => `
        <div class="chart-column">
          <div class="chart-stack">
            <span class="chart-bar bar-assigned" style="height:${Math.max(value, 8)}%"></span>
            <span class="chart-bar bar-reserved" style="height:${Math.max(value * 0.45, 6)}%"></span>
            <span class="chart-bar bar-available" style="height:${Math.max(100 - value, 4)}%"></span>
          </div>
          <small>M${index + 1}</small>
        </div>
      `,
    )
    .join("");
}

function renderInventory(query = "") {
  const normalized = query.trim().toLowerCase();
  const filteredRows = inventoryRows.filter((row) => {
    const text = `${row.asn} ${row.site} ${row.router} ${row.purpose} ${row.status}`.toLowerCase();
    return text.includes(normalized);
  });

  asnTableBody.innerHTML = filteredRows
    .map(
      (row, index) => `
        <tr class="inventory-row" data-row="${index}">
          <td>${row.asn}</td>
          <td>${row.site}</td>
          <td>${row.router}</td>
          <td>${row.purpose}</td>
          <td><span class="status-chip status-${row.status.toLowerCase()}">${row.status}</span></td>
          <td>${row.assignedBy}</td>
        </tr>
        <tr class="detail-row">
          <td colspan="6">
            <div class="neighbor-panel">
              <p class="neighbor-title">BGP Neighbor Summary</p>
              ${row.peers
                .map(
                  (peer) => `
                    <div class="neighbor-item">
                      <span>${peer.ip}</span>
                      <span>remote-AS ${peer.remoteAs}</span>
                      <span>${peer.state}</span>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderRequests() {
  requestList.innerHTML = dashboardData[activePool].requests
    .map(
      (item) => `
        <li>
          <strong>${item.title}</strong>
          <span>${item.meta}</span>
          <small>${item.status}</small>
        </li>
      `,
    )
    .join("");
}

function renderAudit() {
  timeline.innerHTML = auditEvents
    .map(
      (item) => `
        <li>${item}</li>
      `,
    )
    .join("");
}

function renderDashboard() {
  renderStats();
  renderChart();
  renderInventory(searchInput.value);
  renderRequests();
  renderAudit();
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

searchInput.addEventListener("input", (event) => {
  renderInventory(event.target.value);
});

poolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activePool = button.dataset.pool;
    poolButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderDashboard();
  });
});

renderDashboard();
loadStatus();
