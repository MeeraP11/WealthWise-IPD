import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { format, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from "date-fns";
import { Saving } from "@shared/schema";
import { formatCurrency } from "@/lib/expenseUtils";

interface SavingsChartProps {
  savings: Saving[];
  weeklyRecommendations: Array<{
    weekStart: Date;
    weekEnd: Date;
    target: number;
    actual: number;
  }>;
}

export function SavingsChart({ savings, weeklyRecommendations }: SavingsChartProps) {
  const [activeChart, setActiveChart] = useState("weekly");
  const [timeRange, setTimeRange] = useState("3months");
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (activeChart === "weekly") {
      setChartData(formatWeeklyData());
    } else {
      setChartData(formatMonthlyData());
    }
  }, [activeChart, timeRange, savings, weeklyRecommendations]);

  const formatWeeklyData = () => {
    const now = new Date();
    const monthsToSubtract = timeRange === "3months" ? 3 : 6;
    const startDate = subMonths(now, monthsToSubtract);
    
    // Get all weeks in the time range
    const weeks = eachWeekOfInterval(
      { start: startDate, end: now },
      { weekStartsOn: 1 } // Monday as start of week
    );
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekLabel = `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM")}`;
      
      // Find savings in this week
      const weekSavings = savings.filter(saving => 
        isSameWeek(new Date(saving.date), weekStart, { weekStartsOn: 1 })
      );
      const actualSaved = weekSavings.reduce((sum, saving) => sum + saving.amount, 0);
      
      // Find recommendation for this week
      const recommendation = weeklyRecommendations.find(rec => 
        isSameWeek(rec.weekStart, weekStart, { weekStartsOn: 1 })
      );
      const targetSavings = recommendation?.target || 0;
      
      return {
        week: weekLabel,
        actual: actualSaved,
        target: targetSavings,
      };
    });
  };

  const formatMonthlyData = () => {
    const now = new Date();
    const monthsToSubtract = timeRange === "3months" ? 3 : 6;
    
    const data = [];
    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthLabel = format(monthDate, "MMM yyyy");
      const month = format(monthDate, "yyyy-MM");
      
      // Filter savings for this month
      const monthSavings = savings.filter(saving => {
        const savingDate = new Date(saving.date);
        return format(savingDate, "yyyy-MM") === month;
      });
      
      const totalSaved = monthSavings.reduce((sum, saving) => sum + saving.amount, 0);
      
      data.push({
        month: monthLabel,
        savings: totalSaved,
      });
    }
    
    return data;
  };

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-neutral-200 shadow-sm rounded-md">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </span>{" "}
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold">Savings Progress</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={activeChart} onValueChange={setActiveChart} className="w-[200px]">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === "weekly" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value}`;
                  }}
                />
                <Tooltip content={renderTooltip} />
                <Legend />
                <Bar dataKey="actual" name="Actual Savings" fill="#05B486" />
                <Bar dataKey="target" name="Target Savings" fill="#1F64FF" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => {
                    if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value}`;
                  }}
                />
                <Tooltip content={renderTooltip} />
                <Line 
                  type="monotone" 
                  dataKey="savings" 
                  name="Monthly Savings"
                  stroke="#05B486" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
