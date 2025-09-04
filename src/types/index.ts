export interface Group {
  id: number;
  name: string;
  // optional employee count provided by the server
  employee_count?: number;
  created_at?: string;
}

export interface Employee {
  id: number;
  name: string;
  group_id: number;
  created_at?: string;
}

export interface AttendanceRecord {
  id?: number;
  employee_id: number;
  employee_name?: string;
  date: string;
  status: 'P' | 'A' | 'R' | 'C'; // Present, Absent, Recovery, Conge
  extra_hours: number;
  created_at?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  totalGroups: number;
  presentToday: number;
  absentToday: number;
  attendanceStats: Array<{
    status: string;
    count: number;
  }>;
}

export interface AttendanceTableData {
  [employeeId: string]: {
    name: string;
    attendance: {
      [date: string]: {
        status: 'P' | 'A' | 'R' | 'C';
        extra_hours: number;
      };
    };
  };
}