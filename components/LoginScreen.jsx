"use client";

import Image from "next/image";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { Field, useForm } from "./ui";

export function LoginScreen({ onLogin }) {
  const [form, setForm] = useForm({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setLoggingIn(true);
    try {
      await onLogin(form);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark login-brand">
          <Image src="/wonspareparts-banner.png" alt="WONSPAREPARTS" width={2172} height={724} priority />
        </div>
        <div>
          <p className="eyebrow">Secure Access</p>
          <h1>WONSPAREPARTS Manager</h1>
        </div>
        <form className="login-form" onSubmit={submitLogin}>
          <Field label="Username" value={form.username} onChange={(username) => setForm({ username })} />
          <Field label="Password" type="password" value={form.password} onChange={(password) => setForm({ password })} />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loggingIn}>
            <UserRound size={18} />
            <span>{loggingIn ? "Checking..." : "Log In"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}

