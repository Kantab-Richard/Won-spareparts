"use client";

import { useState } from "react";
import { PackagePlus, Search } from "lucide-react";
import { money, today } from "../lib/constants";
import { guessCategoryId, guessItemId } from "../lib/business";
import { EmptyState, Field, Select, SupplierSelect, useForm } from "./ui";

export function AiSupplyScanPanel({ items, categories, suppliers, onAnalyze, onSaveRows }) {
  const [form, setForm] = useForm({ Date: today, Supplier_ID: "", Invoice_No: "", text: "", imageDataUrl: "", imageName: "" });
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeSuppliers = suppliers.filter((supplier) => (supplier.Status || "Active") === "Active");
  const activeCategories = categories.filter((category) => (category.Status || "Active") === "Active");
  const matchedRows = rows.filter((row) => Number(row.quantity || 0) > 0 && (row.Item_ID || (row.createNew && row.Category_ID)));
  const totalCost = matchedRows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unitCost || 0), 0);

  function readImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("Please upload an image smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm({ imageDataUrl: String(reader.result || ""), imageName: file.name });
      setMessage(`${file.name} ready for scanning`);
    };
    reader.readAsDataURL(file);
  }

  async function scanSupply() {
    setScanning(true);
    setMessage("Scanning supply sheet...");
    try {
      const result = await onAnalyze({ text: form.text, imageDataUrl: form.imageDataUrl });
      const nextRows = (result.items || []).map((row) => ({
        ...row,
        Item_ID: guessItemId(row.itemName, items),
        Category_ID: guessCategoryId(row.categoryName || row.suggestedCategory || "", categories),
        sellingPrice: Number(row.totalCost || 0) && Number(row.quantity || 0) ? Number(row.totalCost || 0) / Number(row.quantity || 1) : Number(row.unitCost || 0),
      }));
      nextRows.forEach((row) => {
        row.createNew = !row.Item_ID;
      });
      setRows(nextRows);
      if (result.transcript) {
        setForm({ text: result.transcript });
      }
      setMessage(result.message || `${nextRows.length} supply items found. Review before saving.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setScanning(false);
    }
  }

  function updateRow(index, patch) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function saveRows() {
    setSaving(true);
    setMessage("Saving reviewed supply rows...");
    try {
      await onSaveRows({
        Date: form.Date,
        Supplier_ID: form.Supplier_ID,
        Invoice_No: form.Invoice_No,
        rows: matchedRows,
      });
      setRows([]);
      setForm({ text: "", imageDataUrl: "", imageName: "" });
      setMessage(`${matchedRows.length} supply rows saved to stock.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ai-scan-grid">
      <section className="panel ai-scan-panel">
        <div className="panel-heading">
          <div>
            <h2>AI Supply Scan</h2>
            <span>Scan supplier sheets into stock-in rows.</span>
          </div>
          <Search size={18} />
        </div>
        <div className="scan-meta-grid">
          <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
          <SupplierSelect label="Supplier" value={form.Supplier_ID} onChange={(Supplier_ID) => setForm({ Supplier_ID })} options={activeSuppliers} />
          <Field label="Invoice No" value={form.Invoice_No} onChange={(Invoice_No) => setForm({ Invoice_No })} />
        </div>
        <label className="scan-upload">
          <input accept="image/*" type="file" onChange={readImage} />
          <span>{form.imageName || "Upload supply sheet photo"}</span>
        </label>
        <label className="field">
          <span>Paste Supply Text</span>
          <textarea
            value={form.text}
            onChange={(event) => setForm({ text: event.target.value })}
            placeholder="Example: Brake Pad, 12, 35"
          />
        </label>
        {message && <p className="scan-message">{message}</p>}
        <button className="primary-button" type="button" onClick={scanSupply} disabled={scanning || (!form.text && !form.imageDataUrl)}>
          <Search size={18} />
          <span>{scanning ? "Scanning..." : "Scan Supply Sheet"}</span>
        </button>
      </section>

      <section className="panel scan-review-panel">
        <div className="panel-heading">
          <div>
            <h2>Review Supply Items</h2>
            <span>{matchedRows.length} matched rows</span>
          </div>
          <PackagePlus size={18} />
        </div>
        {rows.length ? (
          <>
            <div className="scan-row-list">
              {rows.map((row, index) => (
                <article className="scan-row" key={`${row.itemName}-${index}`}>
                  <div>
                    <strong>{row.itemName}</strong>
                    <span>{Math.round(Number(row.confidence || 0) * 100)}% confidence</span>
                  </div>
                  <label className="field">
                    <span>Match Item</span>
                    <select
                      value={row.createNew ? "__new__" : row.Item_ID || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateRow(index, { createNew: value === "__new__", Item_ID: value === "__new__" ? "" : value });
                      }}
                    >
                      <option value="">Needs review</option>
                      <option value="__new__">Create new item</option>
                      {items.map((item) => (
                        <option key={item.Item_ID} value={item.Item_ID}>
                          {item.Item_Name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {row.createNew && (
                    <>
                      <Select label="Category" value={row.Category_ID || ""} onChange={(Category_ID) => updateRow(index, { Category_ID })} options={activeCategories} category />
                      <Field label="Selling Price" type="number" value={row.sellingPrice || 0} onChange={(sellingPrice) => updateRow(index, { sellingPrice })} />
                    </>
                  )}
                  <Field label="Qty" type="number" value={row.quantity || 0} onChange={(quantity) => updateRow(index, { quantity })} />
                  <Field label="Unit Cost" type="number" value={row.unitCost || 0} onChange={(unitCost) => updateRow(index, { unitCost })} />
                  <strong>{money.format(Number(row.quantity || 0) * Number(row.unitCost || 0))}</strong>
                </article>
              ))}
            </div>
            <div className="scan-total">
              <span>Total stock cost</span>
              <strong>{money.format(totalCost)}</strong>
            </div>
            <button className="primary-button" type="button" onClick={saveRows} disabled={saving || !matchedRows.length}>
              <PackagePlus size={18} />
              <span>{saving ? "Saving..." : "Save Reviewed Stock"}</span>
            </button>
          </>
        ) : (
          <EmptyState title="No scan results yet" message="Upload a supply sheet photo or paste supplier text, then scan it." />
        )}
      </section>
    </div>
  );
}

