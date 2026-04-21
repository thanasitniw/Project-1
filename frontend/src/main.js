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
const openAssignModalButton = document.querySelector("#open-assign-modal");
const assignModalBackdrop = document.querySelector("#assign-modal-backdrop");
const closeAssignModalButton = document.querySelector("#close-assign-modal");
const cancelAssignModalButton = document.querySelector("#cancel-assign-modal");
const assignForm = document.querySelector("#assign-form");
const formFeedback = document.querySelector("#form-feedback");
const assignModeButtons = document.querySelectorAll("[data-assign-mode]");
const asnNumberInput = document.querySelector("#asn-number-input");
const siteInput = document.querySelector("#site-input");
const regionInput = document.querySelector("#region-input");
const routerInput = document.querySelector("#router-input");
const assignmentTypeInput = document.querySelector("#assignment-type-input");
const assignmentStatusInput = document.querySelector("#assignment-status-input");
const assignedByInput = document.querySelector("#assigned-by-input");
const descriptionInput = document.querySelector("#description-input");

const pools = {
  "2-byte": {
    rangeLabel: "2-byte pool: 64512-65534",
    minAsn: 64512,
    maxAsn: 65534,
    rows: [
      { asn: "AS64512", site: "BKK-POP-01", region: "BKK", router: "bkk-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-03-10", assignedBy: "NOC-TH", description: "PE backbone expansion" },
      { asn: "AS64513", site: "BKK-POP-02", region: "BKK", router: "bkk-pe02.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-03-10", assignedBy: "NOC-TH", description: "PE backbone expansion" },
      { asn: "AS64514", site: "CNX-POP-01", region: "CNX", router: "cnx-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-04-01", assignedBy: "NOC-NORTH", description: "Regional backbone node" },
      { asn: "AS64515", site: "HKT-POP-01", region: "HKT", router: "hkt-pe01.ipcore.net", type: "MPLS", status: "Assigned", assigned: "2024-04-15", assignedBy: "MPLS-OPS", description: "Service edge turn-up" },
      { asn: "AS64516", site: "KKN-POP-01", region: "KKN", router: "kkn-pe01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-05-20", assignedBy: "NOC-TH", description: "Capacity expansion" },
      { asn: "AS64521", site: "BKK-CE-CUST-B", region: "BKK", router: "bkk-ce01-custB.net", type: "eBGP", status: "Assigned", assigned: "2024-06-15", assignedBy: "IPCORE-ENG", description: "Customer CE handoff" },
      { asn: "AS64525", site: "UBN-POP-01", region: "UBN", router: "ubn-pe01.ipcore.net", type: "iBGP", status: "Reserved", assigned: "2024-07-01", assignedBy: "Planning", description: "Planned PoP onboarding" },
      { asn: "AS64526", site: "CNX-CE-CUST-C", region: "CNX", router: "-", type: "eBGP", status: "Reserved", assigned: "2024-07-10", assignedBy: "Planning", description: "Customer expansion hold" },
      { asn: "AS64518", site: "OLD-HKT-02", region: "HKT", router: "hkt-pe02-old.net", type: "iBGP", status: "Decom", assigned: "2023-12-01", assignedBy: "Lifecycle", description: "Legacy node decommissioned" },
    ],
  },
  "4-byte": {
    rangeLabel: "4-byte pool: 4200000000-4294967294",
    minAsn: 4200000000,
    maxAsn: 4294967294,
    rows: [
      { asn: "AS4200000001", site: "BKK-DC-FABRIC", region: "BKK", router: "bkk-fabric01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-02-02", assignedBy: "DC-OPS", description: "Datacenter fabric control-plane" },
      { asn: "AS4200000002", site: "CNX-EVPN-LAB", region: "CNX", router: "cnx-lab01.ipcore.net", type: "iBGP", status: "Assigned", assigned: "2024-02-08", assignedBy: "LAB-OPS", description: "EVPN validation lab" },
      { asn: "AS4200000009", site: "BKK-CE-HYPER", region: "BKK", router: "bkk-ce-hyper.net", type: "eBGP", status: "Reserved", assigned: "2024-06-01", assignedBy: "Planning", description: "Hyper-scale CE reserve" },
      { asn: "AS4200000017", site: "HKT-SERVICE-EDGE", region: "HKT", router: "hkt-edge01.ipcore.net", type: "MPLS", status: "Assigned", assigned: "2024-06-14", assignedBy: "MPLS-OPS", description: "Service edge handoff" },
    ],
  },
};

let activePool = "2-byte";
let assignMode = "auto";

function parseAsn(asn) {
  return Number(String(asn).replace(/^AS/i, ""));
}

function getPoolStats(poolKey) {
  const pool = pools[poolKey];
  const total = pool.maxAsn - pool.minAsn + 1;
  const assigned = pool.rows.filter((row) => row.status === "Assigned").length;
  const reserved = pool.rows.filter((row) => row.status === "Reserved").length;
  const unavailable = assigned + reserved;
  const available = total - unavailable;
  const nextFree = findNextFreeAsn(poolKey);
  return { total, assigned, reserved, available, nextFree };
}

