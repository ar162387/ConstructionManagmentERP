/**
 * Currency formatting utilities for the application
 * All monetary values are displayed in Pakistani Rupees (PKR)
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 10000000) {
    // Crore (10 million)
    return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    // Lakh (100 thousand)
    return `Rs ${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(0)}K`;
  }
  return `Rs ${amount.toFixed(0)}`;
};

export const formatCurrencyShort = (amount: number): string => {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toFixed(0);
};
