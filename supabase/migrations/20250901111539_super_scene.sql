-- HR Attendance Tracker Database Schema

CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('P', 'A', 'R', 'C')),
    extra_hours REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
);

-- Insert sample data
INSERT OR IGNORE INTO groups (name) VALUES 
    ('Engineering'),
    ('Marketing'),
    ('Sales');

INSERT OR IGNORE INTO employees (name, group_id) VALUES 
    ('John Doe', 1),
    ('Jane Smith', 1),
    ('Mike Johnson', 2),
    ('Sarah Wilson', 2),
    ('David Brown', 3);