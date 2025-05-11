import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { SavingsChart } from "@/components/savings/SavingsChart";
import { PiggyBank } from "@/components/savings/PiggyBank";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Saving } from "@shared/schema";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { formatCurrency } from "@/lib/expenseUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const Savings = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // Fetch savings data
  const { data: savingsData, isLoading: savingsLoading, error: savingsError } = useQuery({
    queryKey: ['/api/savings'],
  });
  
  // Fetch expenses data for recommendations
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['/api/expenses'],
  });
  
  // Handle errors
  useEffect(() => {
    if (savingsError) {
      toast({
        variant: "destructive",
        title: "Error loading savings data",
        description: "Please try refreshing the page",
      });
    }
    
    if (expensesError) {
      toast({
        variant: "destructive",
        title: "Error loading expense data",
        description: "This may affect savings recommendations",
      });
    }
  }, [savingsError, expensesError, toast]);
  
  // Generate weekly savings targets based on avoidable/unnecessary expenses
  const generateWeeklyTargets = () => {
    if (!expensesData?.expenses) return [];
    
    const now = new Date();
    const result = [];
    
    // Generate data for 6 weeks (current week and 5 past weeks)
    for (let i = 0; i < 6; i++) {
      const weekEnd = i === 0 ? now : subWeeks(now, i);
      const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(weekEnd, { weekStartsOn: 1 });
      
      // For past weeks, calculate from expenses
      const weekExpenses = expensesData.expenses.filter((expense: any) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= weekStart && expenseDate <= weekEndDate;
      });
      
      const avoidableExpenses = weekExpenses
        .filter((e: any) => e.status === 'avoidable')
        .reduce((sum: number, e: any) => sum + e.amount, 0);
      
      const unnecessaryExpenses = weekExpenses
        .filter((e: any) => e.status === 'unnecessary')
        .reduce((sum: number, e: any) => sum + e.amount, 0);
      
      // For target, use the previous week's avoidable + unnecessary
      // For current week (i=0), just set a reasonable target
      const target = i === 0 
        ? Math.round((avoidableExpenses + unnecessaryExpenses) * 0.5) // Current week target
        : avoidableExpenses + unnecessaryExpenses; // Past week's potential
      
      // Find actual savings in this week
      const weekSavings = savingsData?.savings?.filter((saving: Saving) => {
        const savingDate = new Date(saving.date);
        return savingDate >= weekStart && savingDate <= weekEndDate;
      }) || [];
      
      const actualSaved = weekSavings.reduce((sum: number, saving: Saving) => sum + saving.amount, 0);
      
      result.push({
        weekStart,
        weekEnd: weekEndDate,
        target,
        actual: actualSaved,
      });
    }
    
    // Reverse so most recent week is last
    return result.reverse();
  };
  
  // Generate weekly targets
  const weeklyTargets = generateWeeklyTargets();
  
  // Calculate total savings
  const totalSavings = savingsData?.savings?.reduce((total: number, saving: Saving) => total + saving.amount, 0) || 0;
  
  // Delete a saving entry
  const handleDeleteSaving = async (id: number) => {
    if (confirm("Are you sure you want to delete this saving?")) {
      try {
        await apiRequest("DELETE", `/api/savings/${id}`, {});
        
        toast({
          title: "Saving deleted",
          description: "The saving has been successfully deleted",
        });
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: "Failed to delete the saving. Please try again.",
        });
      }
    }
  };
  
  return (
    <>
      <Header title="Savings" />
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Saving History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Savings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-neutral-500">Total Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  {savingsLoading ? (
                    <Skeleton className="h-8 w-3/4" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalSavings)}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-neutral-500">This Week's Target</CardTitle>
                </CardHeader>
                <CardContent>
                  {savingsLoading || expensesLoading ? (
                    <Skeleton className="h-8 w-3/4" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCurrency(weeklyTargets[weeklyTargets.length - 1]?.target || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-neutral-500">This Week's Saved</CardTitle>
                </CardHeader>
                <CardContent>
                  {savingsLoading ? (
                    <Skeleton className="h-8 w-3/4" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCurrency(weeklyTargets[weeklyTargets.length - 1]?.actual || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Charts and Piggy Bank */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {savingsLoading || expensesLoading ? (
                <>
                  <Skeleton className="h-80 lg:col-span-2" />
                  <Skeleton className="h-80" />
                </>
              ) : (
                <>
                  <SavingsChart 
                    savings={savingsData?.savings || []} 
                    weeklyRecommendations={weeklyTargets}
                  />
                  <PiggyBank />
                </>
              )}
            </div>
            
            {/* Weekly Savings Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-lightbulb text-warning-DEFAULT mr-2"></i>
                  Weekly Savings Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">The 50/30/20 Rule</h3>
                    <p className="text-sm text-neutral-600">
                      Allocate 50% of your income to needs, 30% to wants, and 20% to savings. 
                      This simple rule helps you balance essential expenses with financial goals.
                    </p>
                  </div>
                  
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Automatic Transfers</h3>
                    <p className="text-sm text-neutral-600">
                      Set up automatic transfers to your savings account right after payday. 
                      This ensures you save before you spend.
                    </p>
                  </div>
                  
                  <div className="p-3 border border-neutral-200 rounded-lg">
                    <h3 className="font-medium mb-1">Track Your Expenses</h3>
                    <p className="text-sm text-neutral-600">
                      Regularly review your avoidable and unnecessary expenses. 
                      Challenge yourself to reduce them by 10% each month.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Savings History</CardTitle>
              </CardHeader>
              <CardContent>
                {savingsLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : savingsData?.savings?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savingsData.savings.map((saving: Saving) => (
                          <TableRow key={saving.id}>
                            <TableCell>
                              {format(new Date(saving.date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(saving.amount)}
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">
                                {saving.source.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell>{saving.notes || "-"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSaving(saving.id)}
                                className="text-neutral-500 hover:text-danger-DEFAULT"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-500 mb-4">No savings entries yet</p>
                    <Button onClick={() => setActiveTab("overview")}>
                      Add Your First Saving
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Savings;
