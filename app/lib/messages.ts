/**
 * 英語UIメッセージ定数
 * フロントエンドで使用するユーザー向けメッセージ
 */

// ページタイトル・ナビゲーション
export const PAGE_TITLES = {
  HOME: 'Abaqus Job Manager',
  NEW_JOB: 'Create New Job',
  JOB_DETAILS: 'Job Details',
  SETTINGS: 'Settings',
  NODES: 'Node Management'
} as const;

// ボタン・アクション
export const BUTTONS = {
  CREATE_JOB: 'Create Job',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  DELETE: 'Delete',
  REFRESH: 'Refresh',
  NEW_JOB: 'New Job',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Download',
  RETRY: 'Retry'
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
  SETTINGS_SAVED: 'Settings saved successfully'
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