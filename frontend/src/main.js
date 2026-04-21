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
const exportCsvButton = document.querySelector("#export-csv-button");
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
const submitAssignButton = assignForm.querySelector(".primary-submit-button");
const assignModalTitle = document.querySelector("#assign-modal-title");
const modalCopy = document.querySelector(".modal-copy");
const editBanner = document.querySelector("#edit-banner");
const editingAssignmentLabel = document.querySelector("#editing-assignment-label");

let pools = {};
let activePool = "2-byte";
let assignMode = "auto";
let editingAssignment = null;

function setFeedback(message, tone = "neutral") {
  formFeedback.textContent = message;
  formFeedback.dataset.tone = tone;
}

function getPoolStats(poolKey) {
  return pools[poolKey]?.stats ?? { total: 0, assigned: 0, reserved: 0, available: 0, nextFree: null };
}

function getActivePool() {
  return pools[activePool];
}

function setModalMode(mode) {
  const isEdit = mode === "edit";
  editingAssignment = isEdit ? editingAssignment : null;
  assignModalTitle.textContent = isEdit ? "Edit assignment" : "Assign new ASN";
  modalCopy.textContent = isEdit
    ? "Update the selected assignment details or change its operational status."
    : "Create a new ASN assignment with auto-pick or a manual ASN number.";
  submitAssignButton.textContent = isEdit ? "Save changes" : "Save assignment";
  editBanner.classList.toggle("is-hidden", !isEdit);

  assignModeButtons.forEach((button) => {
    button.disabled = isEdit;
  });
  asnNumberInput.disabled = isEdit || assignMode !== "manual";
}

function resetAssignForm() {
  assignForm.reset();
  assignMode = "auto";
  editingAssignment = null;
  assignModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.assignMode === "auto");
    button.disabled = false;
  });
  asnNumberInput.disabled = true;
  asnNumberInput.value = "";
  assignedByInput.value = "Network Engineer";
  setModalMode("create");
  const nextFree = getPoolStats(activePool).nextFree;
  setFeedback(`Next available ASN in ${activePool} is ${nextFree ?? "not available"}.`);
}

function fillEditForm(row) {
  editingAssignment = { pool: activePool, asn: row.asn };
  setModalMode("edit");
  editingAssignmentLabel.textContent = row.asn;
  asnNumberInput.value = Number(String(row.asn).replace(/^AS/i, ""));
  siteInput.value = row.site;
  regionInput.value = row.region;
  routerInput.value = row.router;
  assignmentTypeInput.value = row.type;
  assignmentStatusInput.value = row.status === "Decom" ? "Assigned" : row.status;
  assignedByInput.value = row.assignedBy ?? "";
  descriptionInput.value = row.description ?? "";
  setFeedback(`Editing ${row.asn} in the ${activePool} pool.`, "success");
}

function openAssignModal() {
  if (!editingAssignment) {
    resetAssignForm();
  }
  assignModalBackdrop.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
  siteInput.focus();
}

function openEditModal(asn) {
  const row = getActivePool().rows.find((item) => item.asn === asn);
  if (!row) {
    return;
  }
  fillEditForm(row);
  openAssignModal();
}

function closeAssignModal() {
  assignModalBackdrop.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
  resetAssignForm();
}

