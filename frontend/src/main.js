import "./styles.css";

const statusText = document.querySelector("#status-text");
const sourceDir = document.querySelector("#source-dir");
const sourceFiles = document.querySelector("#source-files");
const statsGrid = document.querySelector("#stats-grid");
const recommendationsList = document.querySelector("#recommendations-list");
const duplicatesList = document.querySelector("#duplicates-list");
const routesList = document.querySelector("#routes-list");
const blocksBody = document.querySelector("#blocks-body");
const resultsBody = document.querySelector("#results-body");
const searchInput = document.querySelector("#search-input");

function renderStats(summary) {
  const stats = [
    ["Used Private ASN", summary.used_private_count],
    ["Available Private ASN", summary.available_private_count],
    ["Utilization", `${summary.utilization_percent}%`],
    ["Duplicate Candidates", summary.duplicate_count],
  ];

  statsGrid.innerHTML = stats
    .map(
      ([label, value]) => `
        <article class="card stat-card">
          <p class="stat-label">${label}</p>
          <p class="stat-value">${value}</p>
        </article>
      `,
    )
    .join("");
}

function renderRecommendations(items) {
  if (!items.length) {
    recommendationsList.innerHTML = "<li>No recommendations available.</li>";
    return;
  }

  recommendationsList.innerHTML = items
    .map(
      (item) => `
        <li>
          <strong>AS${item.suggested_asn}</strong>
          <span>${item.block_name} (${item.start}-${item.stop})</span>
        </li>
      `,
    )
    .join("");
}

function renderDuplicates(items) {
  if (!items.length) {
    duplicatesList.innerHTML = "<li>No duplicate candidates found.</li>";
    return;
  }

  duplicatesList.innerHTML = items
    .map(
      (item) => `
        <li>
          <strong>AS${item.asn}</strong>
          <span>${(item.descriptions[0] || item.domains[0] || "No description")}</span>
          <small>${item.sources.join(", ")}</small>
        </li>
      `,
    )
    .join("");
}

function renderRouteSnapshots(items) {
  if (!items.length) {
    routesList.innerHTML = "<li>No route snapshots found.</li>";
    return;
  }

  routesList.innerHTML = items
    .map(
      (item) => `
        <li>
          <strong>${item.device_name}</strong>
          <span>${item.vendor} | local AS ${item.local_as || "-"}</span>
          <small>${item.file_name}</small>
        </li>
      `,
    )
    .join("");
}

function renderBlocks(items) {
  if (!items.length) {
    blocksBody.innerHTML = '<tr><td colspan="3">No allocation blocks found.</td></tr>';
    return;
  }

  blocksBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.start}-${item.stop}</td>
          <td>${item.name}</td>
          <td>${item.source}</td>
        </tr>
      `,
    )
    .join("");
}

function formatArray(items) {
  return items.length ? items.join(", ") : "-";
}

function renderResults(items) {
  if (!items.length) {
    resultsBody.innerHTML = '<tr><td colspan="4">No ASN matched this search.</td></tr>';
    return;
  }

  resultsBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>AS${item.asn}</td>
          <td>${formatArray(item.descriptions)}</td>
          <td>${formatArray([...item.domains, ...item.tenants, ...item.sites])}</td>
          <td>${formatArray(item.sources)}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadStatus() {
  try {
    const [healthResponse, dashboardResponse, inventoryResponse] = await Promise.all([
      fetch("/api/health"),
      fetch("/api/dashboard"),
      fetch("/api/asns?limit=30"),
    ]);
    const health = await healthResponse.json();
    const dashboard = await dashboardResponse.json();
    const inventory = await inventoryResponse.json();

    statusText.textContent = `Backend status: ${health.status}`;
    sourceDir.textContent = dashboard.source_dir;
    sourceFiles.textContent = `${dashboard.source_files.length} files loaded: ${dashboard.source_files.join(", ")}`;
    renderStats(dashboard.summary);
    renderRecommendations(dashboard.recommendations);
    renderDuplicates(dashboard.duplicate_asns);
    renderRouteSnapshots(dashboard.route_snapshots);
    renderBlocks(dashboard.blocks.slice(0, 20));
    renderResults(inventory.items);
  } catch (error) {
    statusText.textContent = "Backend status: unavailable";
    sourceDir.textContent = "Unable to load dashboard data.";
  }
}

async function searchAsns(query) {
  const response = await fetch(`/api/asns?limit=50&query=${encodeURIComponent(query)}`);
  const data = await response.json();
  renderResults(data.items);
}

searchInput.addEventListener("input", (event) => {
  searchAsns(event.target.value);
});

loadStatus();
