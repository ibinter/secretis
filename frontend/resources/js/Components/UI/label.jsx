export const Label = ({ children, className="", htmlFor }) => <label htmlFor={htmlFor} className={"block text-sm font-medium text-gray-700 dark:text-gray-300 " + className}>{children}</label>;
export default Label;
