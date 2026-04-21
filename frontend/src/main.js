import "./styles.css";

const pageBreadcrumb = document.querySelector("#page-breadcrumb");
const navItems = document.querySelectorAll("[data-page-target]");
const pages = document.querySelectorAll(".page");
const statusText = document.querySelector("#sidebar-status");
const navCount = document.querySelector("#nav-count");
const dashboardStatsGrid = document.querySelector("#dashboard-stats-grid");
const dashboardPoolBars = document.querySelector("#dashboard-pool-bars");
const recentTableBody = document.querySelector("#recent-table-body");
const regionTableBody = document.querySelector("#region-table-body");
const poolCardGrid = document.querySelector("#pool-card-grid");
const reservedRangesBody = document.querySelector("#reserved-ranges-body");
const auditTableBody = document.querySelector("#audit-table-body");
const asnTableBody = document.querySelector("#asn-table-body");
const tableFooter = document.querySelector("#table-footer");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const typeFilter = document.querySelector("#type-filter");
const regionFilter = document.querySelector("#region-filter");
const poolButtons = document.querySelectorAll("[data-pool]");
const exportCsvButton = document.querySelector("#export-csv-button");
const openAssignModalButton = document.querySelector("#open-assign-modal");
const sortableHeaders = document.querySelectorAll("[data-sort]");
const modalOverlay = document.querySelector("#modal-overlay");
const confirmOverlay = document.querySelector("#confirm-overlay");
const closeAssignModalButton = document.querySelector("#close-assign-modal");
const cancelAssignModalButton = document.querySelector("#cancel-assign-modal");
const confirmCancelButton = document.querySelector("#confirm-cancel-button");
const confirmAcceptButton = document.querySelector("#confirm-accept-button");
const confirmTitle = document.querySelector("#confirm-title");
const confirmBody = document.querySelector("#confirm-body");
const assignForm = document.querySelector("#assign-form");
const formFeedback = document.querySelector("#form-feedback");
const assignModeButtons = document.querySelectorAll("[data-assign-mode]");
const nextAsnDisplay = document.querySelector("#next-asn-display");
const assignModeBadge = document.querySelector("#assign-mode-badge");
const asnNumberInput = document.querySelector("#asn-number-input");
const siteInput = document.querySelector("#site-input");
const regionInput = document.querySelector("#region-input");
const routerInput = document.querySelector("#router-input");
const assignmentTypeInput = document.querySelector("#assignment-type-input");
const assignmentStatusInput = document.querySelector("#assignment-status-input");
const assignedByInput = document.querySelector("#assigned-by-input");
const descriptionInput = document.querySelector("#description-input");
const modalTitle = document.querySelector("#modal-title");
const modalSubtitle = document.querySelector("#modal-subtitle");
const modalSubmitButton = document.querySelector("#modal-submit-btn");
const detailPanel = document.querySelector("#detail-panel");
const closeDetailButton = document.querySelector("#close-detail-button");
const detailAsn = document.querySelector("#detail-asn");
const detailSite = document.querySelector("#detail-site");
const detailStatus = document.querySelector("#detail-status");
const detailType = document.querySelector("#detail-type");
const detailRegion = document.querySelector("#detail-region");
const detailRouter = document.querySelector("#detail-router");
const detailPool = document.querySelector("#detail-pool");
const detailDate = document.querySelector("#detail-date");
const detailBy = document.querySelector("#detail-by");
const detailDescription = document.querySelector("#detail-description");
const detailAuditList = document.querySelector("#detail-audit-list");
const detailEditButton = document.querySelector("#detail-edit-button");
const detailReactivateButton = document.querySelector("#detail-reactivate-button");
const detailDecomButton = document.querySelector("#detail-decom-button");
const detailDeleteButton = document.querySelector("#detail-delete-button");
const toastWrap = document.querySelector("#toast-wrap");

const PAGE_TITLES = {
  dashboard: "Dashboard",
  assignments: "ASN Assignments",
  pools: "Pool Management",
  audit: "Audit Log",
};

const POOL_META = {
  "2-byte": { label: "2-byte (16-bit)", total: 1023 },
  "4-byte": { label: "4-byte (32-bit)", total: 94967295 },
};

