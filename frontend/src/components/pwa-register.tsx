"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Si ya hay un SW activo, cualquier cambio de controlador = nueva versión → recargar
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) {
        window.location.reload();
      }
    });

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
