import "./styles.css";

const statusText = document.querySelector("#status-text");

async function loadStatus() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    statusText.textContent = `Backend status: ${data.status}`;
  } catch (error) {
    statusText.textContent = "Backend status: unavailable";
  }
}

loadStatus();
