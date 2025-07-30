import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/shared/utils/utils";

const alertVariants = cva(
	"relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground",
				destructive:
					"border-red-200 text-red-800 bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-400 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
				success:
					"border-green-200 text-green-800 bg-green-50 dark:border-green-800 dark:bg-green-950 dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
				warning:
					"border-yellow-200 text-yellow-800 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
				info: "border-blue-200 text-blue-800 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const Alert = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
	<div
		ref={ref}
		role="alert"
		className={cn(alertVariants({ variant }), className)}
		{...props}
	/>
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
	// Only render heading if there's content
	if (!children) {
		return null;
	}

	return (
		<h5
			ref={ref}
			className={cn("mb-1 font-medium leading-none tracking-tight", className)}
			{...props}
		>
			{children}
		</h5>
	);
});
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("text-sm [&_p]:leading-relaxed", className)}
		{...props}
	/>
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
