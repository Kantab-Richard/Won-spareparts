"use client";

import { Pencil } from "lucide-react";
import { EmptyState, Field, FormPanel, StatusBadge, StatusSelect, useForm } from "./ui";

export function SuppliersPanel({ suppliers, onSubmit, onUpdate }) {
  const [form, setForm] = useForm({ Supplier_Name: "", Phone: "", Status: "Active" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useForm({ Supplier_ID: "", Supplier_Name: "", Phone: "", Status: "Active" });

  function beginEdit(supplier) {
    setEditingId(supplier.Supplier_ID);
    setEditForm({
      Supplier_ID: supplier.Supplier_ID,
      Supplier_Name: supplier.Supplier_Name,
      Phone: supplier.Phone || "",
      Status: supplier.Status || "Active",
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({ Supplier_ID: "", Supplier_Name: "", Phone: "", Status: "Active" });
  }

  function saveEdit(event) {
    event.preventDefault();
    onUpdate(editForm);
    cancelEdit();
  }

  return (
    <div className="split">
      <FormPanel
        title="Create Supplier"
        button="Add Supplier"
        onSubmit={() => onSubmit(form, () => setForm({ Supplier_Name: "", Phone: "", Status: "Active" }))}
      >
        <Field label="Supplier Name" value={form.Supplier_Name} onChange={(Supplier_Name) => setForm({ Supplier_Name })} />
        <Field label="Phone" value={form.Phone} onChange={(Phone) => setForm({ Phone })} />
        <StatusSelect label="Status" value={form.Status} onChange={(Status) => setForm({ Status })} />
      </FormPanel>
      <section className="panel">
        <div className="panel-heading">
          <h2>Supplier List</h2>
          <span>{suppliers.length} suppliers</span>
        </div>
        {suppliers.length ? (
          <div className="supplier-list">
            {suppliers.map((supplier) => (
              <article className="supplier-card" key={supplier.Supplier_ID}>
                {editingId === supplier.Supplier_ID ? (
                  <form className="supplier-edit-form" onSubmit={saveEdit}>
                    <Field label="Supplier Name" value={editForm.Supplier_Name} onChange={(Supplier_Name) => setEditForm({ Supplier_Name })} />
                    <Field label="Phone" value={editForm.Phone} onChange={(Phone) => setEditForm({ Phone })} />
                    <StatusSelect label="Status" value={editForm.Status} onChange={(Status) => setEditForm({ Status })} />
                    <div className="category-actions">
                      <button className="primary-button compact-button" type="submit">
                        <span>Update</span>
                      </button>
                      <button className="secondary-button" type="button" onClick={cancelEdit}>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{supplier.Supplier_Name}</strong>
                      <span>{supplier.Supplier_ID}</span>
                    </div>
                    <span>{supplier.Phone || "-"}</span>
                    <StatusBadge status={supplier.Status || "Active"} />
                    <button className="secondary-button" type="button" onClick={() => beginEdit(supplier)}>
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No suppliers yet" message="Add suppliers before recording stock purchases." />
        )}
      </section>
    </div>
  );
}

