import { Progress } from "@/components/ui/progress";

interface StreakTrackerProps {
  streak: number;
}

export function StreakTracker({ streak }: StreakTrackerProps) {
  // Calculate days until next bonus (every consecutive 5 days)
  const daysUntilBonus = 5 - (streak % 5);
  const streakProgress = ((5 - daysUntilBonus) / 5) * 100;
  
  // Generate streak dots
  const generateStreakDots = () => {
    const dots = [];
    const maxDots = 7; // We'll show max 7 dots
    
    for (let i = 0; i < maxDots; i++) {
      if (i < streak % 7) {
        // Completed day
        dots.push(
          <div key={i} className="w-4 h-4 mx-0.5 rounded-full bg-warning-DEFAULT text-white flex items-center justify-center text-xs">
            <i className="fas fa-check"></i>
          </div>
        );
      } else if (i === streak % 7) {
        // Current day (in progress)
        dots.push(
          <div key={i} className="w-4 h-4 mx-0.5 rounded-full bg-neutral-300 flex items-center justify-center text-xs">
            <i className="fas fa-ellipsis text-neutral-500"></i>
          </div>
        );
      } else {
        // Future day
        dots.push(
          <div key={i} className="w-4 h-4 mx-0.5 rounded-full bg-neutral-300 flex items-center justify-center text-xs"></div>
        );
      }
    }
    
    return dots;
  };
  
  return (
    <div className="p-3 bg-warning-light rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-700">Daily Streak</p>
          <p className="text-xs text-neutral-500">Keep logging in!</p>
        </div>
        <div className="flex">
          {generateStreakDots()}
        </div>
      </div>
      <div className="mt-2 text-xs">
        <div className="flex justify-between items-center">
          <span>{streak} days</span>
          <span className="text-warning-DEFAULT font-medium">+15 coins per day</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-1">
          <div 
            className="bg-warning-DEFAULT rounded-full h-1.5" 
            style={{ width: `${streakProgress}%` }}
          ></div>
        </div>
        <div className="text-right text-neutral-500 text-xs mt-1">
          Next bonus: {daysUntilBonus} day{daysUntilBonus !== 1 ? 's' : ''} (20 coins)
        </div>
      </div>
    </div>
  );
}
