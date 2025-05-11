import { Expense } from "@shared/schema";
import { groupExpensesByCategory, groupExpensesByWeek, formatCurrency, getCategoryColor } from "@/lib/expenseUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ExpenseAnalysisProps {
  expenses: Expense[];
}

const ExpenseAnalysis = ({ expenses }: ExpenseAnalysisProps) => {
  const [categoryTimeframe, setCategoryTimeframe] = useState("this_month");
  const [trendTimeframe, setTrendTimeframe] = useState("last_4_weeks");
  
  // Filter expenses based on timeframe
  const getCategoryExpenses = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    switch(categoryTimeframe) {
      case "this_month":
        return expenses.filter(e => new Date(e.date) >= monthStart);
      case "last_month":
        return expenses.filter(e => 
          new Date(e.date) >= lastMonthStart && 
          new Date(e.date) <= lastMonthEnd
        );
      default:
        return expenses;
    }
  };
  
  // Get expenses grouped by category
  const categoryExpenses = getCategoryExpenses();
  const categoryData = groupExpensesByCategory(categoryExpenses);
  const totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);
  
  // Get weekly data
  const weeklyData = groupExpensesByWeek(
    expenses, 
    trendTimeframe === "last_4_weeks" ? 4 : 8
  );
  
  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold">Expense Categories</CardTitle>
            <Select
              defaultValue={categoryTimeframe}
              onValueChange={setCategoryTimeframe}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2">
              <div className="h-48 relative">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-neutral-500 text-sm">No data available</p>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-sm text-neutral-500">Total</div>
                    <div className="font-bold">{formatCurrency(totalAmount)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              <div className="space-y-3">
                {categoryData.length > 0 ? (
                  categoryData.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full ${category.color} mr-2`}></span>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <div className="text-sm font-medium">{formatCurrency(category.amount)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-neutral-500 text-sm">No categories to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trends */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold">Weekly Trends</CardTitle>
            <Select
              defaultValue={trendTimeframe}
              onValueChange={setTrendTimeframe}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                <SelectItem value="last_8_weeks">Last 8 Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="weekLabel" />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return `${value}`;
                    }}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="amount" fill="#05B486" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-neutral-500 text-sm">No weekly data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseAnalysis;
