const SPREADSHEET_NAME = 'WONSPAREPARTS_DB';

const SHEETS = {
  categories: {
    name: 'Categories',
    headers: ['Category_ID', 'Category_Name', 'Status'],
    prefix: 'CAT',
  },
  items: {
    name: 'Items',
    headers: ['Item_ID', 'Item_Name', 'Category_ID', 'Cost_Price', 'Selling_Price', 'Current_Stock', 'Status'],
    prefix: 'ITM',
  },
  stockIn: {
    name: 'Stock_In',
    headers: ['StockIn_ID', 'Date', 'Item_ID', 'Qty_Added', 'Unit_Cost', 'Total_Cost', 'Supplier_ID', 'Invoice_No'],
    prefix: 'STK',
  },
  suppliers: {
    name: 'Suppliers',
    headers: ['Supplier_ID', 'Supplier_Name', 'Phone', 'Status'],
    prefix: 'SUP',
  },
  movements: {
    name: 'Stock_Movements',
    headers: ['Movement_ID', 'Date', 'Item_ID', 'Type', 'Qty_Change', 'Balance_After', 'Reference', 'Note'],
    prefix: 'MOV',
  },
  sales: {
    name: 'Sales',
    headers: ['Sale_ID', 'Date', 'Item_ID', 'Qty_Sold', 'Unit_Selling_Price', 'Unit_Cost_Price', 'Total_Revenue', 'Total_COGS', 'Receipt_No'],
    prefix: 'SAL',
  },
  expenses: {
    name: 'Expenses',
    headers: ['Expense_ID', 'Date', 'Description', 'Amount'],
    prefix: 'EXP',
  },
};

