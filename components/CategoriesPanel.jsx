"use client";

import { Pencil } from "lucide-react";
import { EmptyState, Field, FormPanel, StatusBadge, StatusSelect, useForm } from "./ui";

export function CategoriesPanel({ categories, onSubmit, onUpdate }) {
  const [form, setForm] = useForm({ Category_Name: "", Status: "Active" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useForm({ Category_ID: "", Category_Name: "", Status: "Active" });

  function beginEdit(category) {
    setEditingId(category.Category_ID);
    setEditForm({
      Category_ID: category.Category_ID,
      Category_Name: category.Category_Name,
      Status: category.Status || "Active",
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({ Category_ID: "", Category_Name: "", Status: "Active" });
  }

  function saveEdit(event) {
    event.preventDefault();
    onUpdate(editForm);
    cancelEdit();
  }

  return (
    <div className="category-layout">
      <FormPanel
        title="Create Category"
        button="Add Category"
        onSubmit={() => onSubmit(form, () => setForm({ Category_Name: "", Status: "Active" }))}
      >
        <Field label="Category Name" value={form.Category_Name} onChange={(Category_Name) => setForm({ Category_Name })} />
        <label className="field">
          <span>Status</span>
          <select value={form.Status} onChange={(event) => setForm({ Status: event.target.value })}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>
      </FormPanel>
      <section className="panel">
        <div className="panel-heading item-list-heading">
          <div>
            <h2>Category List</h2>
            <span>{categories.length} categories</span>
          </div>
        </div>
        {categories.length ? (
          <div className="category-list">
            {categories.map((category) => {
              const isEditing = editingId === category.Category_ID;
              return (
                <article className="category-card" key={category.Category_ID}>
                  {isEditing ? (
                    <form className="category-edit-form" onSubmit={saveEdit}>
                      <Field
                        label="Category Name"
                        value={editForm.Category_Name}
                        onChange={(Category_Name) => setEditForm({ Category_Name })}
                      />
                      <label className="field">
                        <span>Status</span>
                        <select value={editForm.Status} onChange={(event) => setEditForm({ Status: event.target.value })}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </label>
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
                        <strong>{category.Category_Name}</strong>
                        <span>{category.Category_ID}</span>
                      </div>
                      <StatusBadge status={category.Status || "Active"} />
                      <button className="secondary-button" type="button" onClick={() => beginEdit(category)}>
                        <span>Edit</span>
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No categories created" message="Create categories first, then attach items to them." />
        )}
      </section>
    </div>
  );
}