const RESERVED_RANGES = [
  { start: "64512", end: "64519", purpose: "PE Router iBGP identifiers", pool: "2-byte" },
  { start: "64520", end: "64529", purpose: "CE eBGP customers (BKK)", pool: "2-byte" },
  { start: "64530", end: "64549", purpose: "CE eBGP customers (regional)", pool: "2-byte" },
  { start: "64550", end: "64599", purpose: "MPLS / VPN service edge", pool: "2-byte" },
];

let pools = {};
let auditLog = [];
let activePage = "dashboard";
let activePool = "2-byte";
let assignMode = "auto";
let editingAssignment = null;
let detailTarget = null;
let confirmAction = null;
let sortField = "asn";
let sortAsc = true;

function getPoolRows(poolName) {
  return pools[poolName]?.rows ?? [];
}

function getPoolStats(poolName) {
  return pools[poolName]?.stats ?? { total: 0, assigned: 0, reserved: 0, decom: 0, available: 0, nextFree: null };
}

function getAllRows() {
  return Object.entries(pools).flatMap(([poolName, pool]) => pool.rows.map((row) => ({ ...row, poolName })));
}

function getFilteredAssignments() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedType = typeFilter.value;
  const selectedRegion = regionFilter.value;

  return getPoolRows(activePool).filter((row) => {
    const haystack = `${row.asn} ${row.site} ${row.region} ${row.router} ${row.description ?? ""}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = selectedStatus === "all" || row.status === selectedStatus;
    const matchesType = selectedType === "all" || row.type === selectedType;
    const matchesRegion = selectedRegion === "all" || row.region === selectedRegion;
    return matchesQuery && matchesStatus && matchesType && matchesRegion;
  });
}

function getRecentRows() {
  return [...getAllRows()]
    .sort((left, right) => String(right.assigned).localeCompare(String(left.assigned)))
    .slice(0, 6);
}

function getAuditEntriesForAsn(asn) {
  return auditLog.filter((entry) => entry.asn === asn);
}

function formatAuditTimestamp(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function setFeedback(message, tone = "neutral") {
  formFeedback.textContent = message;
  formFeedback.dataset.tone = tone;
}

function setStatus(message) {
  statusText.textContent = message;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const marker = { success: "✓", error: "✕", info: "i" }[type] ?? "i";
  toast.innerHTML = `<span>${marker}</span><span>${message}</span>`;
  toastWrap.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function statusBadge(status) {
  if (status === "Assigned") {
    return `<span class="status-badge s-assigned">Assigned</span>`;
  }
  if (status === "Reserved") {
    return `<span class="status-badge s-reserved">Reserved</span>`;
  }
  return `<span class="status-badge s-decom">Decommissioned</span>`;
}

function typeBadge(type) {
  const badgeClass =
    {
      iBGP: "t-ibgp",
      eBGP: "t-ebgp",
      MPLS: "t-mpls",
    }[type] ?? "t-ibgp";
  return `<span class="type-badge ${badgeClass}">${type}</span>`;
}

function getAuditColor(action) {
  if (action === "decommission" || action === "delete") {
    return "var(--red)";
  }
  if (action === "edit") {
    return "var(--amber)";
  }
  if (action === "reactivate") {
    return "var(--green)";
  }
  return "var(--accent)";
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    const leftValue =
      sortField === "asn" ? Number(String(left.asn).replace(/^AS/i, "")) : String(left[sortField] ?? "");
    const rightValue =
      sortField === "asn" ? Number(String(right.asn).replace(/^AS/i, "")) : String(right[sortField] ?? "");

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return sortAsc ? leftValue - rightValue : rightValue - leftValue;
    }

    return sortAsc
      ? String(leftValue).localeCompare(String(rightValue))
      : String(rightValue).localeCompare(String(leftValue));
  });
}

function renderStats() {
  const totals = Object.keys(pools).reduce(
    (accumulator, poolName) => {
      const stats = getPoolStats(poolName);
      accumulator.assigned += stats.assigned;
      accumulator.reserved += stats.reserved;
      accumulator.decom += stats.decom;
      return accumulator;
    },
    { assigned: 0, reserved: 0, decom: 0 },
  );
  const activeStats = getPoolStats(activePool);
  const cards = [
    {
      className: "green",
      label: "Assigned",
      value: totals.assigned.toLocaleString(),
      sub: "Active assignments",
      badge: `${activeStats.assigned} in ${POOL_META[activePool].label}`,
      badgeClass: "badge-green",
    },
    {
      className: "amber",
      label: "Reserved",
      value: totals.reserved.toLocaleString(),
      sub: "Planned sites",
    },
    {
      className: "teal",
      label: "Decommissioned",
      value: totals.decom.toLocaleString(),
      sub: "Held out from reuse",
    },
    {
      className: "blue",
      label: "Available",
      value: activeStats.nextFree ? `AS${activeStats.nextFree}` : "—",
      sub: `Next free ASN in ${POOL_META[activePool].label}`,
    },
  ];

  dashboardStatsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card ${card.className}">
          <div class="stat-label">${card.label}</div>
          <div class="stat-value">${card.value}</div>
          <div class="stat-sub">${card.sub}</div>
          ${card.badge ? `<span class="stat-badge ${card.badgeClass}">${card.badge}</span>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderPoolBars() {
  dashboardPoolBars.innerHTML = Object.keys(POOL_META)
    .map((poolName) => {
      const stats = getPoolStats(poolName);
      const occupied = stats.assigned + stats.reserved + stats.decom;
      const percentage = stats.total ? (occupied / stats.total) * 100 : 0;
      const fillClass = poolName === "2-byte" ? "green" : "amber";
      return `
        <div class="pool-row">
          <div class="pool-name">${POOL_META[poolName].label}</div>
          <div class="bar-bg">
            <div class="bar-fill ${fillClass}" style="width:${Math.min(percentage, 100)}%"></div>
          </div>
          <div class="pool-pct">${occupied.toLocaleString()} / ${stats.total.toLocaleString()}</div>
        </div>
      `;
    })
    .join("");
}

function renderRecentTable() {
  const rows = getRecentRows();
  recentTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td><button class="asn-cell" type="button" data-detail-asn="${row.asn}" data-detail-pool="${row.poolName}">${row.asn}</button></td>
          <td>${row.site}</td>
          <td>${statusBadge(row.status)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderRegionTable() {
  const regions = [...new Set(getAllRows().map((row) => row.region))].sort();
  regionTableBody.innerHTML = regions
    .map((region) => {
      const rows = getAllRows().filter((row) => row.region === region);
      const active = rows.filter((row) => row.status === "Assigned").length;
      return `
        <tr>
          <td><span class="region-chip">${region}</span></td>
          <td class="host-cell">${rows.length}</td>
          <td class="host-cell" style="color:var(--green)">${active}</td>
        </tr>
      `;
    })
    .join("");
}

function renderAssignmentsTable() {
  const rows = sortRows(getFilteredAssignments());
  if (!rows.length) {
    asnTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No ASN records found</td></tr>`;
    tableFooter.textContent = "0 records";
    return;
  }

  asnTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td><button class="asn-cell" type="button" data-detail-asn="${row.asn}" data-detail-pool="${activePool}">${row.asn}</button></td>
          <td>${row.site}</td>
          <td><span class="region-chip">${row.region}</span></td>
          <td class="host-cell">${row.router}</td>
          <td>${typeBadge(row.type)}</td>
          <td>${statusBadge(row.status)}</td>
          <td class="host-cell">${row.assigned}</td>
          <td>${row.assignedBy ?? "-"}</td>
          <td>
            <div class="row-actions">
              <button class="row-btn" type="button" data-detail-asn="${row.asn}" data-detail-pool="${activePool}">Detail</button>
              <button class="row-btn" type="button" data-edit-asn="${row.asn}">Edit</button>
              <button class="row-btn success" type="button" data-reactivate-asn="${row.asn}" ${row.status === "Decom" ? "" : "disabled"}>Reactivate</button>
              <button class="row-btn del" type="button" data-decom-asn="${row.asn}" ${row.status === "Decom" ? "disabled" : ""}>Decom</button>
              <button class="row-btn del" type="button" data-delete-asn="${row.asn}">Delete</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  tableFooter.textContent = `${rows.length} records shown in ${POOL_META[activePool].label}`;
}

function renderReservedRanges() {
  reservedRangesBody.innerHTML = RESERVED_RANGES.map(
    (range) => `
      <tr>
        <td class="host-cell">${range.start}</td>
        <td class="host-cell">${range.end}</td>
        <td>${range.purpose}</td>
        <td><span class="type-badge t-ibgp">${range.pool}</span></td>
      </tr>
    `,
  ).join("");
}

function renderPoolCards() {
  poolCardGrid.innerHTML = Object.keys(POOL_META)
    .map((poolName) => {
      const pool = pools[poolName];
      const stats = getPoolStats(poolName);
      const occupied = stats.assigned + stats.reserved + stats.decom;
      const utilization = stats.total ? ((occupied / stats.total) * 100).toFixed(4) : "0.0000";
      return `
        <section class="pool-card">
          <div class="pool-card-head">
            <div class="pool-card-name">${POOL_META[poolName].label} Pool</div>
            <div class="pool-card-range">${pool?.rangeLabel ?? poolName}</div>
          </div>
          <div class="pool-card-body">
            <div class="pool-metric"><span class="pool-metric-label">Total</span><span class="pool-metric-value">${stats.total.toLocaleString()}</span></div>
            <div class="pool-metric"><span class="pool-metric-label">Assigned</span><span class="pool-metric-value">${stats.assigned.toLocaleString()}</span></div>
            <div class="pool-metric"><span class="pool-metric-label">Reserved</span><span class="pool-metric-value">${stats.reserved.toLocaleString()}</span></div>
            <div class="pool-metric"><span class="pool-metric-label">Decommissioned</span><span class="pool-metric-value">${stats.decom.toLocaleString()}</span></div>
            <div class="pool-metric"><span class="pool-metric-label">Next free</span><span class="pool-metric-value">${stats.nextFree ? `AS${stats.nextFree}` : "—"}</span></div>
            <div class="bar-bg"><div class="bar-fill ${poolName === "2-byte" ? "green" : "amber"}" style="width:${Math.min((occupied / Math.max(stats.total, 1)) * 100, 100)}%"></div></div>
            <div class="pool-card-caption">${utilization}% utilized</div>
          </div>
        </section>
      `;
    })
    .join("");
}

function renderAuditTable() {
  auditTableBody.innerHTML = auditLog
    .map(
      (entry) => `
        <tr>
          <td class="host-cell">${formatAuditTimestamp(entry.timestamp)}</td>
          <td><span class="type-badge" style="background:${getAuditColor(entry.action)}22;color:${getAuditColor(entry.action)}">${entry.action}</span></td>
          <td><span class="asn-cell">${entry.asn}</span></td>
          <td>${entry.pool}</td>
          <td>${entry.actor}</td>
          <td>${entry.message}</td>
        </tr>
      `,
    )
    .join("");
}

function renderRegionFilter() {
  const regions = [...new Set(getAllRows().map((row) => row.region))].sort();
  const currentValue = regionFilter.value || "all";
  regionFilter.innerHTML = `<option value="all">All Region</option>${regions.map((region) => `<option value="${region}">${region}</option>`).join("")}`;
  regionFilter.value = regions.includes(currentValue) ? currentValue : "all";
}

function renderDetailPanel() {
  if (!detailTarget) {
    return;
  }
  detailAsn.textContent = detailTarget.asn;
  detailSite.textContent = `${detailTarget.site} · ${detailTarget.region}`;
  detailStatus.innerHTML = statusBadge(detailTarget.status);
  detailType.innerHTML = typeBadge(detailTarget.type);
  detailRegion.textContent = detailTarget.region;
  detailRouter.textContent = detailTarget.router;
  detailPool.textContent = detailTarget.poolName;
  detailDate.textContent = detailTarget.assigned;
  detailBy.textContent = detailTarget.assignedBy ?? "-";
  detailDescription.textContent = detailTarget.description || "—";

  const entries = getAuditEntriesForAsn(detailTarget.asn);
  detailAuditList.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <div class="audit-entry">
              <div class="audit-dot" style="background:${getAuditColor(entry.action)}"></div>
              <div>
                <div class="audit-text">${entry.action} — ${entry.message}</div>
                <div class="audit-time">${formatAuditTimestamp(entry.timestamp)} · ${entry.actor}</div>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="audit-text">No audit entries</div>`;

  detailReactivateButton.disabled = detailTarget.status !== "Decom";
  detailDecomButton.disabled = detailTarget.status === "Decom";
}

function renderPage() {
  navCount.textContent = getAllRows().length;
  renderRegionFilter();
  renderStats();
  renderPoolBars();
  renderRecentTable();
  renderRegionTable();
  renderAssignmentsTable();
  renderPoolCards();
  renderReservedRanges();
  renderAuditTable();
  renderDetailPanel();
}

function setActivePage(pageName) {
  activePage = pageName;
  pages.forEach((page) => page.classList.toggle("active", page.id === `page-${pageName}`));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.pageTarget === pageName));
  pageBreadcrumb.innerHTML = `<span>IPCORE</span> / <span>${PAGE_TITLES[pageName]}</span>`;
}

function setActivePool(poolName) {
  activePool = poolName;
  poolButtons.forEach((button) => button.classList.toggle("active", button.dataset.pool === poolName));
  renderPage();
}

function populateRegionOptions() {
  const regions = [...new Set(getAllRows().map((row) => row.region))].sort();
  regionInput.innerHTML = `<option value="">— Select region —</option>${regions.map((region) => `<option value="${region}">${region}</option>`).join("")}`;
}

function setModalMode(mode) {
  const isEdit = mode === "edit";
  modalTitle.textContent = isEdit ? `Edit Assignment — ${editingAssignment.asn}` : "Assign New Private ASN";
  modalSubtitle.textContent = isEdit
    ? "Update assignment details while keeping the current ASN."
    : `Create a new ASN assignment in ${POOL_META[activePool].label}.`;
  modalSubmitButton.textContent = isEdit ? "Save Changes" : "Assign ASN";
}

function updateAssignModeUI() {
  assignModeButtons.forEach((button) => button.classList.toggle("active", button.dataset.assignMode === assignMode));
  asnNumberInput.disabled = editingAssignment !== null || assignMode !== "manual";
  assignModeBadge.textContent = editingAssignment ? "Locked" : assignMode === "manual" ? "Manual" : "Auto";
  const nextFree = getPoolStats(activePool).nextFree;
  nextAsnDisplay.textContent = editingAssignment ? editingAssignment.asn : nextFree ? `AS${nextFree}` : "Pool exhausted";
}

function resetAssignForm() {
  assignForm.reset();
  assignMode = "auto";
  editingAssignment = null;
  assignedByInput.value = "Network Engineer";
  setModalMode("create");
  updateAssignModeUI();
  setFeedback("Choose auto assign or enter an ASN manually within the selected pool.");
}

function fillEditForm(row) {
  editingAssignment = { ...row, poolName: activePool };
  setModalMode("edit");
  siteInput.value = row.site;
  regionInput.value = row.region;
  routerInput.value = row.router === "-" ? "" : row.router;
  assignmentTypeInput.value = row.type;
  assignmentStatusInput.value = row.status;
  assignedByInput.value = row.assignedBy ?? "";
  descriptionInput.value = row.description ?? "";
  asnNumberInput.value = Number(String(row.asn).replace(/^AS/i, ""));
  updateAssignModeUI();
  setFeedback(`Editing ${row.asn} in ${POOL_META[activePool].label}.`, "success");
}

function openAssignModal(mode = "create", asn = null) {
  if (mode === "edit" && asn) {
    const row = getPoolRows(activePool).find((item) => item.asn === asn);
    if (!row) {
      return;
    }
    fillEditForm(row);
  } else {
    resetAssignForm();
  }
  modalOverlay.classList.add("open");
  document.body.classList.add("modal-open");
  siteInput.focus();
}

function closeAssignModal() {
  modalOverlay.classList.remove("open");
  document.body.classList.remove("modal-open");
  resetAssignForm();
}

function openDetailPanel(asn, poolName) {
  const row = getPoolRows(poolName).find((item) => item.asn === asn);
  if (!row) {
    return;
  }
  detailTarget = { ...row, poolName };
  renderDetailPanel();
  detailPanel.classList.add("open");
}

function closeDetailPanel() {
  detailTarget = null;
  detailPanel.classList.remove("open");
}

function openConfirmDialog({ title, body, confirmLabel, onConfirm }) {
  confirmTitle.textContent = title;
  confirmBody.textContent = body;
  confirmAcceptButton.textContent = confirmLabel;
  confirmAction = onConfirm;
  confirmOverlay.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeConfirmDialog() {
  confirmAction = null;
  confirmOverlay.classList.remove("open");
  if (!modalOverlay.classList.contains("open")) {
    document.body.classList.remove("modal-open");
  }
}

async function refreshPools() {
  const response = await fetch("/api/asn-pools");
  if (!response.ok) {
    throw new Error("Unable to load ASN pools.");
  }
  const payload = await response.json();
  pools = payload.pools;
  auditLog = payload.auditLog ?? [];
  populateRegionOptions();
  renderPage();
}

async function loadStatus() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    setStatus(`Backend ${health.status}`);
  } catch {
    setStatus("Backend unavailable");
  }
}

async function handleDecommission(asn) {
  openConfirmDialog({
    title: "Decommission ASN?",
    body: `Are you sure you want to decommission ${asn}? This will mark it as decommissioned and keep it out of the reusable pool.`,
    confirmLabel: "Decommission",
    onConfirm: async () => {
      closeConfirmDialog();
      setStatus(`Updating ${asn}...`);
      try {
        const response = await fetch(`/api/assignments/${encodeURIComponent(activePool)}/${encodeURIComponent(asn)}/decommission`, {
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail ?? "Unable to decommission assignment.");
        }
        pools = payload.pools;
        auditLog = payload.auditLog ?? [];
        renderPage();
        closeDetailPanel();
        setStatus(payload.message);
        showToast(payload.message, "info");
      } catch (error) {
        setStatus(error.message);
        showToast(error.message, "error");
      }
    },
  });
}

async function handleReactivate(asn) {
  openConfirmDialog({
    title: "Reactivate ASN?",
    body: `Reactivate ${asn} in ${POOL_META[activePool].label} and move it back to Assigned status?`,
    confirmLabel: "Reactivate",
    onConfirm: async () => {
      closeConfirmDialog();
      setStatus(`Reactivating ${asn}...`);
      try {
        const response = await fetch(`/api/assignments/${encodeURIComponent(activePool)}/${encodeURIComponent(asn)}/reactivate`, {
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail ?? "Unable to reactivate assignment.");
        }
        pools = payload.pools;
        auditLog = payload.auditLog ?? [];
        renderPage();
        closeDetailPanel();
        setStatus(payload.message);
        showToast(payload.message, "success");
      } catch (error) {
        setStatus(error.message);
        showToast(error.message, "error");
      }
    },
  });
}

async function handleDelete(asn) {
  openConfirmDialog({
    title: "Delete ASN?",
    body: `Delete ${asn} from ${POOL_META[activePool].label}? This permanently removes the assignment record.`,
    confirmLabel: "Delete",
    onConfirm: async () => {
      closeConfirmDialog();
      setStatus(`Deleting ${asn}...`);
      try {
        const response = await fetch(`/api/assignments/${encodeURIComponent(activePool)}/${encodeURIComponent(asn)}`, {
          method: "DELETE",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail ?? "Unable to delete assignment.");
        }
        pools = payload.pools;
        auditLog = payload.auditLog ?? [];
        renderPage();
        closeDetailPanel();
        setStatus(payload.message);
        showToast(payload.message, "success");
      } catch (error) {
        setStatus(error.message);
        showToast(error.message, "error");
      }
    },
  });
}

function exportCsv() {
  window.location.href = `/api/assignments/export.csv?pool=${encodeURIComponent(activePool)}`;
}

async function submitAssignment(event) {
  event.preventDefault();
  modalSubmitButton.disabled = true;
  setFeedback(editingAssignment ? "Saving assignment changes..." : "Saving assignment...", "pending");

  try {
    const endpoint = editingAssignment
      ? `/api/assignments/${encodeURIComponent(activePool)}/${encodeURIComponent(editingAssignment.asn)}`
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail ?? "Unable to save assignment.");
    }
    pools = payload.pools;
    auditLog = payload.auditLog ?? [];
    renderPage();
    closeAssignModal();
    setStatus(payload.message);
    showToast(payload.message, "success");
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    modalSubmitButton.disabled = false;
  }
}

