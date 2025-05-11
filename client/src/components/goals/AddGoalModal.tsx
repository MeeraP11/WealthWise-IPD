import { useEffect } from "react";
import { Goal } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { format, addMonths } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { rupeeToStorageAmount } from "@/lib/expenseUtils";

// Form schema
const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.string().min(1, "Target amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  targetDate: z.string().min(1, "Target date is required"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal;
}

export function AddGoalModal({ isOpen, onClose, goalToEdit }: AddGoalModalProps) {
  const { toast } = useToast();
  
  // Default to 3 months from now
  const defaultTargetDate = format(addMonths(new Date(), 3), "yyyy-MM-dd");
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      targetDate: defaultTargetDate,
    },
  });
  
  // Pre-fill form when editing
  useEffect(() => {
    if (goalToEdit) {
      form.reset({
        name: goalToEdit.name,
        targetAmount: (goalToEdit.targetAmount / 100).toString(), // Convert from paise to rupees
        targetDate: format(new Date(goalToEdit.targetDate), "yyyy-MM-dd"),
      });
    } else {
      form.reset({
        name: "",
        targetAmount: "",
        targetDate: defaultTargetDate,
      });
    }
  }, [goalToEdit, isOpen, form, defaultTargetDate]);
  
  const onSubmit = async (data: GoalFormValues) => {
    try {
      const goalData = {
        name: data.name,
        targetAmount: rupeeToStorageAmount(data.targetAmount), // Convert to paise
        targetDate: new Date(data.targetDate).toISOString(),
        startDate: goalToEdit?.startDate || new Date().toISOString(),
      };
      
      if (goalToEdit) {
        // Update existing goal
        await apiRequest("PUT", `/api/goals/${goalToEdit.id}`, goalData);
        toast({
          title: "Goal updated",
          description: "Your goal has been successfully updated.",
        });
      } else {
        // Create new goal
        await apiRequest("POST", "/api/goals", goalData);
        toast({
          title: "Goal created",
          description: "Your new goal has been created.",
        });
      }
      
      // Refresh goals data
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${goalToEdit ? 'update' : 'create'} goal. Please try again.`,
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {goalToEdit ? "Edit Goal" : "Add New Goal"}
          </DialogTitle>
          <DialogDescription>
            {goalToEdit ? "Update your financial goal details." : "Set a new financial goal to track your progress."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. New Laptop, Emergency Fund, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>
                    How much do you need to save for this goal?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When do you want to achieve this goal?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {goalToEdit ? "Update Goal" : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
