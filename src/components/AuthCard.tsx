export const AuthCard = ({ title, children }: { readonly title: string; readonly children: React.ReactNode }) => (
  <div className="flex flex-1 items-center justify-center">
    <div className="w-full max-w-sm mx-auto space-y-5 px-4">
      <h1 className="text-2xl font-bold text-center">{title}</h1>
      {children}
    </div>
  </div>
);
