-- Test database setup - clean tables without sample data
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert test license configuration
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('license_server_name', 'test-server', 'Test Abaqus license server'),
('total_license_tokens', '10', 'Test total available license tokens');

CREATE TABLE IF NOT EXISTS nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  hostname TEXT NOT NULL,
  ssh_port INTEGER DEFAULT 22,
  max_cpu_cores INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'high_load', 'unavailable', 'maintenance')),
  current_cpu_usage INTEGER DEFAULT 0,
  current_license_usage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT UNIQUE NOT NULL CHECK (length(display_name) >= 2),
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER NOT NULL,
  checksum TEXT,
  uploaded_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'starting', 'running', 'completed', 'failed', 'missing')),
  node_id INTEGER,
  file_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  cpu_cores INTEGER NOT NULL,
  license_tokens INTEGER NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  execution_order INTEGER,
  start_time DATETIME,
  end_time DATETIME,
  error_message TEXT,
  output_file_path TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes (id),
  FOREIGN KEY (file_id) REFERENCES files (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS job_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs (id)
);