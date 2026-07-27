import { useState } from "react";
export function Tabs({ children, defaultValue, value, onValueChange }) {
  return <div data-value={value || defaultValue}>{children}</div>;
}
export function TabsList({ children, className="" }) {
  return <div className={"flex border-b border-gray-200 " + className}>{children}</div>;
}
export function TabsTrigger({ children, value, className="" }) {
  return <button className={"px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-purple-500 " + className}>{children}</button>;
}
export function TabsContent({ children, value, className="" }) {
  return <div className={"mt-4 " + className}>{children}</div>;
}
