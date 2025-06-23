/**
 * English message constants for the Abaqus Job Manager
 * Centralized message management for consistent UI text
 */

// System Messages
export const SYSTEM_MESSAGES = {
  // General
  LOADING: "Loading...",
  SAVING: "Saving...",
  SAVED: "Saved successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  CANCELLED: "Cancelled",
  CONFIRM: "Confirm",
  YES: "Yes",
  NO: "No",
  OK: "OK",
  CANCEL: "Cancel",
  CLOSE: "Close",
  EDIT: "Edit",
  DELETE: "Delete",
  CREATE: "Create",
  ADD: "Add",
  UPDATE: "Update",
  SAVE: "Save",
  RESET: "Reset",
  REFRESH: "Refresh",
  
  // Status
  SUCCESS: "Success",
  ERROR: "Error",
  WARNING: "Warning",
  INFO: "Information",
  
  // Navigation
  DASHBOARD: "Dashboard",
  JOBS: "Jobs",
  NODES: "Nodes",
  FILES: "Files",
  USERS: "Users",
  SETTINGS: "Settings",
  ADMIN: "Administration",
  USER: "User",
} as const;

// Page Titles
export const PAGE_TITLES = {
  HOME: 'Abaqus Job Manager',
  DASHBOARD: 'Dashboard',
  NEW_JOB: 'Create New Job',
  JOB_DETAILS: 'Job Details',
  JOBS: 'Job Management',
  SETTINGS: 'Settings',
  NODES: 'Node Management',
  FILES: 'File Management',
  USERS: 'User Management',
  ADMIN: 'Administration'
} as const;

// Buttons & Actions
export const BUTTONS = {
  CREATE_JOB: 'Create Job',
  SUBMIT_JOB: 'Submit Job',
  CANCEL_JOB: 'Cancel Job',
  DELETE_JOB: 'Delete Job',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  DELETE: 'Delete',
  REFRESH: 'Refresh',
  NEW_JOB: 'New Job',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Download',
  RETRY: 'Retry',
  VIEW_DETAILS: 'View Details',
  EDIT: 'Edit',
  ADD: 'Add',
  REMOVE: 'Remove',
  ACTIVATE: 'Activate',
  DEACTIVATE: 'Deactivate',
  TEST_CONNECTION: 'Test Connection',
  RESET: 'Reset'
} as const;

// フォームラベル
export const FORM_LABELS = {
  JOB_NAME: 'Job Name',
  EXECUTION_NODE: 'Execution Node',
  CPU_CORES: 'CPU Cores',
  PRIORITY: 'Priority',
  INP_FILE: 'INP File',
  STATUS: 'Status',
  MESSAGE: 'Message',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Last Updated'
} as const;

// ステータス表示
export const JOB_STATUS = {
  WAITING: 'Waiting',
  STARTING: 'Starting',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  MISSING: 'Missing'
} as const;

// ノードステータス
export const NODE_STATUS = {
  AVAILABLE: 'Available',
  HIGH_LOAD: 'High Load',
  UNAVAILABLE: 'Unavailable',
  MAINTENANCE: 'Under Maintenance'
} as const;

// CPU選択オプション
export const CPU_OPTIONS = {
  LIGHT: 'Light analysis',
  MEDIUM: 'Medium analysis',
  HEAVY: 'Heavy analysis'
} as const;

// エラーメッセージ
export const ERROR_MESSAGES = {
  // ファイル関連
  FILE_SIZE_EXCEEDED: 'File size exceeds the maximum limit of 100MB',
  INVALID_FILE_TYPE: 'Only .inp files are allowed',
  FILE_REQUIRED: 'Please select a valid INP file',
  UPLOAD_FAILED: 'File upload failed. Please try again',

  // リソース不足
  INSUFFICIENT_CPU: 'Insufficient CPU cores available on selected node',
  INSUFFICIENT_NODE_LICENSE: 'Not enough license tokens available on selected node',
  INSUFFICIENT_SYSTEM_LICENSE: 'System license limit exceeded. Please try again later',
  
  // フォーム検証
  JOB_NAME_REQUIRED: 'Job name is required',
  JOB_NAME_INVALID: 'Job name must be alphanumeric and 3-50 characters',
  NODE_REQUIRED: 'Please select an execution node',
  CPU_REQUIRED: 'Please select CPU cores',
  
  // システムエラー
  NODE_UNAVAILABLE: 'Selected node is no longer available',
  NODE_MAINTENANCE: 'Node is under maintenance. Please select another node',
  CONNECTION_FAILED: 'Failed to connect to execution node',
  EXECUTION_FAILED: 'Abaqus execution error occurred',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again'
} as const;

