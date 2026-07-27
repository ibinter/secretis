export function Textarea({ className="", ...props }) {
  return <textarea className={"w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 " + className} {...props} />;
}
export default Textarea;
