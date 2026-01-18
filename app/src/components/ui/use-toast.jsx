"use client";

import * as React from "react";
import { Toast, ToastViewport } from "./toast";

export function useToast() {
  const [toasts, setToasts] = React.useState([]);

  function toast({ title, description }) {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  return { toast, toasts };
}

export function ToastProvider({ children, toasts }) {
  return (
    <>
      {children}
      <ToastViewport>
        {toasts.map((t) => (
          <Toast key={t.id} title={t.title} description={t.description} />
        ))}
      </ToastViewport>
    </>
  );
}
