"use client";

import { useEffect, useRef } from "react";

/**
 * Modal on the native <dialog>: showModal() makes the rest of the page inert (focus stays inside),
 * Escape closes it and the browser returns focus to the element that opened it.
 */
export function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault(); // the parent unmounts us
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // backdrop click
      className="bg-transparent p-0 m-auto backdrop:bg-black/60 w-full max-w-md"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mx-4 shadow-2xl text-slate-100">{children}</div>
    </dialog>
  );
}