// 成功メッセージ
export const SUCCESS_MESSAGES = {
  JOB_CREATED: 'Job created successfully',
  JOB_DELETED: 'Job deleted successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  NODE_UPDATED: 'Node updated successfully',
  USER_UPDATED: 'User updated successfully'
} as const;

// 情報メッセージ
export const INFO_MESSAGES = {
  NO_JOBS: 'No jobs found',
  LOADING: 'Loading...',
  DRAG_DROP_FILE: 'Drag & drop or click to select INP file',
  LICENSE_CALCULATED: 'License tokens calculated automatically',
  RESOURCE_CHECK: 'Checking resource availability...'
} as const;

// テーブルヘッダー
export const TABLE_HEADERS = {
  ID: 'ID',
  JOB_NAME: 'Job Name',
  STATUS: 'Status',
  NODE: 'Node',
  CPU: 'CPU',
  LICENSE: 'License',
  USER: 'User',
  CREATED: 'Created',
  ACTIONS: 'Actions'
} as const;

// リソース表示
export const RESOURCE_LABELS = {
  CPU_CORES: 'cores',
  LICENSE_TOKENS: 'tokens',
  AVAILABLE: 'available',
  USED: 'used',
  TOTAL: 'total',
  SYSTEM_USAGE: 'System License Usage'
} as const;

// 優先度レベル
export const PRIORITY_LEVELS = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent'
} as const;

// Node Related Messages
export const NODE_MESSAGES = {
  // Actions
  ADD_NODE: "Add Node",
  EDIT_NODE: "Edit Node",
  DELETE_NODE: "Delete Node",
  ACTIVATE_NODE: "Activate Node",
  DEACTIVATE_NODE: "Deactivate Node",
  TEST_CONNECTION: "Test Connection",
  
  // Fields
  NODE_NAME: "Node Name",
  HOSTNAME: "Hostname",
  SSH_PORT: "SSH Port",
  MAX_CPU_CORES: "Max CPU Cores",
  CURRENT_CPU_USAGE: "Current CPU Usage",
  CURRENT_LICENSE_USAGE: "Current License Usage",
  IS_ACTIVE: "Active",
  
  // Validation
  NAME_REQUIRED: "Node name is required",
  HOSTNAME_REQUIRED: "Hostname is required",
  HOSTNAME_INVALID: "Invalid hostname format",
  SSH_PORT_INVALID: "SSH port must be between 1 and 65535",
  MAX_CPU_CORES_REQUIRED: "Max CPU cores must be specified",
  MAX_CPU_CORES_MIN: "At least 1 CPU core is required",
  
  // Messages
  NODE_ADDED: "Node added successfully",
  NODE_UPDATED: "Node updated successfully",
  NODE_DELETED: "Node deleted successfully",
  NODE_ACTIVATED: "Node activated",
  NODE_DEACTIVATED: "Node deactivated",
  CONNECTION_SUCCESS: "Connection test successful",
  CONNECTION_FAILED: "Connection test failed",
} as const;

