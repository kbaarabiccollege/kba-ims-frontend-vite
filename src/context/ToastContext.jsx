// src/context/ToastContext.jsx
//
// App-wide toast notifications. Wrap the app once (in main.jsx or App.jsx)
// with <ToastProvider>, then anywhere in the tree call:
//
//   const toast = useToast();
//   toast.success("User created successfully");
//   toast.error("User creation failed");
//
// Pair this with src/utils/toastMessages.js if you want consistent
// "X created successfully" / "X creation failed" wording across modules
// instead of writing the string by hand every time.

import { createContext, useCallback, useContext, useRef, useState } from "react";
import ToastContainer from "../components/common/ToastContainer";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4000; // ms
let idCounter = 0;

export const ToastProvider = ({ children, position = "top-right" }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, { type = "info", duration = DEFAULT_DURATION } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration !== Infinity) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [removeToast]
  );

  // Convenience shorthands so call-sites read naturally: toast.success(...), toast.error(...)
  const success = useCallback((message, opts) => showToast(message, { ...opts, type: "success" }), [showToast]);
  const error = useCallback((message, opts) => showToast(message, { ...opts, type: "error" }), [showToast]);
  const info = useCallback((message, opts) => showToast(message, { ...opts, type: "info" }), [showToast]);
  const warning = useCallback((message, opts) => showToast(message, { ...opts, type: "warning" }), [showToast]);

  const value = { showToast, success, error, info, warning, dismiss: removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used inside a <ToastProvider>. Wrap your app in main.jsx or App.jsx.");
  }
  return ctx;
};

export default ToastContext;