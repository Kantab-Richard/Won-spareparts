# WONSPAREPARTS Sales & Inventory Management

A Vercel-ready sales management system for WONSPAREPARTS using Google Sheets as the backend.

## What It Includes

- Dashboard for daily revenue, gross profit, net profit, and stock value
- Sales recorder that deducts item stock automatically
- Stock-in form that increases item stock automatically
- Item and category management
- Expense logger
- Manager-only settings for updating manager and sales login details
- Google Apps Script backend for a `WONSPAREPARTS_DB` spreadsheet

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and add your deployed Apps Script URL:

   ```bash
   APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   APPS_SCRIPT_TOKEN=change-this-secret-token
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

Without an Apps Script URL, the app runs in demo mode with sample records.

## Google Sheet Setup

1. Create a Google Sheet named `WONSPAREPARTS_DB`.
2. Open **Extensions > Apps Script**.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Edit `setApiToken` and replace `change-this-secret-token` with your own private token.
5. Run `setupWorkbook` once to create the tabs and headers.
6. Run `setApiToken` once to save the private token.
7. Deploy as **Web app**.
8. Set access to **Anyone**.
9. Copy the `/exec` web app URL into `.env.local` and Vercel.

## Vercel Deployment

1. Make sure the app builds locally:

   ```bash
   npm run build
   ```

2. Push this folder to GitHub.

3. Go to Vercel and click **Add New > Project**.

4. Import the GitHub repository.

5. Keep the framework preset as **Next.js**.

6. Add these environment variables in Vercel:

   ```bash
   APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   APPS_SCRIPT_TOKEN=change-this-secret-token
   ```

7. Click **Deploy**.

8. After deployment, open the Vercel URL and log in.

9. In the manager account, open **Settings** and update the manager and sales login details.

## Login Notes

- The login page does not show usernames or passwords.
- The manager can update login details from **Settings**.
- The current login system stores credentials in the browser for simple shop use.
- For stronger hosted security, add server-side authentication before giving public access to many users.

## Install As An App

This project includes PWA support, so users can install it on phones and desktop devices after it is hosted.

- On Android Chrome: open the Vercel URL, tap the browser menu, then tap **Add to Home screen** or **Install app**.
- On iPhone Safari: open the Vercel URL, tap **Share**, then tap **Add to Home Screen**.
- On desktop Chrome or Edge: open the Vercel URL and use the install icon in the address bar.

## Sheet Tabs

- `Categories`: `Category_ID`, `Category_Name`, `Status`
- `Items`: `Item_ID`, `Item_Name`, `Category_ID`, `Cost_Price`, `Selling_Price`, `Current_Stock`
- `Stock_In`: `StockIn_ID`, `Date`, `Item_ID`, `Qty_Added`, `Unit_Cost`, `Total_Cost`
- `Sales`: `Sale_ID`, `Date`, `Item_ID`, `Qty_Sold`, `Unit_Selling_Price`, `Unit_Cost_Price`, `Total_Revenue`, `Total_COGS`
- `Expenses`: `Expense_ID`, `Date`, `Description`, `Amount`
