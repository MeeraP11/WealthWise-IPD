import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatCurrency, groupExpensesByCategory } from "@/lib/expenseUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, TrendingUp } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

const Predictions = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch prediction data
  const { data: predictionsData, isLoading: predictionsLoading, error: predictionsError } = useQuery({
    queryKey: ['/api/predictions'],
  });

  // Fetch expenses data
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['/api/expenses'],
  });

  // Handle errors
  useEffect(() => {
    if (predictionsError || expensesError) {
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: "Failed to load prediction data. Please try again.",
      });
    }
  }, [predictionsError, expensesError, toast]);

  // Generate predictions
  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    try {
      await apiRequest("POST", "/api/predictions/generate", {});
      
      // Refresh predictions data
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      
      toast({
        title: "Predictions Generated",
        description: "Your expense predictions have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate predictions. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Format predictions for chart display
  const formatPredictionChartData = () => {
    if (!predictionsData?.predictions || predictionsData.predictions.length === 0) {
      return [];
    }
    
    return predictionsData.predictions.map((prediction: any) => {
      const [year, month] = prediction.month.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'short' });
      
      return {
        month: `${monthName} ${year}`,
        predicted: prediction.predictedAmount,
        actual: prediction.actualAmount || 0,
      };
    });
  };

  // Format category predictions for future month
  const formatCategoryPredictions = () => {
    if (!predictionsData?.predictions || predictionsData.predictions.length === 0) {
      return [];
    }
    
    // Get the most recent prediction
    const mostRecent = [...predictionsData.predictions].sort((a, b) => 
      b.month.localeCompare(a.month)
    )[0];
    
    // Convert categories object to array for chart
    return Object.entries(mostRecent.categories).map(([name, value]) => ({
      name,
      value,
      color: getCategoryColor(name)
    }));
  };

  // Get color for category
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food & Drinks': '#FFB800',
      'Transportation': '#1F64FF',
      'Utilities': '#05B486',
      'Shopping': '#FF5252',
      'Entertainment': '#9063CD',
      'Health': '#4CAF50',
      'Education': '#FF9800',
      'Other': '#607D8B'
    };
    
    return colors[category] || '#607D8B';
  };

  // Format monthly comparison data (past vs future)
  const formatMonthlyComparisonData = () => {
    if (!expensesData?.expenses || !predictionsData?.predictions || predictionsData.predictions.length === 0) {
      return [];
    }
    
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const nextMonth = format(addMonths(now, 1), 'yyyy-MM');
    const prevMonth = format(subMonths(now, 1), 'yyyy-MM');
    
    // Find next month prediction
    const nextMonthPrediction = predictionsData.predictions.find((p: any) => p.month === nextMonth);
    
    if (!nextMonthPrediction) return [];
    
    // Calculate current month total
    const currentMonthExpenses = expensesData.expenses.filter((e: any) => {
      const expenseDate = new Date(e.date);
      return format(expenseDate, 'yyyy-MM') === currentMonth;
    });
    
    const currentMonthTotal = currentMonthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    
    // Calculate last month total
    const prevMonthExpenses = expensesData.expenses.filter((e: any) => {
      const expenseDate = new Date(e.date);
      return format(expenseDate, 'yyyy-MM') === prevMonth;
    });
    
    const prevMonthTotal = prevMonthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    
    return [
      { 
        name: format(subMonths(now, 1), 'MMM yyyy'), 
        amount: prevMonthTotal
      },
      { 
        name: format(now, 'MMM yyyy'), 
        amount: currentMonthTotal
      },
      { 
        name: format(addMonths(now, 1), 'MMM yyyy'), 
        amount: nextMonthPrediction.predictedAmount,
        predicted: true
      }
    ];
  };

  const predictionChartData = formatPredictionChartData();
  const categoryPredictions = formatCategoryPredictions();
  const monthlyComparison = formatMonthlyComparisonData();

  // Get next month name for display
  const getNextMonthName = () => {
    const nextMonth = addMonths(new Date(), 1);
    return format(nextMonth, 'MMMM yyyy');
  };
  
  const isLoading = predictionsLoading || expensesLoading;
  const hasPredictions = predictionsData?.predictions && predictionsData.predictions.length > 0;

  return (
    <>
      <Header title="Future Predictions" />
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Expense Predictions</h2>
            <p className="text-neutral-500">AI-powered predictions based on your spending patterns</p>
          </div>
          <Button 
            onClick={handleGeneratePredictions} 
            disabled={isGenerating || isLoading}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-2"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt mr-2"></i>
                Generate Predictions
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        ) : !hasPredictions ? (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4 text-neutral-400">
              <TrendingUp className="h-16 w-16" />
            </div>
            <CardTitle className="mb-2">No Predictions Yet</CardTitle>
            <CardDescription className="mb-6">
              Generate predictions to see your expected future expenses based on your spending pattern.
            </CardDescription>
            <Button onClick={handleGeneratePredictions} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Predictions"}
            </Button>
          </Card>
        ) : (
          <>
            {/* Monthly Trend Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Monthly Expense Trends</CardTitle>
                <CardDescription>
                  Historical and predicted monthly expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis
                        tickFormatter={(value) => {
                          if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return `${value}`;
                        }}
                      />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar 
                        dataKey="amount" 
                        fill="#05B486"
                        name="Monthly Expense"
                        radius={[4, 4, 0, 0]}
                        barSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Prediction Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Category Breakdown for Next Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Predicted Categories for {getNextMonthName()}</CardTitle>
                  <CardDescription>
                    Breakdown of where your money will likely go
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPredictions}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryPredictions.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Prediction Insights</CardTitle>
                  <CardDescription>
                    Analysis of your future spending patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Next Month's Forecast</AlertTitle>
                    <AlertDescription>
                      Your predicted expenses for {getNextMonthName()} are {
                        formatCurrency(
                          monthlyComparison.find(m => m.predicted)?.amount || 0
                        )
                      }
                    </AlertDescription>
                  </Alert>

                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Top Expense Category</h3>
                    <p className="text-sm text-neutral-600">
                      {
                        categoryPredictions.length > 0
                          ? `Your highest predicted expense will be ${categoryPredictions[0].name} at ${formatCurrency(categoryPredictions[0].value)}`
                          : "Add more expenses to get category predictions"
                      }
                    </p>
                  </div>

                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Spending Pattern</h3>
                    <p className="text-sm text-neutral-600">
                      {
                        monthlyComparison.length === 3
                          ? monthlyComparison[2].amount > monthlyComparison[1].amount
                            ? "Your spending is predicted to increase next month. Consider reviewing your budget."
                            : "Your spending is predicted to decrease next month. Great job managing your finances!"
                          : "Add more expenses to analyze spending patterns"
                      }
                    </p>
                  </div>

                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Saving Opportunity</h3>
                    <p className="text-sm text-neutral-600">
                      {
                        categoryPredictions.length > 0
                          ? `Consider reducing expenses in ${categoryPredictions[0].name} to increase your savings.`
                          : "Add more diverse expenses to get savings recommendations"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budgeting Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Future Planning Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Create a Monthly Budget</h3>
                    <p className="text-sm text-neutral-600">
                      Use these predictions to set realistic spending limits for each category in the coming month.
                    </p>
                  </div>
                  
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Identify Saving Opportunities</h3>
                    <p className="text-sm text-neutral-600">
                      Look for categories where your spending is projected to increase, and plan ways to reduce expenses.
                    </p>
                  </div>
                  
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Plan for Big Expenses</h3>
                    <p className="text-sm text-neutral-600">
                      If you anticipate large expenses in the coming months, start setting aside money now to avoid financial stress.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default Predictions;
