"use client";

import { today, money } from "../lib/constants";
import { Field, FormPanel, Select, SupplierSelect, useForm } from "./ui";

export function StockForm({ items, suppliers, onSubmit }) {
  const [form, setForm] = useForm({ Date: today, Item_ID: "", Qty_Added: 1, Unit_Cost: 0, Supplier_ID: "", Invoice_No: "" });
  const activeSuppliers = suppliers.filter((supplier) => (supplier.Status || "Active") === "Active");

  return (
    <FormPanel
      title="Add Stock"
      button="Save Stock"
      onSubmit={() => onSubmit(form, () => setForm({ Date: today, Item_ID: "", Qty_Added: 1, Unit_Cost: 0, Supplier_ID: "", Invoice_No: "" }))}
    >
      <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
      <Select label="Item" value={form.Item_ID} onChange={(Item_ID) => setForm({ Item_ID })} options={items} />
      <SupplierSelect label="Supplier" value={form.Supplier_ID} onChange={(Supplier_ID) => setForm({ Supplier_ID })} options={activeSuppliers} />
      <Field label="Invoice No" value={form.Invoice_No} onChange={(Invoice_No) => setForm({ Invoice_No })} />
      <Field label="Quantity Added" type="number" value={form.Qty_Added} onChange={(Qty_Added) => setForm({ Qty_Added })} />
      <Field label="Unit Cost" type="number" value={form.Unit_Cost} onChange={(Unit_Cost) => setForm({ Unit_Cost })} />
      <div className="calculation">
        <span>Total cost</span>
        <strong>{money.format(Number(form.Qty_Added || 0) * Number(form.Unit_Cost || 0))}</strong>
      </div>
    </FormPanel>
  );
}

