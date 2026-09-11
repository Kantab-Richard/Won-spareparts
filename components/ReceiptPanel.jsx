"use client";

import { Printer } from "lucide-react";
import { defaultSettings, money } from "../lib/constants";

export function ReceiptPanel({ receipt, onClose }) {
  return (
    <section className="panel receipt-print-panel">
      <div className="panel-heading no-print">
        <div>
          <h2>Receipt Ready</h2>
          <span>{receipt.receiptNo}</span>
        </div>
        <button className="primary-button compact-button" type="button" onClick={() => window.print()}>
          <Printer size={16} />
          <span>Print</span>
        </button>
      </div>
      <div className="receipt-paper">
        <h2>{receipt.shopName || defaultSettings.shop_name}</h2>
        <p>Premium Auto & Industrial Parts</p>
        <strong>{receipt.welcomeNote || defaultSettings.welcome_note}</strong>
        <div className="receipt-meta">
          <span>Receipt No: {receipt.receiptNo}</span>
          <span>Date: {receipt.date}</span>
          <span>Sales Rep: {receipt.salesRep || "Sales Representative"}</span>
        </div>
        <div className="receipt-lines">
          {receipt.items.map((item) => (
            <div className="receipt-line" key={`${receipt.receiptNo}-${item.itemId}`}>
              <span>{item.name}</span>
              <span>{item.qty} x {money.format(item.unitPrice)}</span>
              <strong>{money.format(item.total)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-grand-total">
          <span>Total</span>
          <strong>{money.format(receipt.total)}</strong>
        </div>
        <p className="receipt-thanks">{receipt.thankYouNote || defaultSettings.thank_you_note}</p>
      </div>
      <button className="secondary-button compact-button no-print" type="button" onClick={onClose}>
        <span>Close Receipt</span>
      </button>
    </section>
  );
}

