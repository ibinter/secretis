export function Command({ children, className="" }) { return <div className={"bg-white rounded-lg " + className}>{children}</div>; }
export function CommandInput({ placeholder, ...props }) { return <input placeholder={placeholder} className="w-full px-3 py-2 text-sm border-b border-gray-200 outline-none" {...props} />; }
export function CommandList({ children }) { return <div className="max-h-60 overflow-auto">{children}</div>; }
export function CommandEmpty({ children }) { return <div className="px-3 py-4 text-sm text-gray-500 text-center">{children}</div>; }
export function CommandGroup({ children, heading }) { return <div><div className="px-2 py-1 text-xs font-semibold text-gray-500">{heading}</div>{children}</div>; }
export function CommandItem({ children, onSelect, value }) { return <div className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer rounded" onClick={() => onSelect?.(value)}>{children}</div>; }
