import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Building, CreditCard, ArrowUpRight, ArrowDownLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCanEdit, useCanDelete } from '@/contexts/ProjectContext';
import { mockBankAccounts, mockTransactions } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BankAccountDialog } from '@/components/modals/BankAccountDialog';
import { TransactionDialog } from '@/components/modals/TransactionDialog';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { BankAccount } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function BankAccounts() {
  const { isAuthenticated } = useAuth();
  const canEdit = useCanEdit();
  const canDelete = useCanDelete();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'inflow' | 'outflow'>('inflow');
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
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

  const totalBalance = mockBankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'business':
        return <Building className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setAccountDialogOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setAccountDialogOpen(true);
  };

  const handleRecordInflow = () => {
    setTransactionType('inflow');
    setTransactionDialogOpen(true);
  };

  const handleRecordOutflow = () => {
    setTransactionType('outflow');
    setTransactionDialogOpen(true);
  };

  const handleSaveAccount = (data: Partial<BankAccount>) => {
    toast({
      title: selectedAccount ? 'Account Updated' : 'Account Added',
      description: `${data.name} has been ${selectedAccount ? 'updated' : 'added'} successfully.`,
    });
  };

  const handleSaveTransaction = () => {
    toast({
      title: 'Transaction Recorded',
      description: 'The transaction has been recorded successfully.',
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: 'Account Deleted',
      description: 'The account has been deleted successfully.',
    });
    setDeleteDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bank & Accounts</h1>
            <p className="text-muted-foreground">
              Manage your company bank accounts and track transactions
            </p>
          </div>
          <Button className="w-fit" onClick={handleAddAccount}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Total Balance Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Balance (All Accounts)
                </p>
                <h2 className="text-4xl font-bold mt-2">{formatCurrency(totalBalance)}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Across {mockBankAccounts.length} accounts
                </p>
              </div>
              <div className="hidden md:flex gap-4">
                <Button variant="outline" className="gap-2" onClick={handleRecordInflow}>
                  <ArrowDownLeft className="h-4 w-4" />
                  Record Inflow
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleRecordOutflow}>
                  <ArrowUpRight className="h-4 w-4" />
                  Record Outflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockBankAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {getAccountTypeIcon(account.type)}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{account.bankName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Account
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>View Statement</DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedAccount(account);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{formatCurrency(account.balance)}</span>
                    <Badge variant="outline" className="capitalize">
                      {account.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Account: {account.accountNumber}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
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
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {format(transaction.date, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {transaction.paymentMode.replace('_', ' ')}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        transaction.type === 'inflow'
                          ? 'text-accent-foreground'
                          : 'text-destructive'
                      )}
                    >
                      {transaction.type === 'inflow' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <BankAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        account={selectedAccount}
        onSave={handleSaveAccount}
      />
      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        type={transactionType}
        onSave={handleSaveTransaction}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account"
        description="Are you sure you want to delete this account? This action cannot be undone."
        onConfirm={handleDeleteAccount}
      />
    </AppLayout>
  );
}
