export function Separator({ className="", orientation="horizontal" }) {
  return <div className={"shrink-0 bg-gray-200 dark:bg-gray-700 " + (orientation === "horizontal" ? "h-px w-full my-4" : "w-px h-full mx-4") + " " + className} />;
}
export default Separator;
