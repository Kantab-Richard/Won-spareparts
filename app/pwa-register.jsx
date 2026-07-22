"use client";

import { useEffect, useState } from "react";

const INSTALL_PROMPT_TIMEOUT = 180000;

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canRegister =
      window.location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);

    if ("serviceWorker" in navigator && canRegister) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
      setVisible(true);
    }

    function handleInstalled() {
      setVisible(false);
      setInstallPrompt(null);
      window.localStorage.setItem("wonspareparts-pwa-installed", "true");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const timeout = window.setTimeout(() => setVisible(false), INSTALL_PROMPT_TIMEOUT);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setVisible(false);
    setInstallPrompt(null);
  }

  if (!visible || !installPrompt) {
    return null;
  }

  return (
    <div className="install-prompt" role="status">
      <div>
        <strong>Install WONSPAREPARTS</strong>
        <span>Add the app to this device for quicker access.</span>
      </div>
      <button className="primary-button compact-button" type="button" onClick={installApp}>
        Install
      </button>
      <button className="install-dismiss" type="button" onClick={() => setVisible(false)} title="Dismiss install prompt">
        Later
      </button>
    </div>
  );
}
