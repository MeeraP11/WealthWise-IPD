import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getCategoryColor, groupExpensesByCategory } from "@/lib/expenseUtils";
import { generateInsights } from "@/lib/aiUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const [insights, setInsights] = useState<any[]>([]);

  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['/api/dashboard/summary'],
  });

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['/api/expenses'],
  });

  // Fetch goals
  const { data: goalsData, isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ['/api/goals'],
  });

  // Fetch achievements
  const { data: achievementsData, isLoading: achievementsLoading, error: achievementsError } = useQuery({
    queryKey: ['/api/achievements'],
  });

  // Generate AI insights when expenses data changes
  useEffect(() => {
    if (expensesData?.expenses) {
      const newInsights = generateInsights(expensesData.expenses);
      setInsights(newInsights);
    }
  }, [expensesData]);

  // Show error if any query fails
  useEffect(() => {
    const errors = [summaryError, expensesError, goalsError, achievementsError].filter(Boolean);
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard data",
        description: "Please try refreshing the page",
      });
    }
  }, [summaryError, expensesError, goalsError, achievementsError, toast]);

  // Transform expenses data for category chart
  const categoryData = expensesData?.expenses
    ? groupExpensesByCategory(expensesData.expenses)
    : [];

  // Format data for expense trend chart
  const getExpenseTrendData = () => {
    if (!expensesData?.expenses) return [];

    const months: Record<string, number> = {};
    expensesData.expenses.forEach((expense: any) => {
      const date = new Date(expense.date);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!months[monthYear]) {
        months[monthYear] = 0;
      }
      months[monthYear] += expense.amount;
    });

    return Object.entries(months).map(([name, value]) => ({ name, value }));
  };

  // Check if overall data is loading
  const isLoading = summaryLoading || expensesLoading || goalsLoading || achievementsLoading;

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-4 md:p-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Monthly Expenses Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summaryData?.summary?.currentMonthExpenses || 0)}
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    {summaryData?.summary?.percentageChange > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-danger-DEFAULT mr-1" />
                        <span className="text-danger-DEFAULT">{Math.abs(summaryData?.summary?.percentageChange)}% </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-success-DEFAULT mr-1" />
                        <span className="text-success-DEFAULT">{Math.abs(summaryData?.summary?.percentageChange)}% </span>
                      </>
                    )}
                    <span className="text-neutral-500 ml-1">vs last month</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Savings Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Total Savings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summaryData?.summary?.savingsTotal || 0)}
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-success-DEFAULT">
                      <i className="fas fa-piggy-bank mr-1"></i>
                    </span>
                    <span className="text-neutral-500">This month</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Goals Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {summaryData?.summary?.completedGoals || 0}/{summaryData?.summary?.goalCount || 0}
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-primary">
                      <i className="fas fa-bullseye mr-1"></i>
                    </span>
                    <span className="text-neutral-500">Goals completed</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Achievements Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">New Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4 mb-2" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {summaryData?.summary?.newAchievements || 0}
                  </div>
                  <div className="flex items-center mt-2 text-xs">
                    <span className="text-warning-DEFAULT">
                      <i className="fas fa-trophy mr-1"></i>
                    </span>
                    <span className="text-neutral-500">This week</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Expense Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getExpenseTrendData()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
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
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#05B486" 
                        name="Expenses"
                        strokeWidth={2}
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-500">
                      <p>No expense data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Savings Potential Alert */}
        {!isLoading && summaryData?.summary?.potentialWeeklySavings > 0 && (
          <Alert className="mb-6">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>AI Savings Recommendation</AlertTitle>
            <AlertDescription>
              You could potentially save {formatCurrency(summaryData.summary.potentialWeeklySavings)} weekly by cutting down on unnecessary ({formatCurrency(summaryData.summary.unnecessary)}) and avoidable ({formatCurrency(summaryData.summary.avoidable)}) expenses.
            </AlertDescription>
          </Alert>
        )}

        {/* AI Insights */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-secondary-light text-secondary-DEFAULT flex items-center justify-center mr-3">
                <i className="fas fa-robot"></i>
              </div>
              <CardTitle>AI Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
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
              <div className="text-center py-6 text-neutral-500">
                <p>Add more expenses to get personalized insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Goals and Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : goalsData?.goals?.length > 0 ? (
                <div className="space-y-3">
                  {goalsData.goals.slice(0, 3).map((goal: any) => (
                    <div key={goal.id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <div className="font-medium">{goal.name}</div>
                        <div className="text-xs text-neutral-500">
                          {Math.round((goal.currentAmount / goal.targetAmount) * 100)}% complete
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(goal.targetAmount)}</div>
                        {goal.completed ? (
                          <span className="text-xs bg-success-light text-success-DEFAULT px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">In progress</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-500">
                  <p>No goals set yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : achievementsData?.achievements?.length > 0 ? (
                <div className="space-y-3">
                  {achievementsData.achievements.slice(0, 3).map((achievement: any) => (
                    <div key={achievement.id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-xs text-neutral-500">
                          {new Date(achievement.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-warning-light text-warning-DEFAULT px-2 py-1 rounded-full text-xs">
                        +{achievement.coinsAwarded} coins
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-500">
                  <p>No achievements yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
