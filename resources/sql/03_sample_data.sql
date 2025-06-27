-- Sample users for testing
INSERT OR IGNORE INTO users (display_name, max_concurrent_jobs, is_active) VALUES
('admin', 10, 1),
('user1', 3, 1),
('user2', 5, 1),
('guest', 1, 1);

-- Sample nodes for testing
INSERT OR IGNORE INTO nodes (name, hostname, max_cpu_cores, is_active) VALUES
('node-01', 'abaqus-node-01.local', 8, 1),
('node-02', 'abaqus-node-02.local', 16, 1),
('node-03', 'abaqus-node-03.local', 4, 1);