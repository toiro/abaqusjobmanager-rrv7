import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/helpers/utils";

const labelVariants = cva(
	"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
	HTMLLabelElement,
	React.LabelHTMLAttributes<HTMLLabelElement> &
		VariantProps<typeof labelVariants>
>(({ className, children, htmlFor, ...props }, ref) => {
	// Check if label has proper association
	const hasAssociatedControl =
		htmlFor ||
		(children &&
			React.Children.toArray(children).some(
				(child) =>
					React.isValidElement(child) &&
					(child.type === "input" ||
						child.type === "textarea" ||
						child.type === "select"),
			));

	return (
		<label
			ref={ref}
			className={cn(labelVariants(), className)}
			htmlFor={htmlFor}
			{...props}
			// Add aria-label if no associated control is found for accessibility
			{...(!hasAssociatedControl && { "aria-label": "label" })}
		>
			{children}
		</label>
	);
});
Label.displayName = "Label";

export { Label };
