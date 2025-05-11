import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Expense } from "@shared/schema";

// Format money amount in Rupees
export const formatCurrency = (amount: number): string => {
  // Convert from paise to rupees
  const rupees = amount / 100;
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(rupees);
};

// Format short currency (without symbol for charts)
export const formatShortCurrency = (amount: number): string => {
  // Convert from paise to rupees
  const rupees = amount / 100;
  
  if (rupees >= 100000) {
    return `${(rupees / 100000).toFixed(1)}L`;
  } else if (rupees >= 1000) {
    return `${(rupees / 1000).toFixed(1)}K`;
  } else {
    return `${rupees}`;
  }
};

// Convert amount in rupees to paise for storage
export const rupeeToStorageAmount = (amount: number | string): number => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(numericAmount * 100);
};

// Get the status color based on the expense status
export const getStatusColor = (status: string): { bg: string, text: string } => {
  switch (status.toLowerCase()) {
    case 'necessary':
      return { bg: 'bg-success-light', text: 'text-success-DEFAULT' };
    case 'avoidable':
      return { bg: 'bg-warning-light', text: 'text-warning-DEFAULT' };
    case 'unnecessary':
      return { bg: 'bg-danger-light', text: 'text-danger-DEFAULT' };
    default:
      return { bg: 'bg-neutral-100', text: 'text-neutral-600' };
  }
};

// Get the category color based on the category name
export const getCategoryColor = (category: string): string => {
  const categories: Record<string, string> = {
    'food & drinks': '#ffa000', // amber
    'transportation': '#1976d2', // blue
    'utilities': '#9c27b0', // purple
    'shopping': '#e91e63', // pink
    'entertainment': '#f44336', // red
    'health': '#4caf50', // green
    'education': '#009688', // teal
    'other': '#757575' // grey
  };
  
  const normalizedCategory = category.toLowerCase();
  return categories[normalizedCategory] || '#757575';
};

// Get the category background color (for UI elements) based on the category name
export const getCategoryBgColor = (category: string): string => {
  const categories: Record<string, string> = {
    'food & drinks': 'bg-amber-500',
    'transportation': 'bg-blue-600',
    'utilities': 'bg-purple-600',
    'shopping': 'bg-pink-600',
    'entertainment': 'bg-red-500',
    'health': 'bg-green-500',
    'education': 'bg-teal-600',
    'other': 'bg-neutral-500'
  };
  
  const normalizedCategory = category.toLowerCase();
  return categories[normalizedCategory] || 'bg-neutral-500';
};

// Get date ranges for filtering
export const getDateRanges = () => {
  const today = new Date();
  
  const thisMonth = {
    start: startOfMonth(today),
    end: endOfMonth(today),
    label: 'This Month'
  };
  
  const lastMonth = {
    start: startOfMonth(subMonths(today, 1)),
    end: endOfMonth(subMonths(today, 1)),
    label: 'Last Month'
  };
  
  const last3Months = {
    start: startOfMonth(subMonths(today, 2)),
    end: endOfMonth(today),
    label: 'Last 3 Months'
  };
  
  const thisWeek = {
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
    label: 'This Week'
  };
  
  // Add future months
  const nextMonthDate = new Date(today);
  nextMonthDate.setMonth(today.getMonth() + 1);
  const nextMonth = {
    start: startOfMonth(nextMonthDate),
    end: endOfMonth(nextMonthDate),
    label: 'Next Month'
  };
  
  const nextMonthsStartDate = new Date(today);
  nextMonthsStartDate.setMonth(today.getMonth() + 1);
  const nextMonthsEndDate = new Date(today);
  nextMonthsEndDate.setMonth(today.getMonth() + 3);
  const next3Months = {
    start: startOfMonth(nextMonthsStartDate),
    end: endOfMonth(nextMonthsEndDate),
    label: 'Next 3 Months'
  };
  
  // Add all time range
  const allTime = {
    start: new Date('2020-01-01'), // A date far in the past
    end: new Date('2030-12-31'),   // A date far in the future
    label: 'All Time'
  };
  
  return {
    thisMonth,
    lastMonth,
    last3Months,
    thisWeek,
    nextMonth,
    next3Months,
    allTime
  };
};

// Group expenses by category
export const groupExpensesByCategory = (expenses: Expense[]) => {
  const categories: Record<string, number> = {};
  
  expenses.forEach((expense) => {
    const category = expense.category;
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += expense.amount;
  });
  
  return Object.entries(categories).map(([name, amount]) => ({
    name,
    amount,
    color: getCategoryColor(name)
  })).sort((a, b) => b.amount - a.amount);
};

// Group expenses by week
export const groupExpensesByWeek = (expenses: Expense[], numWeeks = 4) => {
  const today = new Date();
  const result = [];
  
  for (let i = 0; i < numWeeks; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= weekStart && expenseDate <= weekEnd;
    });
    
    const totalAmount = weekExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    result.push({
      weekLabel: `Week ${numWeeks - i}`,
      startDate: weekStart,
      endDate: weekEnd,
      amount: totalAmount
    });
  }
  
  return result.reverse();
};

// Calculate basic analytics from expenses
export const calculateExpenseAnalytics = (expenses: Expense[]) => {
  if (expenses.length === 0) {
    return {
      totalAmount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: Infinity,
      mostCommonCategory: 'N/A',
      categoriesCount: {}
    };
  }
  
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgAmount = Math.round(totalAmount / expenses.length);
  const maxAmount = Math.max(...expenses.map(exp => exp.amount));
  const minAmount = Math.min(...expenses.map(exp => exp.amount));
  
  // Find most common category
  const categoriesCount: Record<string, number> = {};
  expenses.forEach(exp => {
    if (!categoriesCount[exp.category]) {
      categoriesCount[exp.category] = 0;
    }
    categoriesCount[exp.category]++;
  });
  
  const mostCommonCategory = Object.entries(categoriesCount)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return {
    totalAmount,
    avgAmount,
    maxAmount,
    minAmount,
    mostCommonCategory,
    categoriesCount
  };
};
