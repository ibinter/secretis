export function Select({ children, value, onValueChange, defaultValue }) {
  return <div className="relative">{children}</div>;
}
export function SelectTrigger({ children, className="" }) {
  return <div className={"flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer " + className}>{children}</div>;
}
export function SelectValue({ placeholder }) {
  return <span className="text-gray-500">{placeholder}</span>;
}
export function SelectContent({ children }) {
  return <div className="absolute z-50 min-w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">{children}</div>;
}
export function SelectItem({ children, value }) {
  return <div className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer" data-value={value}>{children}</div>;
}
