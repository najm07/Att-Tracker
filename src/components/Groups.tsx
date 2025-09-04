import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Download, Users } from 'lucide-react';
import { groupsApi, employeesApi, attendanceApi } from '@/lib/api';
import AttendanceTable from './AttendanceTable';
import type { Group, Employee } from '@/types';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Map of employeeId -> { presentCount, extraHours }
  const [attendanceSummary, setAttendanceSummary] = useState<Record<number, { presentCount: number; recoveryCount: number; congeCount: number; extraHours: number }>>({});

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadEmployees(selectedGroup.id);
    }
  }, [selectedGroup]);

  useEffect(() => {
    // Load attendance summary whenever selected group or month changes
    const loadSummary = async () => {
      if (!selectedGroup) {
        setAttendanceSummary({});
        return;
      }

      try {
        const rows = await attendanceApi.getByGroup(selectedGroup.id, selectedMonth);
        // rows: { employee_id, employee_name, date, status, extra_hours }
        const map: Record<number, { presentCount: number; recoveryCount: number; congeCount: number; extraHours: number }> = {};
        for (const r of rows) {
          const id = r.employee_id;
          if (!map[id]) map[id] = { presentCount: 0, recoveryCount: 0, congeCount: 0, extraHours: 0 };
          if (r.status === 'P') map[id].presentCount += 1;
          if (r.status === 'R') map[id].recoveryCount += 1;
          if (r.status === 'C') map[id].congeCount += 1;
          map[id].extraHours += Number(r.extra_hours || 0);
        }
        setAttendanceSummary(map);
      } catch (err) {
        console.error('Failed to load attendance summary:', err);
        setAttendanceSummary({});
      }
    };

    loadSummary();
  }, [selectedGroup, selectedMonth]);

  const loadGroups = async () => {
    try {
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (groupId: number) => {
    try {
      const data = await employeesApi.getByGroup(groupId);
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      await groupsApi.create(newGroupName);
      setNewGroupName('');
      loadGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeName.trim() || !selectedGroup) return;
    
    try {
      await employeesApi.create(selectedGroup.id, newEmployeeName);
      setNewEmployeeName('');
      loadEmployees(selectedGroup.id);
    } catch (error) {
      console.error('Failed to create employee:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGroup) return;
    
    try {
      await employeesApi.importFromExcel(selectedGroup.id, file);
      loadEmployees(selectedGroup.id);
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Failed to import employees:', error);
    }
  };

  const handleExportAttendance = async () => {
    if (!selectedGroup) return;
    
    try {
      await attendanceApi.exportToExcel(selectedGroup.id, selectedMonth);
    } catch (error) {
      console.error('Failed to export attendance:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Manage your organization's groups and employees
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <Button onClick={handleCreateGroup} className="w-full">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card 
            key={group.id} 
            className={`cursor-pointer hover:shadow-lg transition-all ${
              selectedGroup?.id === group.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedGroup(group)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {group.name}
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {typeof group.employee_count === 'number' ? (
                    group.employee_count
                  ) : selectedGroup?.id === group.id ? (
                    employees.filter(emp => emp.group_id === group.id).length
                  ) : (
                    '—'
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to view employees and attendance
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedGroup && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{selectedGroup.name} - Employees</CardTitle>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Employee to {selectedGroup.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="employeeName">Employee Name</Label>
                          <Input
                            id="employeeName"
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            placeholder="Enter employee name"
                          />
                        </div>
                        <Button onClick={handleCreateEmployee} className="w-full">
                          Add Employee
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Excel
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map((employee) => {
                  const summary = attendanceSummary[employee.id] || { presentCount: 0, recoveryCount: 0, congeCount: 0, extraHours: 0 };
                  return (
                    <div
                      key={employee.id}
                      className="p-3 border rounded-lg bg-card hover:bg-accent transition-colors"
                    >
                      <p className="font-bold">{employee.name}</p>
                      <p className="text-sm text-green-500">Present: {summary.presentCount}</p>
                      <p className="text-sm text-orange-500">Recovery: {summary.recoveryCount}</p>
                      <p className="text-sm text-blue-500">Conge: {summary.congeCount}</p>
                      <p className="text-sm text-yellow-500">Extra hours: {summary.extraHours}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Attendance for {selectedMonth}</CardTitle>
                <div className="flex gap-2 items-center">
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-40"
                  />
                  <Button variant="outline" size="sm" onClick={handleExportAttendance}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AttendanceTable 
                groupId={selectedGroup.id} 
                month={selectedMonth}
                employees={employees}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}