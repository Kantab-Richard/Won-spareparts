"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    const canRegister =
      window.location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(window.location.hostname);

    if ("serviceWorker" in navigator && canRegister) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
