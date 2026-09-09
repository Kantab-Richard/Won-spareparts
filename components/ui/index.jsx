"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { dateFilterOptions } from "../../lib/constants";
import { formatDateRange } from "../../lib/business";

export function Metric({ title, value }) {
  return (
    <section className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </section>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{message}</span>
      {actionLabel && (
        <button className="secondary-button" type="button" onClick={onAction}>
          <Plus size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

export function FormPanel({ title, button, children, onSubmit }) {
  return (
    <form
      className="panel form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        <Plus size={18} />
      </div>
      {children}
      <button className="primary-button" type="submit">
        <Plus size={18} />
        <span>{button}</span>
      </button>
    </form>
  );
}

export function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

export function Select({ label, value, onChange, options, category = false }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={category ? option.Category_ID : option.Item_ID} value={category ? option.Category_ID : option.Item_ID}>
            {category ? option.Category_Name : option.Item_Name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SupplierSelect({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No supplier selected</option>
        {options.map((supplier) => (
          <option key={supplier.Supplier_ID} value={supplier.Supplier_ID}>
            {supplier.Supplier_Name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StatusSelect({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </label>
  );
}

export function DateFilterControl({ filter, range, onChange }) {
  return (
    <section className="panel date-filter-panel">
      <div>
        <h2>Report Date</h2>
        <span>{formatDateRange(range)}</span>
      </div>
      <div className="date-filter-options">
        {dateFilterOptions.map((option) => (
          <button
            key={option.id}
            className={filter.mode === option.id ? "filter-chip active" : "filter-chip"}
            type="button"
            onClick={() => onChange({ ...filter, mode: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
      {filter.mode === "custom" && (
        <div className="custom-date-row">
          <Field label="Start Date" type="date" value={filter.start} onChange={(start) => onChange({ ...filter, start })} />
          <Field label="End Date" type="date" value={filter.end} onChange={(end) => onChange({ ...filter, end })} />
        </div>
      )}
    </section>
  );
}

export function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No records yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StockBadge({ value }) {
  const className = value <= 10 ? "stock-badge low" : "stock-badge";
  return <span className={className}>{value}</span>;
}

export function StatusBadge({ status }) {
  const normalized = status === "Inactive" ? "Inactive" : "Active";
  return <span className={normalized === "Active" ? "status-badge active" : "status-badge inactive"}>{normalized}</span>;
}

export function useForm(initial) {
  const [form, setFormState] = useState(initial);
  const setForm = (patch) => setFormState((current) => ({ ...current, ...patch }));
  return [form, setForm];
}
