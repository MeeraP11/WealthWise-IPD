import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { GoalCard } from "@/components/goals/GoalCard";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Goal } from "@shared/schema";
import { formatCurrency } from "@/lib/expenseUtils";
import { useToast } from "@/hooks/use-toast";

const Goals = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("active");
  const { toast } = useToast();

  // Fetch goals data
  const { data: goalsData, isLoading, error } = useQuery({
    queryKey: ['/api/goals'],
  });

  // Handle errors
  if (error) {
    toast({
      variant: "destructive",
      title: "Error loading goals",
      description: "Please try refreshing the page",
    });
  }

  // Filter goals based on active tab
  const getFilteredGoals = () => {
    if (!goalsData?.goals) return [];
    
    return goalsData.goals.filter((goal: Goal) => {
      if (activeTab === "active") return !goal.completed;
      return goal.completed;
    });
  };

  const filteredGoals = getFilteredGoals();

  // Calculate total progress across all active goals
  const calculateTotalProgress = () => {
    if (!goalsData?.goals) return { current: 0, target: 0, percentage: 0 };
    
    const activeGoals = goalsData.goals.filter((goal: Goal) => !goal.completed);
    
    if (activeGoals.length === 0) return { current: 0, target: 0, percentage: 0 };
    
    const total = activeGoals.reduce(
      (acc, goal) => {
        acc.current += goal.currentAmount;
        acc.target += goal.targetAmount;
        return acc;
      },
      { current: 0, target: 0 }
    );
    
    const percentage = (total.current / total.target) * 100;
    
    return {
      current: total.current,
      target: total.target,
      percentage: Math.min(Math.round(percentage), 100)
    };
  };

  const totalProgress = calculateTotalProgress();

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddModal(true);
  };

  return (
    <>
      <Header title="Financial Goals" />
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Your Financial Goals</h2>
            <p className="text-neutral-500">Track and achieve your financial targets</p>
          </div>
          <Button onClick={() => { setEditingGoal(undefined); setShowAddModal(true); }}>
            <i className="fas fa-plus mr-2"></i> Add New Goal
          </Button>
        </div>

        {/* Goal Progress Summary */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
            <CardDescription>
              Combined progress across all your active goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {formatCurrency(totalProgress.current)} of {formatCurrency(totalProgress.target)}
                  </span>
                  <span>{totalProgress.percentage}% complete</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2.5">
                  <div
                    className="bg-primary rounded-full h-2.5"
                    style={{ width: `${totalProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-neutral-500">
            <div className="flex items-center">
              <i className="fas fa-info-circle mr-2"></i>
              <span>Complete goals to earn 100 coins each!</span>
            </div>
          </CardFooter>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="active">Active Goals</TabsTrigger>
            <TabsTrigger value="completed">Completed Goals</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : filteredGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGoals.map((goal: Goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex justify-center mb-4 text-neutral-400">
                  <i className="fas fa-bullseye text-5xl"></i>
                </div>
                <CardTitle className="mb-2">No {activeTab === "active" ? "Active" : "Completed"} Goals</CardTitle>
                <CardDescription className="mb-6">
                  {activeTab === "active"
                    ? "Start setting your financial goals to track your progress."
                    : "You haven't completed any goals yet. Keep going!"}
                </CardDescription>
                {activeTab === "active" && (
                  <Button onClick={() => { setEditingGoal(undefined); setShowAddModal(true); }}>
                    <i className="fas fa-plus mr-2"></i> Create Goal
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Goal Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-lightbulb text-warning-DEFAULT mr-2"></i>
              Goal Setting Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border border-neutral-200 rounded-lg">
                <h3 className="font-medium mb-1">Be Specific</h3>
                <p className="text-sm text-neutral-600">
                  Set clear, specific goals like "Save ₹50,000 for a new laptop" instead of "Save money".
                </p>
              </div>
              
              <div className="p-3 border border-neutral-200 rounded-lg">
                <h3 className="font-medium mb-1">Make it Measurable</h3>
                <p className="text-sm text-neutral-600">
                  Define exactly how much money you need and by when to achieve your goal.
                </p>
              </div>
              
              <div className="p-3 border border-neutral-200 rounded-lg">
                <h3 className="font-medium mb-1">Break it Down</h3>
                <p className="text-sm text-neutral-600">
                  Divide large goals into smaller milestones to make them more manageable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Goal Modal */}
        <AddGoalModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingGoal(undefined);
          }}
          goalToEdit={editingGoal}
        />
      </div>
    </>
  );
};

export default Goals;
