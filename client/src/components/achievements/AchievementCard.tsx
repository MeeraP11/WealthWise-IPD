import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Achievement } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AchievementCardProps {
  achievement: Achievement;
  isNew?: boolean;
}

export function AchievementCard({ achievement, isNew = false }: AchievementCardProps) {
  // Get the icon based on achievement type
  const getIcon = (type: string) => {
    switch (type) {
      case "goal_met":
        return "fa-trophy";
      case "savings_goal":
        return "fa-piggy-bank";
      case "streak":
        return "fa-fire";
      case "monthly_expense":
        return "fa-chart-line";
      default:
        return "fa-medal";
    }
  };

  // Get the background color based on achievement type
  const getBgColor = (type: string) => {
    switch (type) {
      case "goal_met":
        return "bg-success-light";
      case "savings_goal":
        return "bg-primary-light";
      case "streak":
        return "bg-warning-light";
      case "monthly_expense":
        return "bg-secondary-light";
      default:
        return "bg-neutral-100";
    }
  };

  // Get the text color based on achievement type
  const getTextColor = (type: string) => {
    switch (type) {
      case "goal_met":
        return "text-success-DEFAULT";
      case "savings_goal":
        return "text-primary";
      case "streak":
        return "text-warning-DEFAULT";
      case "monthly_expense":
        return "text-secondary-DEFAULT";
      default:
        return "text-neutral-600";
    }
  };

  const bgColor = getBgColor(achievement.type);
  const textColor = getTextColor(achievement.type);
  const icon = getIcon(achievement.type);
  const timeAgo = formatDistanceToNow(new Date(achievement.date), { addSuffix: true });

  return (
    <Card className={`${isNew ? 'border-warning-DEFAULT' : ''} relative overflow-hidden transition-all hover:shadow-md`}>
      {isNew && (
        <div className="absolute top-0 right-0">
          <div className="bg-warning-DEFAULT text-white text-xs px-2 py-1 transform rotate-45 translate-y-2 translate-x-6">
            New
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{achievement.name}</CardTitle>
            <CardDescription>{timeAgo}</CardDescription>
          </div>
          <div className={`p-3 rounded-full ${bgColor} ${textColor}`}>
            <i className={`fas ${icon}`}></i>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600">{achievement.description}</p>
        <div className="mt-4 flex items-center">
          <div className="bg-warning-light text-warning-DEFAULT px-3 py-1 rounded-full flex items-center text-sm">
            <i className="fas fa-coins mr-2"></i>
            <span>+{achievement.coinsAwarded} coins earned</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
