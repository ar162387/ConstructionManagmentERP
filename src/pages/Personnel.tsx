import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Filter, Users, DollarSign, Phone, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import { mockEmployees } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { EmployeeDialog } from '@/components/modals/EmployeeDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { Employee } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function Personnel() {
  const { isAuthenticated } = useAuth();
  const { selectedProjectId } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const filteredEmployees =
    selectedProjectId != null
      ? mockEmployees.filter((e) => e.projectId === selectedProjectId)
      : mockEmployees;

  const formatPayRate = (employee: typeof mockEmployees[0]) => {
    const rate = new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(employee.payRate);

    const suffix = {
      monthly: '/mo',
      weekly: '/wk',
      daily: '/day',
      hourly: '/hr',
    };

    return `${rate}${suffix[employee.payType]}`;
  };

  const totalPayroll = filteredEmployees.reduce((sum, emp) => {
    // Normalize to monthly for estimation
    const monthly = {
      monthly: emp.payRate,
      weekly: emp.payRate * 4,
      daily: emp.payRate * 22,
      hourly: emp.payRate * 8 * 22,
    };
    return sum + monthly[emp.payType];
  }, 0);

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = (data: Partial<Employee>) => {
    toast({
      title: selectedEmployee ? 'Employee Updated' : 'Employee Added',
      description: `${data.name} has been ${selectedEmployee ? 'updated' : 'added'} successfully.`,
    });
  };

  const handleDeleteEmployee = () => {
    toast({
      title: 'Employee Removed',
      description: 'The employee has been removed successfully.',
    });
    setDeleteDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Personnel Management</h1>
            <p className="text-muted-foreground">
              Manage workforce, salaries, and asset assignments
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Process Payroll
            </Button>
            <Button className="gap-2" onClick={handleAddEmployee}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEmployees.length}</div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Payroll
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rs {(totalPayroll / 100000).toFixed(1)}L
              </div>
              <p className="text-xs text-muted-foreground">Estimated monthly cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">Rs 250,000</div>
              <p className="text-xs text-muted-foreground">Due this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search employees..." className="pl-9" />
          </div>
          <Button variant="outline" className="w-fit gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {employee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.role}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatPayRate(employee)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </div>
                    </TableCell>
                    <TableCell>{format(employee.joiningDate, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {employee.assets.slice(0, 2).map((asset) => (
                          <Badge key={asset} variant="secondary" className="text-xs">
                            {asset}
                          </Badge>
                        ))}
                        {employee.assets.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{employee.assets.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Process Payment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <EmployeeDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Employee"
        description="Are you sure you want to remove this employee? This action cannot be undone."
        onConfirm={handleDeleteEmployee}
      />
    </AppLayout>
  );
}
