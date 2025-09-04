const API_BASE = '/api';

// Groups API
export const groupsApi = {
  async getAll() {
    const response = await fetch(`${API_BASE}/groups`);
    if (!response.ok) throw new Error('Failed to fetch groups');
    return response.json();
  },

  async create(name: string) {
    const response = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to create group');
    return response.json();
  },
};

// Employees API
export const employeesApi = {
  async getByGroup(groupId: number) {
    const response = await fetch(`${API_BASE}/groups/${groupId}/employees`);
    if (!response.ok) throw new Error('Failed to fetch employees');
    return response.json();
  },

  async create(groupId: number, name: string) {
    const response = await fetch(`${API_BASE}/groups/${groupId}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to create employee');
    return response.json();
  },

  async importFromExcel(groupId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/groups/${groupId}/employees/import`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to import employees');
    return response.json();
  },
};

// Attendance API
export const attendanceApi = {
  async markAttendance(employeeId: number, date: string, status: string, extraHours: number = 0) {
    const response = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        employee_id: employeeId, 
        date, 
        status, 
        extra_hours: extraHours 
      }),
    });
    if (!response.ok) throw new Error('Failed to mark attendance');
    return response.json();
  },

  async getByGroup(groupId: number, month?: string) {
    const url = new URL(`${API_BASE}/groups/${groupId}/attendance`, window.location.origin);
    if (month) url.searchParams.append('month', month);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return response.json();
  },

  async exportToExcel(groupId: number, month?: string) {
    const url = new URL(`${API_BASE}/groups/${groupId}/attendance/export`, window.location.origin);
    if (month) url.searchParams.append('month', month);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to export attendance');
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `attendance_${month || 'all'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

// Dashboard API
export const dashboardApi = {
  async getStats() {
    const response = await fetch(`${API_BASE}/dashboard/stats`);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  },
};