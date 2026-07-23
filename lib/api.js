async function request(action, payload = {}) {
  const response = await fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The server returned a web page instead of data. Please check the app server and API setup.");
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || "Request failed");
  }
  return result;
}

export async function fetchDatabase() {
  const result = await request("getDashboard");
  return result.data;
}

export async function checkConnection() {
  return request("healthCheck");
}

export async function addCategory(payload) {
  return request("addCategory", { payload });
}

export async function updateCategory(payload) {
  return request("updateCategory", { payload });
}

export async function addItem(payload) {
  return request("addItem", { payload });
}

export async function addStock(payload) {
  return request("addStock", { payload });
}

export async function addSale(payload) {
  return request("addSale", { payload });
}

export async function addExpense(payload) {
  return request("addExpense", { payload });
}
