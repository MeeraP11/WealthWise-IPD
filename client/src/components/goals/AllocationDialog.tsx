import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/expenseUtils";

interface AllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  availableSavings: number;
  goalName: string;
}

export function AllocationDialog({
  isOpen,
  onClose,
  onConfirm,
  availableSavings,
  goalName
}: AllocationDialogProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive number");
      return;
    }
    
    // Convert to paise
    const amountInPaise = Math.round(amountNum * 100);
    
    if (amountInPaise > availableSavings) {
      setError(`You only have ${formatCurrency(availableSavings)} in savings. Please enter a smaller amount.`);
      return;
    }
    
    onConfirm(amountInPaise);
    setAmount("");
    setError("");
  };

  const handleClose = () => {
    setAmount("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Allocate Funds to Goal</DialogTitle>
          <DialogDescription>
            Enter amount to allocate from savings to your "{goalName}" goal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Available Savings:</span>
            <span className="font-semibold">{formatCurrency(availableSavings)}</span>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (₹)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
            />
            {error && <p className="text-sm text-danger-DEFAULT">{error}</p>}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Allocate Funds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}