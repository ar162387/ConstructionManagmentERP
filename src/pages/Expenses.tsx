import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Search, Filter, Receipt, Calendar, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import { mockTransactions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ExpenseDialog } from '@/components/modals/ExpenseDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { toast } from '@/hooks/use-toast';

export default function Expenses() {
  const { isAuthenticated } = useAuth();
  const { selectedProjectId, availableProjects } = useProject();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const allExpenses = mockTransactions.filter((t) => t.type === 'outflow');
  const expenses =
    selectedProjectId != null
      ? allExpenses.filter((e) => e.projectId === selectedProjectId)
      : allExpenses;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categorySummary = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleAddExpense = () => {
    setExpenseDialogOpen(true);
  };

  const handleSaveExpense = () => {
    toast({
      title: 'Expense Recorded',
      description: 'The expense has been recorded successfully.',
    });
  };

  const handleDeleteExpense = () => {
    toast({
      title: 'Expense Deleted',
      description: 'The expense has been deleted successfully.',
    });
    setDeleteDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
            <p className="text-muted-foreground">
              Track and manage project expenses and company costs
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          {Object.entries(categorySummary).map(([category, amount]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search expenses..." className="pl-9" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Projects</SelectItem>
              {availableProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-fit gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Expenses</CardTitle>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const project = availableProjects.find((p) => p.id === expense.projectId);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {format(expense.date, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {project ? (
                          <Badge variant="secondary">{project.name.split(' ')[0]}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Company</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {expense.paymentMode.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -{formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteDialogOpen(true)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSave={handleSaveExpense}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDeleteExpense}
      />
    </AppLayout>
  );
}
