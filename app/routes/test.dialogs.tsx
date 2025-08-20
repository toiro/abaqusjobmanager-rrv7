/**
 * Dialog System Testing Page
 * Native HTML Dialog implementation testing
 */

import type { MetaFunction } from "react-router";
import type { Route } from "./+types/test.dialogs";
import {
	Dialog,
	FormDialog,
	useDialog,
	useDialogWithAction,
} from "~/client/components/dialog";
import { TestLayout } from "~/client/components/layout/TestLayout";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
} from "~/client/components/ui";

export const meta: MetaFunction = () => {
	return [
		{ title: "Dialog System Test - Abaqus Job Manager" },
		{
			name: "description",
			content: "Testing the native HTML dialog implementation",
		},
	];
};

/**
 * Test action function for dialog form submissions
 * Handles form posts without actual processing (test purposes only)
 */
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	// Log the test submission for debugging
	console.log("Test dialog submission:", {
		intent,
		formData: Object.fromEntries(formData.entries()),
	});

	// Return success response to test dialog auto-close behavior
	return {
		success: true,
		intent,
		message: `Test dialog confirmed: ${intent}`,
	};
}

interface TestFormData {
	name?: string;
	email?: string;
	role?: string;
}

const TestFormContent = ({ initialData }: { initialData?: TestFormData }) => {
	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="test-name">Name</Label>
				<Input
					id="test-name"
					name="name"
					defaultValue={initialData?.name || ""}
					placeholder="Enter name"
				/>
			</div>
			<div>
				<Label htmlFor="test-email">Email</Label>
				<Input
					id="test-email"
					name="email"
					type="email"
					defaultValue={initialData?.email || ""}
					placeholder="Enter email"
				/>
			</div>
			<div>
				<Label htmlFor="test-role">Role</Label>
				<Select
					id="test-role"
					name="role"
					defaultValue={initialData?.role || "user"}
				>
					<option value="user">User</option>
					<option value="admin">Admin</option>
					<option value="manager">Manager</option>
				</Select>
			</div>
		</div>
	);
};

export default function TestDialogs() {
	// Dialog hooks
	const simpleDialog = useDialog();
	const formDialog = useDialogWithAction();
	const confirmDialog = useDialog();

	// Test data
	const sampleUser = {
		id: 1,
		name: "John Doe",
		email: "john@example.com",
		role: "user",
	};

	return (
		<TestLayout
			title="Dialog System"
			description="HTML <dialog> element based dialog implementation"
		>
			<div className="space-y-6">
				{/* Action feedback */}
				{formDialog.lastAction && (
					<Card>
						<CardContent className="pt-6">
							<div className="p-3 bg-green-50 rounded-lg">
								<p className="text-sm font-medium text-green-800">
									<strong>Form Dialog:</strong> {formDialog.lastAction}
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Dialog Test Buttons */}
				<Card>
					<CardHeader>
						<CardTitle>🔬 Dialog Tests</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Button onClick={simpleDialog.openDialog} className="w-full">
								Simple Dialog
							</Button>
							<Button onClick={formDialog.openDialog} className="w-full">
								Form Dialog
							</Button>
							<Button
								onClick={confirmDialog.openDialog}
								variant="destructive"
								className="w-full"
							>
								Confirm Dialog
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Feature Information */}
				<Card>
					<CardHeader>
						<CardTitle>✨ Dialog Features</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h4 className="font-semibold text-green-700 mb-2">
									Browser Native Features
								</h4>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li>Automatic focus management</li>
									<li>Built-in ESC key handling</li>
									<li>Native backdrop behavior</li>
									<li>Screen reader support</li>
									<li>Mobile-friendly interaction</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-blue-700 mb-2">
									Implementation Benefits
								</h4>
								<ul className="list-disc list-inside space-y-1 text-sm">
									<li>No Context Provider required</li>
									<li>Lightweight hook-based API</li>
									<li>State reset on dialog open</li>
									<li>React Router integration</li>
									<li>TypeScript fully supported</li>
								</ul>
							</div>
						</div>

						<div className="mt-6 p-4 bg-gray-50 rounded-lg">
							<h4 className="font-semibold mb-2">Testing Instructions:</h4>
							<ol className="list-decimal list-inside space-y-1 text-sm">
								<li>Click any dialog button to open</li>
								<li>Try ESC key to close</li>
								<li>Click backdrop to close</li>
								<li>For form dialog: fill form and submit</li>
								<li>Reopen dialog to verify state reset</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Dialog Instances */}
			<Dialog
				isOpen={simpleDialog.isOpen}
				title="Simple Dialog"
				onClose={simpleDialog.closeDialog}
				resetKey={simpleDialog.resetKey}
			>
				<div className="space-y-4">
					<p>This is a simple dialog using HTML &lt;dialog&gt; element.</p>
					<div className="p-3 bg-gray-50 rounded-lg text-sm">
						<strong>Try these interactions:</strong>
						<ul className="list-disc list-inside mt-2 space-y-1">
							<li>Press ESC to close</li>
							<li>Click outside (backdrop) to close</li>
							<li>Tab through focusable elements</li>
							<li>Use screen reader if available</li>
						</ul>
					</div>
					<div className="flex justify-end">
						<Button onClick={simpleDialog.closeDialog}>Close</Button>
					</div>
				</div>
			</Dialog>

			<FormDialog
				isOpen={formDialog.isOpen}
				title="Form Test Dialog"
				onClose={formDialog.closeDialog}
				intent="test-form-submit"
				submitText="Submit Form"
				resetKey={formDialog.resetKey}
			>
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Fill out the form and submit to test auto-close behavior.
					</p>
					<TestFormContent initialData={sampleUser} />
				</div>
			</FormDialog>

			<Dialog
				isOpen={confirmDialog.isOpen}
				title="Confirmation Dialog"
				onClose={confirmDialog.closeDialog}
				resetKey={confirmDialog.resetKey}
			>
				<div className="space-y-4">
					<p>Are you sure you want to proceed with this action?</p>
					<div className="p-3 bg-yellow-50 rounded-lg text-sm">
						<strong>Note:</strong> This is a destructive action and cannot be
						undone.
					</div>
					<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
						<Button
							variant="outline"
							onClick={confirmDialog.closeDialog}
							className="mt-3 sm:mt-0"
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								console.log("Confirmation action confirmed!");
								confirmDialog.closeDialog();
							}}
						>
							Confirm
						</Button>
					</div>
				</div>
			</Dialog>
		</TestLayout>
	);
}
