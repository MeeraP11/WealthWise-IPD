import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import ExpenseTable from "@/components/expense/ExpenseTable";
import SummaryCards from "@/components/expense/SummaryCards";
import ExpenseAnalysis from "@/components/expense/ExpenseAnalysis";
import AddExpenseModal from "@/components/expense/AddExpenseModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Expense } from "@shared/schema";
import { getDateRanges } from "@/lib/expenseUtils";
import { calculateSavingsRecommendation, generateInsights } from "@/lib/aiUtils";

const Expenses = () => {
  const [filterDateRange, setFilterDateRange] = useState("this_month");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const { toast } = useToast();

  // Get date ranges for filtering
  const dateRanges = getDateRanges();

  // Get date range based on selected filter
  const getSelectedDateRange = () => {
    switch (filterDateRange) {
      case "this_month":
        return dateRanges.thisMonth;
      case "last_month":
        return dateRanges.lastMonth;
      case "last_3_months":
        return dateRanges.last3Months;
      case "this_week":
        return dateRanges.thisWeek;
      case "next_month":
        return dateRanges.nextMonth;
      case "next_3_months":
        return dateRanges.next3Months;
      case "all_time":
        return dateRanges.allTime;
      default:
        return dateRanges.thisMonth;
    }
  };

  // Fetch expenses data with date range filter
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['/api/expenses', filterDateRange],
    queryFn: async ({ queryKey }) => {
      const [_path, dateRange] = queryKey;
      const { start, end } = getSelectedDateRange();
      
      const url = `/api/expenses?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      return res.json();
    }
  });

  // Fetch dashboard summary for expense and savings data
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/dashboard/summary'],
  });

  // Error handling
  if (expensesError) {
    toast({
      variant: "destructive",
      title: "Error loading expenses",
      description: "Please try refreshing the page",
    });
  }

  // Filter expenses by search term
  const filteredExpenses = expensesData?.expenses?.filter((expense: Expense) => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      expense.name.toLowerCase().includes(term) ||
      expense.category.toLowerCase().includes(term) ||
      expense.status.toLowerCase().includes(term)
    );
  }) || [];

  // Calculate savings recommendation from expenses
  const savingsRecommendation = expensesData?.expenses
    ? calculateSavingsRecommendation(expensesData.expenses)
    : { weekly: 0, avoidableAmount: 0, unnecessaryAmount: 0 };

  // Generate AI insights
  const insights = expensesData?.expenses 
    ? generateInsights(expensesData.expenses)
    : [];

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  return (
    <>
      <Header title="Expense Tracker" />
      <div className="p-4 md:p-6">
        {/* Summary Cards */}
        {!expensesLoading && !summaryLoading ? (
          <SummaryCards
            monthlyExpenses={summaryData?.summary?.currentMonthExpenses || 0}
            savingsAmount={summaryData?.summary?.savingsTotal || 0}
            savingsGoal={10000 * 100} // Example goal in paise
            percentageChange={summaryData?.summary?.percentageChange || 0}
            potentialSavings={savingsRecommendation}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => { setEditingExpense(undefined); setShowAddModal(true); }}>
              <i className="fas fa-plus mr-2"></i> Add Expense
            </Button>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Search expenses..."
                className="pl-9 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"></i>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="next_month">Next Month</SelectItem>
                <SelectItem value="next_3_months">Next 3 Months</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border border-neutral-300 rounded-md overflow-hidden">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                className="px-3 h-10 rounded-none"
                onClick={() => setViewMode("table")}
              >
                <i className="fas fa-table-list"></i>
              </Button>
              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                className="px-3 h-10 rounded-none"
                onClick={() => setViewMode("chart")}
              >
                <i className="fas fa-chart-pie"></i>
              </Button>
            </div>
          </div>
        </div>

        {/* Expense Table or Charts based on view mode */}
        {viewMode === "table" ? (
          expensesLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ExpenseTable
              expenses={filteredExpenses}
              onEditExpense={handleEditExpense}
            />
          )
        ) : (
          expensesLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ExpenseAnalysis expenses={filteredExpenses} />
          )
        )}

        {/* AI Insights */}
        <Card className="mt-8">
          <CardHeader className="flex-row items-center space-y-0 pb-2">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-secondary-light text-secondary-DEFAULT flex items-center justify-center mr-3">
                <i className="fas fa-robot"></i>
              </div>
              <CardTitle className="text-base">AI Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : insights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                    <div className="text-sm font-medium text-neutral-700 mb-2">{insight.title}</div>
                    <p className="text-sm text-neutral-600">{insight.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-neutral-500">Add more expenses to get personalized insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Expense Modal */}
        <AddExpenseModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingExpense(undefined);
          }}
          expenseToEdit={editingExpense}
        />
      </div>
    </>
  );
};

export default Expenses;
