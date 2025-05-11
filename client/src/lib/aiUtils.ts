import { Expense } from "@shared/schema";
import { apiRequest } from "./queryClient";
import { formatCurrency } from "./expenseUtils";

// Function to categorize expense based on name
export const categorizeExpense = async (expenseName: string): Promise<string> => {
  try {
    const response = await apiRequest('POST', '/api/ai/categorize', { expenseName });
    const data = await response.json();
    return data.category;
  } catch (error) {
    console.error('Error categorizing expense:', error);
    return 'Other';
  }
};

// Generate insights based on expense data
export const generateInsights = (expenses: Expense[]) => {
  if (!expenses.length) return [];
  
  const insights: { title: string; description: string }[] = [];
  
  // Calculate day of week frequencies
  const dayFrequency: Record<number, number> = {};
  const dayAmounts: Record<number, number> = {};
  expenses.forEach(expense => {
    const date = new Date(expense.date);
    const day = date.getDay();
    if (!dayFrequency[day]) {
      dayFrequency[day] = 0;
      dayAmounts[day] = 0;
    }
    dayFrequency[day]++;
    dayAmounts[day] += expense.amount;
  });
  
  // Find the day with highest spending
  const highestSpendingDay = Object.entries(dayAmounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  
  if (highestSpendingDay) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push({
      title: 'Spending Pattern',
      description: `Your highest spending day is ${days[Number(highestSpendingDay[0])]}. Consider planning your expenses on this day more carefully.`
    });
  }
  
  // Find categories with unnecessary expenses
  const unnecessaryExpenses = expenses.filter(expense => expense.status === 'unnecessary');
  if (unnecessaryExpenses.length > 0) {
    const totalUnnecessary = unnecessaryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by category
    const categoryAmounts: Record<string, number> = {};
    unnecessaryExpenses.forEach(expense => {
      if (!categoryAmounts[expense.category]) {
        categoryAmounts[expense.category] = 0;
      }
      categoryAmounts[expense.category] += expense.amount;
    });
    
    // Find highest unnecessary category
    const highestCategory = Object.entries(categoryAmounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (highestCategory) {
      insights.push({
        title: 'Savings Opportunity',
        description: `You spent ${formatCurrency(highestCategory[1])} on unnecessary ${highestCategory[0].toLowerCase()} expenses. Consider cutting back to increase your savings.`
      });
    }
  }
  
  // Find recent spending trends
  if (expenses.length >= 10) {
    // Sort by date descending
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get 5 most recent and 5 before that
    const recent5 = sortedExpenses.slice(0, 5);
    const previous5 = sortedExpenses.slice(5, 10);
    
    const recent5Total = recent5.reduce((sum, expense) => sum + expense.amount, 0);
    const previous5Total = previous5.reduce((sum, expense) => sum + expense.amount, 0);
    
    const percentChange = ((recent5Total - previous5Total) / previous5Total) * 100;
    
    if (Math.abs(percentChange) >= 20) { // Only show significant changes
      insights.push({
        title: 'Recent Spending Trend',
        description: percentChange > 0 
          ? `Your recent expenses have increased by ${Math.round(percentChange)}% compared to earlier. Monitor your spending closely.`
          : `Great job! Your recent expenses have decreased by ${Math.round(Math.abs(percentChange))}% compared to earlier.`
      });
    }
  }
  
  // If we don't have enough insights, add a general one
  if (insights.length < 3) {
    insights.push({
      title: 'Budget Tip',
      description: 'Try the 50/30/20 rule: 50% on needs, 30% on wants, and 20% on savings for better financial health.'
    });
  }
  
  return insights;
};

// Calculate weekly savings recommendation based on avoidable and unnecessary expenses
export const calculateSavingsRecommendation = (expenses: Expense[]) => {
  const avoidable = expenses.filter(expense => expense.status === 'avoidable');
  const unnecessary = expenses.filter(expense => expense.status === 'unnecessary');
  
  const avoidableTotal = avoidable.reduce((sum, expense) => sum + expense.amount, 0);
  const unnecessaryTotal = unnecessary.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Get weekly amount (50% of avoidable + unnecessary)
  // This matches the target calculation for the current week in Savings.tsx
  const weeklySavings = Math.round((avoidableTotal + unnecessaryTotal) * 0.5);
  
  return {
    weekly: weeklySavings,
    avoidableAmount: avoidableTotal,
    unnecessaryAmount: unnecessaryTotal
  };
};
