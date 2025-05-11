import { useEffect, useState } from "react";
import { Expense } from "@shared/schema";
import { format } from "date-fns";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { rupeeToStorageAmount } from "@/lib/expenseUtils";
import { categorizeExpense } from "@/lib/aiUtils";
import { Loader2 } from "lucide-react";

// Form schema for expense
const expenseSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  date: z.string()
    .min(1, "Date is required")
    .refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: "Date must be valid"
    }),
  status: z.enum(["necessary", "avoidable", "unnecessary"]),
  category: z.string().min(1, "Category is required"),
  paymentMode: z.enum(["upi", "debit_card", "credit_card", "cash", "wallet"]),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense;
}

const AddExpenseModal = ({ isOpen, onClose, expenseToEdit }: AddExpenseModalProps) => {
  const [categorizing, setCategorizing] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      status: "necessary",
      category: "",
      paymentMode: "upi",
      notes: "",
    },
  });

  // Set form values when editing expense
  useEffect(() => {
    if (expenseToEdit) {
      form.reset({
        name: expenseToEdit.name,
        amount: (expenseToEdit.amount / 100).toString(), // Convert from paise to rupees for display
        date: format(new Date(expenseToEdit.date), "yyyy-MM-dd"),
        status: expenseToEdit.status,
        category: expenseToEdit.category,
        paymentMode: expenseToEdit.paymentMode,
        notes: expenseToEdit.notes || "",
      });
    } else {
      form.reset({
        name: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        status: "necessary",
        category: "",
        paymentMode: "upi",
        notes: "",
      });
    }
  }, [expenseToEdit, isOpen, form]);

  // Auto-categorize expense based on name
  const handleNameChange = async (name: string) => {
    if (name.length < 3 || form.getValues("category")) return;
    
    setCategorizing(true);
    try {
      const category = await categorizeExpense(name);
      form.setValue("category", category, { shouldValidate: true });
    } catch (error) {
      console.error("Error categorizing expense:", error);
    } finally {
      setCategorizing(false);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      const expenseData = {
        ...data,
        amount: rupeeToStorageAmount(data.amount), // Convert to paise for storage
        // No need to manually convert date - the server will handle it
      };
      
      if (expenseToEdit) {
        // Update existing expense
        await apiRequest("PUT", `/api/expenses/${expenseToEdit.id}`, expenseData);
        toast({
          title: "Expense updated",
          description: "The expense has been successfully updated",
        });
      } else {
        // Create new expense
        await apiRequest("POST", "/api/expenses", expenseData);
        toast({
          title: "Expense added",
          description: "The expense has been successfully added",
        });
      }
      
      // Invalidate expenses query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${expenseToEdit ? 'update' : 'add'} expense. Please try again.`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {expenseToEdit ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
          <DialogDescription>
            {expenseToEdit ? "Update the details of your expense." : "Enter the details of your expense."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Grocery Shopping" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="necessary">Necessary</SelectItem>
                      <SelectItem value="avoidable">Avoidable</SelectItem>
                      <SelectItem value="unnecessary">Unnecessary</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="relative">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Food & Drinks">Food & Drinks</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {categorizing && (
                      <div className="absolute right-10 top-2">
                        <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    AI will auto-categorize based on expense name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea
                      placeholder="Add any additional notes"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {expenseToEdit ? "Update Expense" : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseModal;
