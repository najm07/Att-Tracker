import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { attendanceApi } from '@/lib/api';
import type { Employee, AttendanceRecord, AttendanceTableData } from '@/types';
import { Download } from 'lucide-react';

interface AttendanceTableProps {
  groupId: number;
  month: string;
  employees: Employee[];
}

const STATUS_COLORS = {
  P: 'bg-green-100 text-green-800 border-green-200',
  A: 'bg-red-100 text-red-800 border-red-200',
  R: 'bg-orange-100 text-orange-800 border-orange-200',
  C: 'bg-blue-100 text-blue-800 border-blue-200',
};

const STATUS_LABELS = {
  P: 'Present',
  A: 'Absent',
  R: 'Recovery',
  C: 'Conge',
};

export default function AttendanceTable({ groupId, month, employees }: AttendanceTableProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceTableData>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");


  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];


  const loadAttendance = React.useCallback(async () => {
    try {
      const data = await attendanceApi.getByGroup(groupId, month);
      
      // Transform data into table format
      const tableData: AttendanceTableData = {};
      
      employees.forEach(employee => {
        tableData[employee.id] = {
          name: employee.name,
          attendance: {},
        };
      });
      
      data.forEach((record: AttendanceRecord) => {
        if (record.employee_id && record.date) {
          if (!tableData[record.employee_id]) {
            tableData[record.employee_id] = {
              name: record.employee_name || '',
              attendance: {},
            };
          }
          tableData[record.employee_id].attendance[record.date] = {
            status: record.status,
            extra_hours: record.extra_hours,
          };
        }
      });
      
      setAttendanceData(tableData);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, month, employees]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleStatusChange = async (employeeId: number, date: string, status: string) => {
    try {
      const currentExtraHours = attendanceData[employeeId]?.attendance[date]?.extra_hours || 0;
      await attendanceApi.markAttendance(employeeId, date, status, currentExtraHours);
      loadAttendance();
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }
  };

  const handleExtraHoursChange = async (employeeId: number, date: string, extraHours: number) => {
    try {
      const currentStatus = attendanceData[employeeId]?.attendance[date]?.status || 'A';
      await attendanceApi.markAttendance(employeeId, date, currentStatus, extraHours);
      loadAttendance();
    } catch (error) {
      console.error('Failed to update extra hours:', error);
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleExportAttendance = async () => {
    try {
      await attendanceApi.exportToExcel(groupId, month);
    } catch (error) {
      console.error('Failed to export attendance:', error);
    }
  };

  // Generate days of the month
  const year = parseInt(month.split('-')[0]);
  const monthNum = parseInt(month.split('-')[1]);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search employee..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      {/* make the table area scrollable both vertically and horizontally when it grows */}
      <div className="overflow-auto max-h-[60vh]">
        <div className="min-w-max">
          {/* compute explicit grid columns so header and body align */}
          {
            (() => {
              const gridTemplateColumns = `200px ${days.map(() => '120px').join(' ')}`;
              return (
                <div className="min-w-max">
                  {/* Header row (sticky) */}
                  <div
                    style={{ display: 'grid', gridTemplateColumns, gap: '0.25rem', padding: '0.5rem' }}
                    className="bg-muted rounded-t-lg"
                  >
                    <div className="font-semibold p-2 bg-background rounded border left-0 top-0 z-30">
                      Employee
                    </div>
                    {days.map((date) => {
                      const isToday =
                        new Date(date).toDateString() === new Date().toDateString();
                      const isWeekend = 
                        new Date(date).toLocaleDateString('en-us', {'weekday' : 'long'}) === 'Friday';

                    return (
                      <div
                        key={date}
                        className={`p-2 text-center font-bold ${
                          isToday ? "bg-yellow-200 text-black rounded" : ""
                        } ${isWeekend ? "bg-red-200 text-black rounded" : ""}`}
                      >
                        <p>{new Date(date).getDate()}</p>
                        <p>{new Date(date).toLocaleDateString('en-us', {'weekday' : 'long'})}</p>
                      </div>
                    );
                  })}
                  </div>

                  {/* Scrollable body */}
                  <div className="bg-muted" style={{ overflow: 'auto', maxHeight: '55vh' }}>
                    <div style={{ display: 'grid', gridTemplateColumns, gap: '0.25rem', padding: '0.5rem' }}>
                      {filteredEmployees.map(employee => (
                        <React.Fragment key={employee.id}>
                          <div
                            className={`p-2 rounded border font-medium cursor-pointer sticky left-0 z-10 
                              ${selectedEmployeeId === employee.id ? "bg-yellow-100 border-yellow-400" : "bg-card"}`}
                            style={{ background: selectedEmployeeId === employee.id ? "rgb(254 249 195)" : "var(--card)" }}
                            onClick={() =>
                              setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)
                            }>
                            {employee.name}
                          </div>
                          {days.map(date => {
                            const attendanceRecord = attendanceData[employee.id]?.attendance[date];
                            const status = attendanceRecord?.status;
                            const extraHours = attendanceRecord?.extra_hours || 0;

                            return (
                              <div key={`${employee.id}-${date}`}
                                className={`p-1 rounded border ${
                                  date === today ? "bg-yellow-50 border-yellow-400" : "bg-background"
                                } ${selectedEmployeeId === employee.id ? "bg-yellow-50" : ""}`}>
                                <div className="space-y-1">
                                  <Select
                                    value={status || ''}
                                    onValueChange={(value) => handleStatusChange(employee.id, date, value)}
                                  >
                                    <SelectTrigger className={`h-8 text-xs ${status ? STATUS_COLORS[status] : ''}`}>
                                      <SelectValue placeholder="--" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                          {key} - {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {status === 'P' && (
                                    <Input
                                      type="number"
                                      step="0.5"
                                      value={extraHours}
                                      onChange={(e) => handleExtraHoursChange(employee.id, date, parseFloat(e.target.value) || 0)}
                                      placeholder="Extra hrs"
                                      className="h-6 text-xs"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          }
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Present (P)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Absent (A)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Recovery (R)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Conge (C)</span>
          </div>
        </div>
        
        <Button variant="outline" onClick={handleExportAttendance}>
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>
    </div>
  );
}