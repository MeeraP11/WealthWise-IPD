import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { rupeeToStorageAmount } from "@/lib/expenseUtils";
import { useUser } from "@/lib/userContext";

// Form schema
const savingsSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  notes: z.string().optional(),
});

type SavingsFormValues = z.infer<typeof savingsSchema>;

export function PiggyBank() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { updateCoins } = useUser();

  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      amount: "",
      notes: "",
    },
  });

  const onSubmit = async (data: SavingsFormValues) => {
    setIsSubmitting(true);
    try {
      const savingData = {
        amount: rupeeToStorageAmount(data.amount), // Convert to paise
        source: "piggy_bank",
        date: new Date().toISOString(),
        notes: data.notes,
      };

      const response = await apiRequest("POST", "/api/savings", savingData);
      const result = await response.json();

      // Update user coins if coins were awarded
      if (result.coinsAwarded) {
        updateCoins(result.coinsAwarded);
        toast({
          title: "Coins earned!",
          description: `You earned ${result.coinsAwarded} coins for saving money!`,
        });
      }

      toast({
        title: "Savings added!",
        description: `₹${data.amount} has been added to your savings.`,
      });

      // Reset form
      form.reset();

      // Refresh related data
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add savings. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-piggy-bank text-primary"></i>
          Digital Piggy Bank
        </CardTitle>
        <CardDescription>
          Add money to your savings and earn 5 coins each time!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center my-2">
          <div className="w-32 h-32 rounded-full bg-primary-light flex items-center justify-center border-4 border-primary">
            <div className="text-center">
              <i className="fas fa-coins text-3xl text-warning-DEFAULT mb-2"></i>
              <p className="text-sm font-medium text-primary-dark">+5 coins</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Enter the amount you want to save</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="What are you saving for?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-circle-notch fa-spin mr-2"></i>
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Add to Savings
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-neutral-500 justify-center">
        Every time you add savings, you earn 5 coins!
      </CardFooter>
    </Card>
  );
}
