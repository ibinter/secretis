export function Dialog({ children, open, onOpenChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50 bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">{children}</div>
    </div>
  );
}
export function DialogContent({ children, className="" }) { return <div className={"p-6 " + className}>{children}</div>; }
export function DialogHeader({ children }) { return <div className="mb-4">{children}</div>; }
export function DialogTitle({ children }) { return <h2 className="text-lg font-semibold">{children}</h2>; }
export function DialogDescription({ children }) { return <p className="text-sm text-gray-500 mt-1">{children}</p>; }
export function DialogFooter({ children }) { return <div className="mt-4 flex justify-end gap-2">{children}</div>; }
export function DialogTrigger({ children, asChild }) { return <>{children}</>; }
