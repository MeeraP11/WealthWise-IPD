import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Goal } from "@shared/schema";
import { formatCurrency } from "@/lib/expenseUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { useUser } from "@/lib/userContext";
import { AllocationDialog } from "./AllocationDialog";
import { CoinReward } from "@/components/shared/CoinReward";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [availableSavings, setAvailableSavings] = useState(0);
  const [showCoinReward, setShowCoinReward] = useState(false);
  const { toast } = useToast();
  const { updateCoins } = useUser();

  // Calculate progress percentage
  const progressPercentage = Math.min(
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
    100
  );

  // Calculate days remaining
  const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
  
  // Format dates
  const startDate = format(new Date(goal.startDate), "MMM d, yyyy");
  const targetDate = format(new Date(goal.targetDate), "MMM d, yyyy");

  const handleMarkComplete = async () => {
    if (isUpdating) return;
    
    if (progressPercentage < 100) {
      const shouldProceed = confirm("This goal hasn't reached 100%. Are you sure you want to mark it as complete?");
      if (!shouldProceed) return;
    }
    
    setIsUpdating(true);
    try {
      await apiRequest("PUT", `/api/goals/${goal.id}`, {
        completed: true,
        currentAmount: goal.targetAmount // Ensure it shows 100%
      });
      
      // Award 100 coins for completing a goal
      const coinsAwarded = 100;
      updateCoins(coinsAwarded);
      
      setShowCoinReward(true);
      setTimeout(() => setShowCoinReward(false), 3000);
      
      toast({
        title: "Goal achieved!",
        description: `Congratulations! You earned ${coinsAwarded} coins for reaching your goal!`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update goal. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContribute = async () => {
    // Fetch savings data first
    try {
      const response = await apiRequest("GET", "/api/savings", null);
      const { savings } = await response.json();
      
      // Calculate total available savings
      const totalSavings = savings.reduce((sum: number, saving: any) => sum + saving.amount, 0);
      
      // Set available savings and show dialog
      setAvailableSavings(totalSavings);
      setShowAllocationDialog(true);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch savings data. Please try again.",
      });
    }
  };
  
  const handleAllocationConfirm = async (amountInPaise: number) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Calculate new goal amount
      const newTotal = goal.currentAmount + amountInPaise;
      const willComplete = newTotal >= goal.targetAmount;
      
      // Update the goal with the contribution
      const response = await apiRequest("PUT", `/api/goals/${goal.id}`, {
        currentAmount: newTotal,
        // If the contribution completes the goal, mark it as completed
        completed: willComplete
      });
      
      // Create a negative savings entry to reflect money taken from savings
      await apiRequest("POST", "/api/savings", {
        amount: -amountInPaise,
        source: "goal_allocation",
        date: new Date().toISOString(),
        notes: `Allocated to goal: ${goal.name}`
      });
      
      toast({
        title: "Funds allocated!",
        description: `Allocated ${formatCurrency(amountInPaise)} from savings to your goal "${goal.name}".`,
      });
      
      // Check if goal is now complete and award coins
      if (willComplete) {
        // Award 100 coins for completing a goal
        const coinsAwarded = 100;
        updateCoins(coinsAwarded);
        
        setShowCoinReward(true);
        setTimeout(() => setShowCoinReward(false), 3000);
        
        toast({
          title: "Goal achieved!",
          description: `Congratulations! You've reached your goal and earned ${coinsAwarded} coins!`,
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to allocate funds to goal. Please try again.",
      });
    } finally {
      setIsUpdating(false);
      setShowAllocationDialog(false);
    }
  };

  return (
    <>
      <Card className={goal.completed ? "border-success-DEFAULT bg-success-light/30" : ""}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{goal.name}</CardTitle>
              <CardDescription>
                {goal.completed 
                  ? "Completed"
                  : daysRemaining > 0
                    ? `${daysRemaining} days left`
                    : "Overdue"
                }
              </CardDescription>
            </div>
            {goal.completed && (
              <div className="bg-success-light p-2 rounded-full text-success-DEFAULT">
                <i className="fas fa-check"></i>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-medium">
                {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-end text-xs mt-1">
              <span 
                className={daysRemaining < 0 && !goal.completed ? "text-danger-DEFAULT" : "text-neutral-500"}
              >
                {progressPercentage}% complete
              </span>
            </div>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Start date:</span>
              <span>{startDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Target date:</span>
              <span>{targetDate}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => onEdit(goal)}>
            <i className="fas fa-edit mr-2"></i>
            Edit
          </Button>
          
          {!goal.completed ? (
            <>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleContribute}
                disabled={isUpdating}
              >
                <i className="fas fa-piggy-bank mr-2"></i>
                Allocate Funds
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleMarkComplete}
                disabled={isUpdating}
              >
                <i className="fas fa-check mr-2"></i>
                Mark Complete
              </Button>
            </>
          ) : (
            <div className="text-success-DEFAULT text-sm font-medium">
              <i className="fas fa-trophy mr-1"></i>
              Goal Achieved!
            </div>
          )}
        </CardFooter>
      </Card>
      
      {/* Custom allocation dialog */}
      <AllocationDialog 
        isOpen={showAllocationDialog}
        onClose={() => setShowAllocationDialog(false)}
        onConfirm={handleAllocationConfirm}
        availableSavings={availableSavings}
        goalName={goal.name}
      />
      
      {/* Coin reward animation */}
      {showCoinReward && (
        <CoinReward amount={100} message="Goal completed!" />
      )}
    </>
  );
}