function doGet() {
  return jsonResponse({ ok: true, message: 'WONSPAREPARTS API is running' });
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    verifyToken(body.token);
    const payload = body.payload || {};

    if (body.action === 'healthCheck') return jsonResponse({ ok: true, message: 'Google Sheets connection is working' });
    if (body.action === 'getDashboard') return jsonResponse({ ok: true, data: getDashboardData() });
    if (body.action === 'addCategory') return jsonResponse(addCategory(payload));
    if (body.action === 'updateCategory') return jsonResponse(updateCategory(payload));
    if (body.action === 'addItem') return jsonResponse(addItem(payload));
    if (body.action === 'updateItem') return jsonResponse(updateItem(payload));
    if (body.action === 'addSupplier') return jsonResponse(addSupplier(payload));
    if (body.action === 'updateSupplier') return jsonResponse(updateSupplier(payload));
    if (body.action === 'addStock') return jsonResponse(addStock(payload));
    if (body.action === 'addSale') return jsonResponse(addSale(payload));
    if (body.action === 'addBasketSale') return jsonResponse(addBasketSale(payload));
    if (body.action === 'addExpense') return jsonResponse(addExpense(payload));

    throw new Error('Unknown action');
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function setApiToken() {
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', 'change-this-secret-token');
}

function setupWorkbook() {
  const spreadsheet = getSpreadsheet();
  Object.keys(SHEETS).forEach((key) => {
    const config = SHEETS[key];
    const sheet = spreadsheet.getSheetByName(config.name) || spreadsheet.insertSheet(config.name);
    sheet.clear();
    sheet.appendRow(config.headers);
    sheet.setFrozenRows(1);
  });
}

function addCategory(payload) {
  requireFields(payload, ['Category_Name']);
  appendObject('categories', {
    Category_ID: nextId('categories'),
    Category_Name: payload.Category_Name,
    Status: payload.Status || 'Active',
  });
  return { ok: true, data: getDashboardData() };
}

function updateCategory(payload) {
  requireFields(payload, ['Category_ID', 'Category_Name', 'Status']);
  const sheet = getSpreadsheet().getSheetByName(SHEETS.categories.name);
  const rows = readObjects('categories');
  const index = rows.findIndex((row) => row.Category_ID === payload.Category_ID);
  if (index === -1) throw new Error('Category not found');

  const nameColumn = SHEETS.categories.headers.indexOf('Category_Name') + 1;
  const statusColumn = SHEETS.categories.headers.indexOf('Status') + 1;
  sheet.getRange(index + 2, nameColumn).setValue(payload.Category_Name);
  sheet.getRange(index + 2, statusColumn).setValue(payload.Status);
  return { ok: true, data: getDashboardData() };
}

function addItem(payload) {
  requireFields(payload, ['Item_Name', 'Category_ID']);
  const nextItemId = nextId('items');
  const openingStock = number(payload.Current_Stock);
  appendObject('items', {
    Item_ID: nextItemId,
    Item_Name: payload.Item_Name,
    Category_ID: payload.Category_ID,
    Cost_Price: number(payload.Cost_Price),
    Selling_Price: number(payload.Selling_Price),
    Current_Stock: openingStock,
    Status: payload.Status || 'Active',
  });
  if (openingStock !== 0) {
    appendMovement(payload.Date || new Date(), nextItemId, 'Opening Stock', openingStock, openingStock, nextItemId, 'New item opening balance');
  }
  return { ok: true, data: getDashboardData() };
}

function updateItem(payload) {
  requireFields(payload, ['Item_ID', 'Item_Name', 'Category_ID', 'Status']);
  const sheet = getSpreadsheet().getSheetByName(SHEETS.items.name);
  const rows = readObjects('items');
  const index = rows.findIndex((row) => row.Item_ID === payload.Item_ID);
  if (index === -1) throw new Error('Item not found');
  const oldStock = number(rows[index].Current_Stock);
  const nextStock = number(payload.Current_Stock);

  const updates = {
    Item_Name: payload.Item_Name,
    Category_ID: payload.Category_ID,
    Cost_Price: number(payload.Cost_Price),
    Selling_Price: number(payload.Selling_Price),
    Current_Stock: nextStock,
    Status: payload.Status,
  };

  Object.keys(updates).forEach((header) => {
    const column = SHEETS.items.headers.indexOf(header) + 1;
    sheet.getRange(index + 2, column).setValue(updates[header]);
  });

  const stockDelta = nextStock - oldStock;
  if (stockDelta !== 0) {
    appendMovement(new Date(), payload.Item_ID, 'Manual Adjustment', stockDelta, nextStock, payload.Item_ID, 'Manager updated item stock');
  }

  return { ok: true, data: getDashboardData() };
}

function addSupplier(payload) {
  requireFields(payload, ['Supplier_Name']);
  appendObject('suppliers', {
    Supplier_ID: nextId('suppliers'),
    Supplier_Name: payload.Supplier_Name,
    Phone: payload.Phone || '',
    Status: payload.Status || 'Active',
  });
  return { ok: true, data: getDashboardData() };
}

function updateSupplier(payload) {
  requireFields(payload, ['Supplier_ID', 'Supplier_Name', 'Status']);
  const sheet = getSpreadsheet().getSheetByName(SHEETS.suppliers.name);
  const rows = readObjects('suppliers');
  const index = rows.findIndex((row) => row.Supplier_ID === payload.Supplier_ID);
  if (index === -1) throw new Error('Supplier not found');

  const updates = {
    Supplier_Name: payload.Supplier_Name,
    Phone: payload.Phone || '',
    Status: payload.Status,
  };

  Object.keys(updates).forEach((header) => {
    const column = SHEETS.suppliers.headers.indexOf(header) + 1;
    sheet.getRange(index + 2, column).setValue(updates[header]);
  });

  return { ok: true, data: getDashboardData() };
}

function addStock(payload) {
  requireFields(payload, ['Date', 'Item_ID', 'Qty_Added', 'Unit_Cost']);
  const item = findItem(payload.Item_ID);
  if ((item.Status || 'Active') !== 'Active') throw new Error('This item is inactive');
  const qty = number(payload.Qty_Added);
  const unitCost = number(payload.Unit_Cost);
  const stockInId = nextId('stockIn');
  const nextBalance = number(item.Current_Stock) + qty;
  appendObject('stockIn', {
    StockIn_ID: stockInId,
    Date: payload.Date,
    Item_ID: payload.Item_ID,
    Qty_Added: qty,
    Unit_Cost: unitCost,
    Total_Cost: qty * unitCost,
    Supplier_ID: payload.Supplier_ID || '',
    Invoice_No: payload.Invoice_No || '',
  });
  updateItemStock(payload.Item_ID, qty);
  appendMovement(payload.Date, payload.Item_ID, 'Stock In', qty, nextBalance, stockInId, payload.Invoice_No || 'Stock purchase');
  return { ok: true, data: getDashboardData() };
}

function addSale(payload) {
  requireFields(payload, ['Date', 'Item_ID', 'Qty_Sold']);
  const item = findItem(payload.Item_ID);
  if ((item.Status || 'Active') !== 'Active') throw new Error('This item is inactive');
  const qty = number(payload.Qty_Sold);
  const currentStock = number(item.Current_Stock);
  if (qty > currentStock) throw new Error('Not enough stock for this sale');

  const sellingPrice = number(item.Selling_Price);
  const costPrice = number(item.Cost_Price);
  const saleId = nextId('sales');
  appendObject('sales', {
    Sale_ID: saleId,
    Date: payload.Date,
    Item_ID: payload.Item_ID,
    Qty_Sold: qty,
    Unit_Selling_Price: sellingPrice,
    Unit_Cost_Price: costPrice,
    Total_Revenue: qty * sellingPrice,
    Total_COGS: qty * costPrice,
    Receipt_No: payload.Receipt_No || saleId,
  });
  updateItemStock(payload.Item_ID, -qty);
  appendMovement(payload.Date, payload.Item_ID, 'Sale', -qty, currentStock - qty, saleId, 'Sale deduction');
  return { ok: true, data: getDashboardData() };
}

function addBasketSale(payload) {
  requireFields(payload, ['Date', 'Items']);
  if (!Array.isArray(payload.Items) || payload.Items.length === 0) throw new Error('Sale cart is empty');

  const receiptNo = `RCT-${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss')}`;
  const grouped = {};
  payload.Items.forEach((entry) => {
    if (!entry.Item_ID) throw new Error('Cart item is missing');
    grouped[entry.Item_ID] = (grouped[entry.Item_ID] || 0) + number(entry.Qty_Sold);
  });

  Object.keys(grouped).forEach((itemId) => {
    if (grouped[itemId] <= 0) throw new Error('Cart quantities must be more than zero');
    const item = findItem(itemId);
    if ((item.Status || 'Active') !== 'Active') throw new Error(`${item.Item_Name} is inactive`);
    if (grouped[itemId] > number(item.Current_Stock)) throw new Error(`Not enough stock for ${item.Item_Name}`);
  });

  Object.keys(grouped).forEach((itemId) => {
    const item = findItem(itemId);
    const qty = grouped[itemId];
    const currentStock = number(item.Current_Stock);
    const sellingPrice = number(item.Selling_Price);
    const costPrice = number(item.Cost_Price);
    const saleId = nextId('sales');

    appendObject('sales', {
      Sale_ID: saleId,
      Date: payload.Date,
      Item_ID: itemId,
      Qty_Sold: qty,
      Unit_Selling_Price: sellingPrice,
      Unit_Cost_Price: costPrice,
      Total_Revenue: qty * sellingPrice,
      Total_COGS: qty * costPrice,
      Receipt_No: receiptNo,
    });
    updateItemStock(itemId, -qty);
    appendMovement(payload.Date, itemId, 'Basket Sale', -qty, currentStock - qty, receiptNo, 'Basket sale deduction');
  });

  return { ok: true, receiptNo: receiptNo, data: getDashboardData() };
}

function addExpense(payload) {
  requireFields(payload, ['Date', 'Description', 'Amount']);
  appendObject('expenses', {
    Expense_ID: nextId('expenses'),
    Date: payload.Date,
    Description: payload.Description,
    Amount: number(payload.Amount),
  });
  return { ok: true, data: getDashboardData() };
}

function getDashboardData() {
  ensureHeaders();
  return {
    categories: readObjects('categories'),
    items: readObjects('items'),
    stockIn: readObjects('stockIn'),
    suppliers: readObjects('suppliers'),
    movements: readObjects('movements'),
    sales: readObjects('sales'),
    expenses: readObjects('expenses'),
  };
}

function getSpreadsheet() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  return SpreadsheetApp.create(SPREADSHEET_NAME);
}

