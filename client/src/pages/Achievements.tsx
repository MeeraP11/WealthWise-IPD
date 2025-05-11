import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/userContext";
import { Achievement } from "@shared/schema";
import { differenceInDays } from "date-fns";

const Achievements = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useUser();
  const { toast } = useToast();

  // Fetch achievements data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/achievements'],
  });

  // Handle errors
  if (error) {
    toast({
      variant: "destructive",
      title: "Error loading achievements",
      description: "Please try refreshing the page",
    });
  }

  // Check if achievement is new (within last 7 days)
  const isNewAchievement = (achievement: Achievement) => {
    const achievementDate = new Date(achievement.date);
    const daysDiff = differenceInDays(new Date(), achievementDate);
    return daysDiff <= 7;
  };

  // Filter achievements based on the active tab
  const getFilteredAchievements = () => {
    if (!data?.achievements) return [];
    
    if (activeTab === "all") return data.achievements;
    
    return data.achievements.filter((achievement: Achievement) => 
      achievement.type === activeTab
    );
  };

  const filteredAchievements = getFilteredAchievements();

  // Group achievements by type for stats
  const getAchievementStats = () => {
    if (!data?.achievements) return [];
    
    const typeCount: Record<string, number> = {};
    
    data.achievements.forEach((achievement: Achievement) => {
      if (!typeCount[achievement.type]) {
        typeCount[achievement.type] = 0;
      }
      typeCount[achievement.type]++;
    });
    
    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      label: getTypeLabel(type)
    }));
  };

  // Get a readable label for achievement type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "goal_met": return "Goals Met";
      case "savings_goal": return "Savings Goals";
      case "streak": return "Login Streaks";
      case "monthly_expense": return "Monthly Expense";
      default: return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  };

  // Calculate total coins earned from achievements
  const totalCoinsEarned = data?.achievements?.reduce(
    (sum: number, achievement: Achievement) => sum + achievement.coinsAwarded, 
    0
  ) || 0;

  return (
    <>
      <Header title="Achievements" />
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Your Achievements</h2>
            <p className="text-neutral-500">Track your financial milestones and rewards</p>
          </div>
        </div>

        {/* Achievement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Total Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : data?.achievements?.length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Total Coins Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    {totalCoinsEarned}
                    <i className="fas fa-coins text-warning-DEFAULT ml-2"></i>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    {user?.coins || 0}
                    <i className="fas fa-coins text-warning-DEFAULT ml-2"></i>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-500">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    {user?.streak || 0} days
                    <i className="fas fa-fire text-warning-DEFAULT ml-2"></i>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Categories */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Achievement Categories</CardTitle>
            <CardDescription>Your progress across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : getAchievementStats().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {getAchievementStats().map((stat, index) => (
                  <div key={index} className="border rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold mb-2">{stat.count}</div>
                    <div className="text-sm text-neutral-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500">
                <p>No achievements yet. Start completing goals to earn rewards!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements Grid */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-5 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="goal_met">Goals</TabsTrigger>
            <TabsTrigger value="savings_goal">Savings</TabsTrigger>
            <TabsTrigger value="streak">Streaks</TabsTrigger>
            <TabsTrigger value="monthly_expense">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : filteredAchievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAchievements.map((achievement: Achievement) => (
                  <AchievementCard 
                    key={achievement.id} 
                    achievement={achievement} 
                    isNew={isNewAchievement(achievement)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex justify-center mb-4 text-neutral-400">
                  <i className="fas fa-trophy text-5xl"></i>
                </div>
                <CardTitle className="mb-2">No Achievements Found</CardTitle>
                <CardDescription className="mb-6">
                  {activeTab === "all"
                    ? "You haven't earned any achievements yet. Complete goals and maintain streaks to earn rewards!"
                    : `You haven't earned any ${getTypeLabel(activeTab).toLowerCase()} achievements yet.`}
                </CardDescription>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Coins and Rewards Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Coins and Rewards Guide</CardTitle>
            <CardDescription>How to earn coins and unlock achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="bg-success-light p-2 rounded-full text-success-DEFAULT mr-2">
                    <i className="fas fa-bullseye"></i>
                  </div>
                  <h3 className="font-medium">Goals</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Earn 100 coins each time you complete a financial goal you've set.
                </p>
              </div>
              
              <div className="p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="bg-warning-light p-2 rounded-full text-warning-DEFAULT mr-2">
                    <i className="fas fa-fire"></i>
                  </div>
                  <h3 className="font-medium">Daily Streak</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Earn 15 coins each day you log in, plus 20 bonus coins for every 5 consecutive days.
                </p>
              </div>
              
              <div className="p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="bg-primary-light p-2 rounded-full text-primary mr-2">
                    <i className="fas fa-piggy-bank"></i>
                  </div>
                  <h3 className="font-medium">Savings</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Earn 5 coins each time you add money to your digital piggy bank.
                </p>
              </div>
              
              <div className="p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="bg-secondary-light p-2 rounded-full text-secondary-DEFAULT mr-2">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h3 className="font-medium">Weekly Saving</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  If you save a percentage of your avoidable expenses, earn that percentage in coins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Achievements;
