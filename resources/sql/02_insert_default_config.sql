-- Insert default system configuration values
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('license_server_name', 'localhost', 'Abaqus license server hostname or IP address'),
('total_license_tokens', '50', 'Total available Abaqus license tokens'),
('max_total_license_tokens', '100', 'Maximum total license tokens available in the system'),
('default_job_timeout', '3600', 'Default job timeout in seconds (1 hour)'),
('max_file_size_mb', '100', 'Maximum file upload size in MB'),
('allowed_file_extensions', '.inp', 'Allowed file extensions for upload'),
('system_maintenance_mode', 'false', 'System maintenance mode flag'),
('concurrent_jobs_limit', '10', 'Maximum number of concurrent jobs');