function renderStats() {
  const pool = getActivePool();
  const stats = getPoolStats(activePool);
  const usedPercent = stats.total ? ((stats.assigned / stats.total) * 100).toFixed(1) : "0.0";

  statsGrid.innerHTML = `
    <article class="summary-card">
      <p>Total pool</p>
      <h3>${stats.total.toLocaleString()}</h3>
      <span>${pool.rangeLabel.replace(" pool:", " —")}</span>
    </article>
    <article class="summary-card">
      <p>Assigned</p>
      <h3 class="accent-green">${stats.assigned}</h3>
      <span>${usedPercent}% used</span>
    </article>
    <article class="summary-card">
      <p>Reserved</p>
      <h3 class="accent-amber">${stats.reserved}</h3>
      <span>planned sites</span>
    </article>
    <article class="summary-card">
      <p>Available</p>
      <h3>${stats.available.toLocaleString()}</h3>
      <span>next free: ${stats.nextFree ?? "n/a"}</span>
    </article>
  `;

  const usedCount = stats.assigned + stats.reserved;
  utilizationText.textContent = `${usedCount} / ${stats.total.toLocaleString()} used (${stats.total ? ((usedCount / stats.total) * 100).toFixed(1) : "0.0"}%)`;
  utilizationFill.style.width = `${Math.max(stats.total ? (usedCount / stats.total) * 100 : 0, 1)}%`;
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
  const pool = getActivePool();
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const type = typeFilter.value;

  const filtered = pool.rows.filter((row) => {
    const text = `${row.asn} ${row.site} ${row.region} ${row.router} ${row.description ?? ""}`.toLowerCase();
    const queryMatch = !query || text.includes(query);
    const statusMatch = status === "all" || row.status === status;
    const typeMatch = type === "all" || row.type === type;
    return queryMatch && statusMatch && typeMatch;
  });

  asnTableBody.innerHTML = filtered
    .map(
      (row) => `
        <tr>
          <td><button class="asn-link" type="button" data-edit-asn="${row.asn}">${row.asn}</button></td>
          <td>${row.site}</td>
          <td>${row.region}</td>
          <td class="router-cell">${row.router}</td>
          <td><span class="type-chip ${typeChipClass(row.type)}">${row.type}</span></td>
          <td><span class="status-chip ${statusChipClass(row.status)}">${row.status}</span></td>
          <td>${row.assigned}</td>
          <td>
            <div class="row-actions">
              <button class="table-action-button" type="button" data-edit-asn="${row.asn}">Edit</button>
              <button class="table-action-button danger" type="button" data-decom-asn="${row.asn}" ${row.status === "Decom" ? "disabled" : ""}>Decom</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  if (!pools[activePool]) {
    return;
  }
  renderStats();
  renderTable();
}

async function refreshPools() {
  const response = await fetch("/api/asn-pools");
  if (!response.ok) {
    throw new Error("Unable to load ASN pools.");
  }
  const payload = await response.json();
  pools = payload.pools;
  render();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    statusText.textContent = `Backend status: ${health.status}`;
  } catch {
    statusText.textContent = "Backend status: unavailable";
  }
}

async function handleDecommission(asn) {
  if (!window.confirm(`Decommission ${asn} in the ${activePool} pool?`)) {
    return;
  }

  statusText.textContent = `Updating ${asn}...`;
  try {
    const response = await fetch(`/api/assignments/${encodeURIComponent(activePool)}/${encodeURIComponent(asn)}/decommission`, {
      method: "POST",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail ?? "Unable to decommission assignment.");
    }
    pools = payload.pools;
    render();
    statusText.textContent = payload.message;
  } catch (error) {
    statusText.textContent = error.message;
  }
}

searchInput.addEventListener("input", renderTable);
statusFilter.addEventListener("change", renderTable);
typeFilter.addEventListener("change", renderTable);
openAssignModalButton.addEventListener("click", () => {
  resetAssignForm();
  openAssignModal();
});
closeAssignModalButton.addEventListener("click", closeAssignModal);
cancelAssignModalButton.addEventListener("click", closeAssignModal);
exportCsvButton.addEventListener("click", () => {
  window.location.href = `/api/assignments/export.csv?pool=${encodeURIComponent(activePool)}`;
});

asnTableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const editAsn = target.dataset.editAsn;
  const decomAsn = target.dataset.decomAsn;

  if (editAsn) {
    openEditModal(editAsn);
  }

  if (decomAsn) {
    handleDecommission(decomAsn);
  }
});

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
    if (editingAssignment) {
      return;
    }
    assignMode = button.dataset.assignMode;
    assignModeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    asnNumberInput.disabled = assignMode !== "manual";
    asnNumberInput.value = "";
    const pool = getActivePool();
    const nextFree = getPoolStats(activePool).nextFree;
    setFeedback(
      assignMode === "manual"
        ? `Enter an ASN between ${pool.minAsn} and ${pool.maxAsn} without duplication.`
        : `Next available ASN in ${activePool} is ${nextFree ?? "not available"}.`,
    );
  });
});

assignForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitAssignButton.disabled = true;
  setFeedback(editingAssignment ? "Saving assignment changes..." : "Saving assignment...", "pending");

  try {
    const endpoint = editingAssignment
      ? `/api/assignments/${encodeURIComponent(editingAssignment.pool)}/${encodeURIComponent(editingAssignment.asn)}`
      : "/api/assignments";
    const method = editingAssignment ? "PUT" : "POST";
    const body = editingAssignment
      ? {
          site: siteInput.value.trim(),
          region: regionInput.value.trim(),
          router: routerInput.value.trim() || "-",
          type: assignmentTypeInput.value,
          status: assignmentStatusInput.value,
          assigned_by: assignedByInput.value.trim(),
          description: descriptionInput.value.trim(),
        }
      : {
          pool: activePool,
          asn_number: assignMode === "manual" && asnNumberInput.value ? Number(asnNumberInput.value) : null,
          site: siteInput.value.trim(),
          region: regionInput.value.trim(),
          router: routerInput.value.trim() || "-",
          type: assignmentTypeInput.value,
          status: assignmentStatusInput.value,
          assigned_by: assignedByInput.value.trim(),
          description: descriptionInput.value.trim(),
        };

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail ?? "Unable to save assignment.");
    }

    pools = payload.pools;
    render();
    closeAssignModal();
    statusText.textContent = payload.message;
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    submitAssignButton.disabled = false;
  }
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

async function boot() {
  try {
    await Promise.all([refreshPools(), loadStatus()]);
  } catch {
    statusText.textContent = "Backend status: unavailable";
    setFeedback("Unable to load data from the backend store.", "error");
  }
}

boot();