// File Related Messages
export const FILE_MESSAGES = {
  // Actions
  UPLOAD_FILE: "Upload File",
  DOWNLOAD_FILE: "Download File",
  DELETE_FILE: "Delete File",
  SELECT_FILE: "Select File",
  DRAG_DROP: "Drag & drop files here, or click to select",
  
  // Fields
  ORIGINAL_NAME: "Original Name",
  FILE_SIZE: "File Size",
  UPLOAD_DATE: "Upload Date",
  UPLOADED_BY: "Uploaded By",
  
  // Validation
  FILE_REQUIRED: "Please select a file",
  FILE_TYPE_INVALID: "Only .inp files are allowed",
  FILE_SIZE_EXCEEDED: "File size exceeds maximum limit",
  FILE_SIZE_EMPTY: "File cannot be empty",
  
  // Messages
  FILE_UPLOADED: "File uploaded successfully",
  FILE_DELETED: "File deleted successfully",
  UPLOAD_IN_PROGRESS: "Uploading...",
  UPLOAD_FAILED: "Upload failed",
  
  // File size formats
  BYTES: "bytes",
  KB: "KB",
  MB: "MB",
  GB: "GB",
} as const;

// User Related Messages
export const USER_MESSAGES = {
  // Actions
  ADD_USER: "Add User",
  EDIT_USER: "Edit User",
  DELETE_USER: "Delete User",
  ACTIVATE_USER: "Activate User",
  DEACTIVATE_USER: "Deactivate User",
  
  // Fields
  DISPLAY_NAME: "Display Name",
  MAX_CONCURRENT_JOBS: "Max Concurrent Jobs",
  CURRENT_JOBS: "Current Jobs",
  IS_ACTIVE: "Active",
  
  // Validation
  DISPLAY_NAME_REQUIRED: "Display name is required",
  DISPLAY_NAME_TOO_SHORT: "Display name must be at least 2 characters",
  DISPLAY_NAME_INVALID: "Display name can only contain alphanumeric characters, underscores, and hyphens",
  MAX_CONCURRENT_JOBS_REQUIRED: "Max concurrent jobs must be specified",
  MAX_CONCURRENT_JOBS_MIN: "At least 1 concurrent job must be allowed",
  
  // Messages
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  MAX_JOBS_REACHED: "Maximum concurrent jobs reached",
} as const;

// Confirmation Messages
export const CONFIRMATION_MESSAGES = {
  DELETE_JOB: "Are you sure you want to delete this job?",
  CANCEL_JOB: "Are you sure you want to cancel this job?",
  DELETE_NODE: "Are you sure you want to delete this node?",
  DELETE_FILE: "Are you sure you want to delete this file?",
  DELETE_USER: "Are you sure you want to delete this user?",
  DEACTIVATE_USER: "Are you sure you want to deactivate this user?",
  RESET_SETTINGS: "Are you sure you want to reset all settings?",
  UNSAVED_CHANGES: "You have unsaved changes. Are you sure you want to leave?",
} as const;

// Time Formats
export const TIME_FORMATS = {
  SECONDS: "seconds",
  MINUTES: "minutes",
  HOURS: "hours",
  DAYS: "days",
  AGO: "ago",
  JUST_NOW: "just now",
} as const;

// Placeholders
export const PLACEHOLDERS = {
  SELECT_USER: "Select user",
  SELECT_NODE: "Select node", 
  SELECT_FILE: "Select file",
  ENTER_JOB_NAME: "Enter job name",
  ENTER_HOSTNAME: "Enter hostname",
  ENTER_NODE_NAME: "Enter node name",
  ENTER_DISPLAY_NAME: "Enter display name",
} as const;

// Export all message categories
export const MESSAGES = {
  SYSTEM: SYSTEM_MESSAGES,
  PAGE: PAGE_TITLES,
  BUTTON: BUTTONS,
  JOB: {
    STATUS: JOB_STATUS,
    ERROR: ERROR_MESSAGES,
    SUCCESS: SUCCESS_MESSAGES,
    INFO: INFO_MESSAGES,
  },
  NODE: {
    STATUS: NODE_STATUS,
    MESSAGE: NODE_MESSAGES,
  },
  FILE: FILE_MESSAGES,
  USER: USER_MESSAGES,
  FORM: FORM_LABELS,
  TABLE: TABLE_HEADERS,
  RESOURCE: RESOURCE_LABELS,
  PRIORITY: PRIORITY_LEVELS,
  CONFIRMATION: CONFIRMATION_MESSAGES,
  TIME: TIME_FORMATS,
  CPU: CPU_OPTIONS,
} as const;

export default MESSAGES;