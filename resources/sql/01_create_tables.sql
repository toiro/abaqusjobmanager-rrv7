-- JSON-based settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL CHECK (json_valid(value)),
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Execution nodes table
CREATE TABLE IF NOT EXISTS nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  hostname TEXT NOT NULL,
  ssh_username TEXT NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  cpu_cores_limit INTEGER NOT NULL,
  license_token_limit INTEGER NOT NULL,
  status TEXT DEFAULT 'unavailable' CHECK (status IN ('available', 'unavailable')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY (length(id) >= 2),
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files table for uploaded INP files
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER NOT NULL,
  checksum TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'starting', 'running', 'completed', 'failed', 'missing')),
  node_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  cpu_cores INTEGER NOT NULL,
  file_id INTEGER UNIQUE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  start_time DATETIME,
  end_time DATETIME,
  error_message TEXT,
  output_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes (id),
  FOREIGN KEY (file_id) REFERENCES files (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Job execution logs
CREATE TABLE IF NOT EXISTS job_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs (id)
);