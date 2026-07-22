export const sampleData = {
  categories: [
    { Category_ID: "CAT-001", Category_Name: "Tricycle (Pragia)", Status: "Active" },
    { Category_ID: "CAT-002", Category_Name: "Motorcycle", Status: "Active" },
    { Category_ID: "CAT-003", Category_Name: "Industrial Parts", Status: "Active" },
  ],
  items: [
    {
      Item_ID: "ITM-001",
      Item_Name: "Brake Pad",
      Category_ID: "CAT-001",
      Cost_Price: 30,
      Selling_Price: 50,
      Current_Stock: 150,
    },
    {
      Item_ID: "ITM-002",
      Item_Name: "Spark Plug",
      Category_ID: "CAT-002",
      Cost_Price: 10,
      Selling_Price: 20,
      Current_Stock: 80,
    },
    {
      Item_ID: "ITM-003",
      Item_Name: "Gear Cable",
      Category_ID: "CAT-003",
      Cost_Price: 45,
      Selling_Price: 75,
      Current_Stock: 18,
    },
  ],
  sales: [
    {
      Sale_ID: "SAL-501",
      Date: new Date().toISOString().slice(0, 10),
      Item_ID: "ITM-001",
      Qty_Sold: 2,
      Unit_Selling_Price: 50,
      Unit_Cost_Price: 30,
      Total_Revenue: 100,
      Total_COGS: 60,
    },
  ],
  stockIn: [
    {
      StockIn_ID: "STK-101",
      Date: new Date().toISOString().slice(0, 10),
      Item_ID: "ITM-001",
      Qty_Added: 50,
      Unit_Cost: 30,
      Total_Cost: 1500,
    },
  ],
  expenses: [
    {
      Expense_ID: "EXP-001",
      Date: new Date().toISOString().slice(0, 10),
      Description: "Shop Rent / Electricity",
      Amount: 100,
    },
  ],
};
