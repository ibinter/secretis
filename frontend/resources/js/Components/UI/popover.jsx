import { useState } from "react";
export function Popover({ children }) { return <div className="relative">{children}</div>; }
export function PopoverTrigger({ children, asChild }) { return <>{children}</>; }
export function PopoverContent({ children, className="" }) {
  return <div className={"absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 " + className}>{children}</div>;
}