function bindEvents() {
  navItems.forEach((item) => {
    item.addEventListener("click", () => setActivePage(item.dataset.pageTarget));
  });

  poolButtons.forEach((button) => {
    button.addEventListener("click", () => setActivePool(button.dataset.pool));
  });

  searchInput.addEventListener("input", renderAssignmentsTable);
  statusFilter.addEventListener("change", renderAssignmentsTable);
  typeFilter.addEventListener("change", renderAssignmentsTable);
  regionFilter.addEventListener("change", renderAssignmentsTable);

  exportCsvButton.addEventListener("click", exportCsv);
  openAssignModalButton.addEventListener("click", () => openAssignModal("create"));
  sortableHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortAsc = !sortAsc;
      } else {
        sortField = field;
        sortAsc = true;
      }
      renderAssignmentsTable();
    });
  });
  closeAssignModalButton.addEventListener("click", closeAssignModal);
  cancelAssignModalButton.addEventListener("click", closeAssignModal);
  closeDetailButton.addEventListener("click", closeDetailPanel);
  confirmCancelButton.addEventListener("click", closeConfirmDialog);
  detailEditButton.addEventListener("click", () => {
    if (!detailTarget) {
      return;
    }
    closeDetailPanel();
    setActivePage("assignments");
    setActivePool(detailTarget.poolName);
    openAssignModal("edit", detailTarget.asn);
  });
  detailReactivateButton.addEventListener("click", () => detailTarget && handleReactivate(detailTarget.asn));
  detailDecomButton.addEventListener("click", () => detailTarget && handleDecommission(detailTarget.asn));
  detailDeleteButton.addEventListener("click", () => detailTarget && handleDelete(detailTarget.asn));
  confirmAcceptButton.addEventListener("click", () => confirmAction && confirmAction());

  assignModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (editingAssignment) {
        return;
      }
      assignMode = button.dataset.assignMode;
      asnNumberInput.value = "";
      updateAssignModeUI();
      if (assignMode === "manual") {
        const pool = pools[activePool];
        setFeedback(`Enter an ASN between ${pool.minAsn} and ${pool.maxAsn} without duplication.`);
      } else {
        const nextFree = getPoolStats(activePool).nextFree;
        setFeedback(`Next available ASN in ${POOL_META[activePool].label} is ${nextFree ? `AS${nextFree}` : "not available"}.`);
      }
    });
  });

  assignForm.addEventListener("submit", submitAssignment);

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeAssignModal();
    }
  });

  confirmOverlay.addEventListener("click", (event) => {
    if (event.target === confirmOverlay) {
      closeConfirmDialog();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (modalOverlay.classList.contains("open")) {
        closeAssignModal();
      } else if (confirmOverlay.classList.contains("open")) {
        closeConfirmDialog();
      } else if (detailPanel.classList.contains("open")) {
        closeDetailPanel();
      }
    }
  });

  recentTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.detailAsn && target.dataset.detailPool) {
      openDetailPanel(target.dataset.detailAsn, target.dataset.detailPool);
    }
  });

  asnTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const detailAsn = target.dataset.detailAsn;
    const detailPoolName = target.dataset.detailPool;
    const editAsn = target.dataset.editAsn;
    const reactivateAsn = target.dataset.reactivateAsn;
    const decomAsn = target.dataset.decomAsn;
    const deleteAsn = target.dataset.deleteAsn;

    if (detailAsn && detailPoolName) {
      openDetailPanel(detailAsn, detailPoolName);
    } else if (editAsn) {
      openAssignModal("edit", editAsn);
    } else if (reactivateAsn) {
      handleReactivate(reactivateAsn);
    } else if (decomAsn) {
      handleDecommission(decomAsn);
    } else if (deleteAsn) {
      handleDelete(deleteAsn);
    }
  });
}

async function boot() {
  bindEvents();
  try {
    await Promise.all([refreshPools(), loadStatus()]);
    setActivePage("dashboard");
    setActivePool("2-byte");
    resetAssignForm();
  } catch {
    setStatus("Backend unavailable");
    setFeedback("Unable to load data from the backend store.", "error");
  }
}

boot();
