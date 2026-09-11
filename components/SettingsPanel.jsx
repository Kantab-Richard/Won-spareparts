"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, ReceiptText, RefreshCw, Save, Settings, ShieldCheck, UserRound } from "lucide-react";
import { defaultSettings } from "../lib/constants";
import { EmptyState, Field, StatusBadge, StatusSelect, useForm } from "./ui";

export function SettingsPanel({ settings, salesReps, onSaveSettings, onAddSalesRep, onUpdateSalesRep, onCheckConnection }) {
  const [activeSection, setActiveSection] = useState("system");
  const [form, setForm] = useState(() => ({
    ...defaultSettings,
    ...settings,
    manager_password: "",
  }));
  const [repForm, setRepForm] = useForm({ Rep_Name: "", Username: "", Password: "", Phone: "", Status: "Active" });
  const [editingRepId, setEditingRepId] = useState("");
  const [editRepForm, setEditRepForm] = useForm({ Rep_ID: "", Rep_Name: "", Username: "", Password: "", Phone: "", Status: "Active" });
  const [message, setMessage] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...defaultSettings,
      ...settings,
      manager_password: current.manager_password || "",
    }));
  }, [settings]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!String(form.manager_name || "").trim() || !String(form.manager_username || "").trim()) {
      setMessage("Manager name and username are required.");
      return;
    }

    try {
      await onSaveSettings({
        manager_name: form.manager_name.trim(),
        manager_username: form.manager_username.trim(),
        manager_password: form.manager_password,
        low_stock_limit: form.low_stock_limit,
        shop_name: form.shop_name,
        welcome_note: form.welcome_note,
        thank_you_note: form.thank_you_note,
      });
      setForm((current) => ({ ...current, manager_password: "" }));
      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addRep(event) {
    event.preventDefault();
    if (!repForm.Rep_Name || !repForm.Username || !repForm.Password) {
      setMessage("Sales rep name, username, and password are required.");
      return;
    }
    if (repForm.Username.trim().toLowerCase() === form.manager_username.trim().toLowerCase()) {
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
    if (editRepForm.Username.trim().toLowerCase() === form.manager_username.trim().toLowerCase()) {
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
      <section className="panel settings-actions">
        <div>
          <h2>Settings</h2>
          <p>Manage system behavior, users, and printed receipt text from one place.</p>
          {message && <span>{message}</span>}
        </div>
        <div className="settings-tabs">
          <button className={activeSection === "system" ? "filter-chip active" : "filter-chip"} type="button" onClick={() => setActiveSection("system")}>
            <Settings size={16} />
            <span>System</span>
          </button>
          <button className={activeSection === "users" ? "filter-chip active" : "filter-chip"} type="button" onClick={() => setActiveSection("users")}>
            <UserRound size={16} />
            <span>Users</span>
          </button>
          <button className={activeSection === "receipt" ? "filter-chip active" : "filter-chip"} type="button" onClick={() => setActiveSection("receipt")}>
            <ReceiptText size={16} />
            <span>Receipt</span>
          </button>
        </div>
      </section>

      {activeSection === "system" && (
        <>
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
                <h2>Stock Alerts</h2>
                <span>Manager low-stock alerts use this limit.</span>
              </div>
              <Settings size={20} />
            </div>
            <Field label="Low Stock Limit" type="number" value={form.low_stock_limit} onChange={(low_stock_limit) => update("low_stock_limit", low_stock_limit)} />
            <button className="primary-button" type="submit">
              <Save size={18} />
              <span>Save System Settings</span>
            </button>
          </form>
        </>
      )}

      {activeSection === "users" && (
        <>
          <form className="panel settings-card" onSubmit={saveSettings}>
            <div className="panel-heading">
              <div>
                <h2>Manager Login</h2>
                <span>Leave password blank when you do not want to change it.</span>
              </div>
              <ShieldCheck size={20} />
            </div>
            <Field label="Display Name" value={form.manager_name} onChange={(manager_name) => update("manager_name", manager_name)} />
            <Field label="Username" value={form.manager_username} onChange={(manager_username) => update("manager_username", manager_username)} />
            <Field label="New Password" type="password" value={form.manager_password} onChange={(manager_password) => update("manager_password", manager_password)} required={false} />
            <button className="primary-button" type="submit">
              <Save size={18} />
              <span>Save Manager Login</span>
            </button>
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
            <Field label="Phone" value={repForm.Phone} onChange={(Phone) => setRepForm({ Phone })} required={false} />
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
                        <Field label="Phone" value={editRepForm.Phone} onChange={(Phone) => setEditRepForm({ Phone })} required={false} />
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
        </>
      )}

      {activeSection === "receipt" && (
        <form className="panel settings-card receipt-settings-card" onSubmit={saveSettings}>
          <div className="panel-heading">
            <div>
              <h2>Receipt Text</h2>
              <span>This appears on every printed sale receipt.</span>
            </div>
            <ReceiptText size={20} />
          </div>
          <Field label="Shop Name" value={form.shop_name} onChange={(shop_name) => update("shop_name", shop_name)} />
          <Field label="Welcome Note" value={form.welcome_note} onChange={(welcome_note) => update("welcome_note", welcome_note)} />
          <Field label="Thank You Note" value={form.thank_you_note} onChange={(thank_you_note) => update("thank_you_note", thank_you_note)} />
          <button className="primary-button" type="submit">
            <Save size={18} />
            <span>Save Receipt Text</span>
          </button>
        </form>
      )}
    </div>
  );
}
