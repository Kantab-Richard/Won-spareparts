"use client";

import { useState } from "react";
import { Pencil, Plus, RefreshCw, Settings, ShieldCheck, UserRound } from "lucide-react";
import { salesRepToUser } from "../lib/business";
import { EmptyState, Field, StatusBadge, StatusSelect, useForm } from "./ui";

export function SettingsPanel({ users, salesReps, onSave, onAddSalesRep, onUpdateSalesRep, onCheckConnection }) {
  const [form, setForm] = useState(() => ({
    managerName: users.find((user) => user.role === "manager")?.name || "Manager",
    managerUsername: users.find((user) => user.role === "manager")?.username || "",
    managerPassword: users.find((user) => user.role === "manager")?.password || "",
  }));
  const [repForm, setRepForm] = useForm({ Rep_Name: "", Username: "", Password: "", Phone: "", Status: "Active" });
  const [editingRepId, setEditingRepId] = useState("");
  const [editRepForm, setEditRepForm] = useForm({ Rep_ID: "", Rep_Name: "", Username: "", Password: "", Phone: "", Status: "Active" });
  const [message, setMessage] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [checkingConnection, setCheckingConnection] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveSettings(event) {
    event.preventDefault();
    const required = [
      form.managerName,
      form.managerUsername,
      form.managerPassword,
    ];

    if (required.some((value) => !String(value).trim())) {
      setMessage("All login fields are required.");
      return;
    }

    onSave([
      {
        role: "manager",
        name: form.managerName.trim(),
        username: form.managerUsername.trim(),
        password: form.managerPassword,
      },
      ...salesReps.filter((rep) => (rep.Status || "Active") === "Active").map(salesRepToUser),
    ]);
    setMessage("Manager login saved successfully.");
  }

  async function addRep(event) {
    event.preventDefault();
    if (!repForm.Rep_Name || !repForm.Username || !repForm.Password) {
      setMessage("Sales rep name, username, and password are required.");
      return;
    }
    if (repForm.Username.trim().toLowerCase() === form.managerUsername.trim().toLowerCase()) {
      setMessage("Sales rep username cannot be the same as manager username.");
      return;
    }
    try {
      await onAddSalesRep(repForm, () => setRepForm({ Rep_Name: "", Username: "", Password: "", Phone: "", Status: "Active" }));
      setMessage("Sales representative saved.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function beginRepEdit(rep) {
    setEditingRepId(rep.Rep_ID);
    setEditRepForm({
      Rep_ID: rep.Rep_ID,
      Rep_Name: rep.Rep_Name,
      Username: rep.Username,
      Password: rep.Password,
      Phone: rep.Phone || "",
      Status: rep.Status || "Active",
    });
  }

  async function saveRepEdit(event) {
    event.preventDefault();
    if (editRepForm.Username.trim().toLowerCase() === form.managerUsername.trim().toLowerCase()) {
      setMessage("Sales rep username cannot be the same as manager username.");
      return;
    }
    try {
      await onUpdateSalesRep(editRepForm);
      setEditingRepId("");
      setMessage("Sales representative updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function testConnection() {
    setCheckingConnection(true);
    setConnectionMessage("Checking connection...");
    try {
      const result = await onCheckConnection();
      setConnectionMessage(result.demo ? result.message : result.message || "Google Sheets connection is working.");
    } catch (error) {
      setConnectionMessage(error.message);
    } finally {
      setCheckingConnection(false);
    }
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-actions connection-card">
        <div>
          <h2>Google Sheets Connection</h2>
          <p>Test this before creating real items, categories, stock, sales, or expenses.</p>
          {connectionMessage && <span>{connectionMessage}</span>}
        </div>
        <button className="secondary-button" type="button" onClick={testConnection} disabled={checkingConnection}>
          <RefreshCw size={18} />
          <span>{checkingConnection ? "Checking..." : "Test Connection"}</span>
        </button>
      </section>

      <form className="panel settings-card" onSubmit={saveSettings}>
        <div className="panel-heading">
          <div>
            <h2>Manager Login</h2>
            <span>Full access to dashboard, stock, expenses, categories, and settings.</span>
          </div>
          <ShieldCheck size={20} />
        </div>
        <Field label="Display Name" value={form.managerName} onChange={(managerName) => update("managerName", managerName)} />
        <Field label="Username" value={form.managerUsername} onChange={(managerUsername) => update("managerUsername", managerUsername)} />
        <Field label="Password" type="password" value={form.managerPassword} onChange={(managerPassword) => update("managerPassword", managerPassword)} />
        <button className="primary-button" type="submit">
          <Settings size={18} />
          <span>Save Manager Login</span>
        </button>
        {message && <p className="scan-message">{message}</p>}
      </form>

      <form className="panel settings-card" onSubmit={addRep}>
        <div className="panel-heading">
          <div>
            <h2>Add Sales Rep</h2>
            <span>Each sales representative gets unique login details.</span>
          </div>
          <UserRound size={20} />
        </div>
        <Field label="Full Name" value={repForm.Rep_Name} onChange={(Rep_Name) => setRepForm({ Rep_Name })} />
        <Field label="Username" value={repForm.Username} onChange={(Username) => setRepForm({ Username })} />
        <Field label="Password" type="password" value={repForm.Password} onChange={(Password) => setRepForm({ Password })} />
        <Field label="Phone" value={repForm.Phone} onChange={(Phone) => setRepForm({ Phone })} />
        <StatusSelect label="Status" value={repForm.Status} onChange={(Status) => setRepForm({ Status })} />
        <button className="primary-button" type="submit">
          <Plus size={18} />
          <span>Add Sales Rep</span>
        </button>
      </form>

      <section className="panel sales-rep-list-card">
        <div className="panel-heading">
          <div>
            <h2>Sales Representatives</h2>
            <span>{salesReps.length} users</span>
          </div>
          <UserRound size={20} />
        </div>
        {salesReps.length ? (
          <div className="sales-rep-list">
            {salesReps.map((rep) => (
              <article className="sales-rep-card" key={rep.Rep_ID}>
                {editingRepId === rep.Rep_ID ? (
                  <form className="rep-edit-form" onSubmit={saveRepEdit}>
                    <Field label="Full Name" value={editRepForm.Rep_Name} onChange={(Rep_Name) => setEditRepForm({ Rep_Name })} />
                    <Field label="Username" value={editRepForm.Username} onChange={(Username) => setEditRepForm({ Username })} />
                    <Field label="Password" type="password" value={editRepForm.Password} onChange={(Password) => setEditRepForm({ Password })} />
                    <Field label="Phone" value={editRepForm.Phone} onChange={(Phone) => setEditRepForm({ Phone })} />
                    <StatusSelect label="Status" value={editRepForm.Status} onChange={(Status) => setEditRepForm({ Status })} />
                    <div className="edit-actions">
                      <button className="primary-button compact-button" type="submit">
                        <span>Save</span>
                      </button>
                      <button className="secondary-button compact-button" type="button" onClick={() => setEditingRepId("")}>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <strong>{rep.Rep_Name}</strong>
                      <span>{rep.Username} {rep.Phone ? `- ${rep.Phone}` : ""}</span>
                    </div>
                    <StatusBadge status={rep.Status || "Active"} />
                    <button className="secondary-button compact-button" type="button" onClick={() => beginRepEdit(rep)}>
                      <Pencil size={15} />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No sales reps yet" message="Add the first sales representative to give them their own login." />
        )}
      </section>
    </div>
  );
}

