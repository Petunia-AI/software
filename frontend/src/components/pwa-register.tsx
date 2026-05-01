"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Cuando hay una nueva versión esperando, activarla sin recargar
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // No recargar automáticamente en iOS — causa pantalla blanca
          // El usuario verá la nueva versión en la siguiente apertura
        });
      });
    }).catch(() => {});
  }, []);
  return null;
}
