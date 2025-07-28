-- Insert default configuration values using JSON-based app_settings table
INSERT OR IGNORE INTO app_settings (key, value) VALUES
('main_settings', '{
  "MAX_UPLOAD_SIZE": 104857600,
  "LICENSE_SERVER": "localhost",
  "AVAILABLE_LICENCE_TOKEN": 50
}');