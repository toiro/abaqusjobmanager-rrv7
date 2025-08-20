/**
 * Dialog System - HTML Dialog Implementation
 * Lightweight, browser-native dialog management for React Router v7
 */

// Export core dialog components and hooks
export { Dialog, type DialogProps } from "./Dialog";
export { FormDialog, type FormDialogProps } from "./FormDialog";
export { useDialog } from "./useDialog";
export { useDialogWithAction } from "./useDialogWithAction";

// Export form dialogs
export { NewJobModal, type NewJobModalProps } from "./new-job-modal";
export { EditJobModal, type EditJobModalProps } from "./edit-job-modal";
export { NewNodeModal, type NewNodeModalProps } from "./new-node-modal";
export { EditNodeModal, type EditNodeModalProps } from "./edit-node-modal";
export { NewUserModal, type NewUserModalProps } from "./new-user-modal";
export { EditUserModal, type EditUserModalProps } from "./edit-user-modal";

// Export confirmation dialogs
export {
	DeleteJobDialog,
	type DeleteJobDialogProps,
} from "./delete-job-dialog";
export {
	CancelJobDialog,
	type CancelJobDialogProps,
} from "./cancel-job-dialog";
export {
	DeleteFileDialog,
	type DeleteFileDialogProps,
} from "./delete-file-dialog";
export {
	DeleteNodeDialog,
	type DeleteNodeDialogProps,
} from "./delete-node-dialog";
export {
	DeleteUserDialog,
	type DeleteUserDialogProps,
} from "./delete-user-dialog";
