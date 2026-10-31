const STYLE = {
  error: "bg-red-900/40 border-red-700 text-red-300",
  ok: "bg-green-900/40 border-green-700 text-green-300",
} as const;

export const Notice = ({ kind, children }: { readonly kind: keyof typeof STYLE; readonly children: React.ReactNode }) => (
  <div role={kind === "error" ? "alert" : "status"} className={`border text-sm p-3 rounded-lg ${STYLE[kind]}`}>
    {children}
  </div>
);
