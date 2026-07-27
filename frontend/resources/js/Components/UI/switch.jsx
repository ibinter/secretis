import { useState } from "react";
export function Switch({ checked, onCheckedChange, id }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onCheckedChange?.(!checked)}
      className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (checked ? "bg-purple-600" : "bg-gray-200")}
    >
      <span className={"inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " + (checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}
export default Switch;
