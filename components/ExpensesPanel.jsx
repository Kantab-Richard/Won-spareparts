"use client";

import { money, today } from "../lib/constants";
import { Field, FormPanel, Table, useForm } from "./ui";

export function ExpensesPanel({ expenses, onSubmit }) {
  const [form, setForm] = useForm({ Date: today, Description: "", Amount: 0 });
  return (
    <div className="split">
      <FormPanel
        title="Record Expense"
        button="Save Expense"
        onSubmit={() => onSubmit(form, () => setForm({ Date: today, Description: "", Amount: 0 }))}
      >
        <Field label="Date" type="date" value={form.Date} onChange={(Date) => setForm({ Date })} />
        <Field label="Description" value={form.Description} onChange={(Description) => setForm({ Description })} />
        <Field label="Amount" type="number" value={form.Amount} onChange={(Amount) => setForm({ Amount })} />
      </FormPanel>
      <section className="panel">
        <div className="panel-heading">
          <h2>Expense Log</h2>
          <span>{money.format(expenses.reduce((sum, item) => sum + Number(item.Amount || 0), 0))}</span>
        </div>
        <Table columns={["Date", "Description", "Amount"]} rows={expenses.slice(-8).reverse().map((expense) => [expense.Date, expense.Description, money.format(Number(expense.Amount || 0))])} />
      </section>
    </div>
  );
}