function findNextFreeAsn(poolKey) {
  const pool = pools[poolKey];
  const used = new Set(pool.rows.map((row) => parseAsn(row.asn)));
  for (let asn = pool.minAsn; asn <= pool.maxAsn; asn += 1) {
    if (!used.has(asn)) {
      return asn;
    }
  }
  return null;
}

function resetAssignForm() {
  assignForm.reset();
  assignMode = "auto";
  assignModeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.assignMode === "auto"));
  asnNumberInput.disabled = true;
  asnNumberInput.value = "";
  assignedByInput.value = "Network Engineer";
  formFeedback.textContent = `Next available ASN in ${activePool} is ${findNextFreeAsn(activePool) ?? "not available"}.`;
}

function openAssignModal() {
  resetAssignForm();
  assignModalBackdrop.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  siteInput.focus();
}

function closeAssignModal() {
  assignModalBackdrop.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}

function renderStats() {
  const pool = pools[activePool];
  const { total, assigned, reserved, available, nextFree } = getPoolStats(activePool);
  const usedPercent = ((assigned / total) * 100).toFixed(1);

  statsGrid.innerHTML = `
    <article class="summary-card">
      <p>Total pool</p>
      <h3>${total.toLocaleString()}</h3>
      <span>${pool.rangeLabel.replace(" pool:", " —")}</span>
    </article>
    <article class="summary-card">
      <p>Assigned</p>
      <h3 class="accent-green">${assigned}</h3>
      <span>${usedPercent}% used</span>
    </article>
    <article class="summary-card">
      <p>Reserved</p>
      <h3 class="accent-amber">${reserved}</h3>
      <span>planned sites</span>
    </article>
    <article class="summary-card">
      <p>Available</p>
      <h3>${available.toLocaleString()}</h3>
      <span>next free: ${nextFree ?? "n/a"}</span>
    </article>
  `;

  utilizationText.textContent = `${assigned + reserved} / ${total.toLocaleString()} used (${(((assigned + reserved) / total) * 100).toFixed(1)}%)`;
  utilizationFill.style.width = `${Math.max(((assigned + reserved) / total) * 100, 1)}%`;
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
          <td><button class="asn-link" type="button">${row.asn}</button></td>
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
openAssignModalButton.addEventListener("click", openAssignModal);
closeAssignModalButton.addEventListener("click", closeAssignModal);
cancelAssignModalButton.addEventListener("click", closeAssignModal);

assignModalBackdrop.addEventListener("click", (event) => {
  if (event.target === assignModalBackdrop) {
    closeAssignModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !assignModalBackdrop.classList.contains("is-hidden")) {
    closeAssignModal();
  }
});

assignModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    assignMode = button.dataset.assignMode;
    assignModeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    asnNumberInput.disabled = assignMode !== "manual";
    asnNumberInput.value = "";
    formFeedback.textContent =
      assignMode === "manual"
        ? `Enter an ASN between ${pools[activePool].minAsn} and ${pools[activePool].maxAsn} without duplication.`
        : `Next available ASN in ${activePool} is ${findNextFreeAsn(activePool) ?? "not available"}.`;
  });
});

assignForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const pool = pools[activePool];
  const nextFree = findNextFreeAsn(activePool);
  const requestedAsn = assignMode === "manual" ? Number(asnNumberInput.value) : nextFree;

  if (!requestedAsn || Number.isNaN(requestedAsn)) {
    formFeedback.textContent = "Unable to determine the ASN number. Please choose another mode or check the pool.";
    return;
  }

  if (requestedAsn < pool.minAsn || requestedAsn > pool.maxAsn) {
    formFeedback.textContent = `ASN must be within ${pool.minAsn} to ${pool.maxAsn} for the active pool.`;
    return;
  }

  const conflict = pool.rows.some((row) => parseAsn(row.asn) === requestedAsn);
  if (conflict) {
    formFeedback.textContent = `ASN ${requestedAsn} is already present in this pool. Please choose another ASN.`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  pool.rows.unshift({
    asn: `AS${requestedAsn}`,
    site: siteInput.value.trim(),
    region: regionInput.value.trim().toUpperCase(),
    router: routerInput.value.trim() || "-",
    type: assignmentTypeInput.value,
    status: assignmentStatusInput.value,
    assigned: today,
    assignedBy: assignedByInput.value.trim(),
    description: descriptionInput.value.trim(),
  });

  render();
  closeAssignModal();
  statusText.textContent = `Assignment saved: AS${requestedAsn} added to the ${activePool} pool.`;
});

poolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activePool = button.dataset.pool;
    poolButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
    if (!assignModalBackdrop.classList.contains("is-hidden")) {
      resetAssignForm();
    }
  });
});

render();
loadStatus();
