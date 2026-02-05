import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        <Badge variant="outline" className="font-normal">
          View All
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                transaction.type === 'inflow'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {transaction.type === 'inflow' ? (
                <ArrowDownLeft className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{transaction.category}</span>
                <span>•</span>
                <span>{format(transaction.date, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  'font-semibold',
                  transaction.type === 'inflow' ? 'text-green-600' : 'text-destructive'
                )}
              >
                {transaction.type === 'inflow' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>
              <Badge variant="outline" className="text-xs capitalize">
                {transaction.paymentMode.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