function ensureHeaders() {
  const spreadsheet = getSpreadsheet();
  Object.keys(SHEETS).forEach((key) => {
    const config = SHEETS[key];
    const sheet = spreadsheet.getSheetByName(config.name) || spreadsheet.insertSheet(config.name);
    const existing = sheet.getRange(1, 1, 1, config.headers.length).getValues()[0];
    if (existing.join('') === '') {
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.setFrozenRows(1);
      return;
    }
    config.headers.forEach((header, index) => {
      if (existing[index] !== header) sheet.getRange(1, index + 1).setValue(header);
    });
  });
}

function readObjects(key) {
  const config = SHEETS[key];
  const sheet = getSpreadsheet().getSheetByName(config.name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, config.headers.length).getValues();
  return values
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => Object.fromEntries(config.headers.map((header, index) => [header, normalizeCell(header, row[index])])));
}

function appendObject(key, object) {
  const config = SHEETS[key];
  const row = config.headers.map((header) => object[header] ?? '');
  getSpreadsheet().getSheetByName(config.name).appendRow(row);
}

function nextId(key) {
  const config = SHEETS[key];
  const idHeader = config.headers[0];
  const rows = readObjects(key);
  const max = rows.reduce((highest, row) => {
    const value = String(row[idHeader] || '').split('-')[1];
    return Math.max(highest, Number(value) || 0);
  }, 0);
  return `${config.prefix}-${String(max + 1).padStart(3, '0')}`;
}

function findItem(itemId) {
  const item = readObjects('items').find((row) => row.Item_ID === itemId);
  if (!item) throw new Error('Item not found');
  return item;
}

function updateItemStock(itemId, delta) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.items.name);
  const rows = readObjects('items');
  const index = rows.findIndex((row) => row.Item_ID === itemId);
  if (index === -1) throw new Error('Item not found');
  const stockColumn = SHEETS.items.headers.indexOf('Current_Stock') + 1;
  const currentStock = number(rows[index].Current_Stock);
  sheet.getRange(index + 2, stockColumn).setValue(currentStock + delta);
}

function appendMovement(date, itemId, type, qtyChange, balanceAfter, reference, note) {
  appendObject('movements', {
    Movement_ID: nextId('movements'),
    Date: date,
    Item_ID: itemId,
    Type: type,
    Qty_Change: number(qtyChange),
    Balance_After: number(balanceAfter),
    Reference: reference || '',
    Note: note || '',
  });
}

function requireFields(payload, fields) {
  fields.forEach((field) => {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new Error(`${field} is required`);
    }
  });
}

function number(value) {
  return Number(value || 0);
}

function normalizeCell(header, value) {
  if (header === 'Date' && Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyToken(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (expected && token !== expected) throw new Error('Invalid API token');
}
