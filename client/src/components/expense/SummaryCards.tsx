import { ArrowUp, ArrowDown, LightbulbIcon } from "lucide-react";
import { formatCurrency } from "@/lib/expenseUtils";

interface SummaryCardsProps {
  monthlyExpenses: number;
  savingsAmount: number;
  savingsGoal: number;
  percentageChange: number;
  potentialSavings: {
    weekly: number;
    avoidableAmount: number;
    unnecessaryAmount: number;
  };
}

const SummaryCards = ({
  monthlyExpenses,
  savingsAmount,
  savingsGoal,
  percentageChange,
  potentialSavings,
}: SummaryCardsProps) => {
  // Calculate percentage of savings goal achieved
  const savingsPercentage = (savingsAmount / savingsGoal) * 100;
  const limitedSavingsPercentage = Math.min(savingsPercentage, 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* This Month's Expenses */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-neutral-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-neutral-500">This Month's Expenses</p>
            <h3 className="text-2xl font-bold mt-1">
              {formatCurrency(monthlyExpenses)}
            </h3>
          </div>
          <div className={`p-2 rounded-md ${percentageChange > 0 ? 'bg-danger-light' : 'bg-success-light'}`}>
            {percentageChange > 0 ? (
              <ArrowUp className="text-danger-DEFAULT" />
            ) : (
              <ArrowDown className="text-success-DEFAULT" />
            )}
          </div>
        </div>
        <div className="flex items-center mt-2 text-xs">
          <span className={percentageChange > 0 ? 'text-danger-DEFAULT' : 'text-success-DEFAULT'}>
            <i className={`fas fa-arrow-${percentageChange > 0 ? 'up' : 'down'} mr-1`}></i>
            {Math.abs(percentageChange)}%
          </span>
          <span className="text-neutral-500 ml-2">vs. last month</span>
        </div>
        <div className="mt-3">
          <svg className="w-full h-12" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <path 
              className="fill-none stroke-primary stroke-2" 
              d="M0,20 L20,28 L40,18 L60,32 L80,15 L100,22 L120,10 L140,30 L160,5 L180,15 L200,12"
            />
          </svg>
        </div>
      </div>

      {/* Savings This Month */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-neutral-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-neutral-500">Savings This Month</p>
            <h3 className="text-2xl font-bold mt-1">{formatCurrency(savingsAmount)}</h3>
          </div>
          <div className="bg-success-light p-2 rounded-md">
            <i className="fas fa-piggy-bank text-success-DEFAULT"></i>
          </div>
        </div>
        <div className="flex items-center mt-2 text-xs">
          <span className="text-success-DEFAULT">
            <i className="fas fa-arrow-up mr-1"></i>
            {savingsPercentage.toFixed(1)}%
          </span>
          <span className="text-neutral-500 ml-2">of monthly goal</span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Goal: {formatCurrency(savingsGoal)}</span>
            <span>{limitedSavingsPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div 
              className="bg-success-DEFAULT rounded-full h-2" 
              style={{ width: `${limitedSavingsPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-neutral-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-neutral-500">Potential Weekly Savings</p>
            <h3 className="text-2xl font-bold mt-1">
              {formatCurrency(potentialSavings.weekly)}
            </h3>
          </div>
          <div className="bg-secondary-light p-2 rounded-md">
            <LightbulbIcon className="text-secondary-DEFAULT" />
          </div>
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          AI recommends cutting expenses on:
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center text-sm">
            <span className="w-3 h-3 rounded-full bg-danger-DEFAULT mr-2"></span>
            <span>Unnecessary: {formatCurrency(potentialSavings.unnecessaryAmount)}</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="w-3 h-3 rounded-full bg-warning-DEFAULT mr-2"></span>
            <span>Avoidable: {formatCurrency(potentialSavings.avoidableAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
