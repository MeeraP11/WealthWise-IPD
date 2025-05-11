import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { categorizeExpense, determineExpenseStatus, generateSavingsTips } from "./ai";
import { z } from "zod";
import {
  loginSchema,
  insertUserSchema,
  insertExpenseSchema,
  insertSavingsSchema,
  insertGoalSchema,
  insertAchievementSchema,
  insertPredictionSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import passport from "passport";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup authentication and session management
  setupAuth(app);
  
  // Error handling middleware for Zod validation errors
  const handleZodError = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      // Get detailed error information from Zod
      const validationError = fromZodError(err);
      console.log("Validation error details:", JSON.stringify(err.errors, null, 2));
      
      // Construct a user-friendly message
      const fieldErrors = err.errors.map(e => {
        const path = e.path.join('.');
        return `${path}: ${e.message}`;
      }).join(', ');
      
      return res.status(400).json({
        message: `Validation error: ${fieldErrors}`,
        details: validationError.details
      });
    }
    
    console.error("Non-Zod error in validation:", err);
    return res.status(500).json({ message: "Internal server error" });
  };
  
  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Routes definition
  
  // AUTH ROUTES - using routes from auth.ts module
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const credentials = loginSchema.parse(req.body);
      next();
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.post("/api/auth/register", (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      next();
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  // EXPENSE ROUTES
  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let startDate, endDate;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        
        const expenses = await storage.getExpensesByDateRange(user.id, startDate, endDate);
        res.status(200).json({ expenses });
      } else {
        const expenses = await storage.getExpenses(user.id);
        res.status(200).json({ expenses });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching expenses" });
    }
  });
  
  app.post("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Process the request body
      const reqBody = { ...req.body, userId: user.id };
      
      // Our schema will handle date conversion, but let's make sure it gets parsed properly
      if (reqBody.date && typeof reqBody.date === 'string') {
        try {
          // Try to create a valid date object
          const dateObj = new Date(reqBody.date);
          if (!isNaN(dateObj.getTime())) { // Check if it's a valid date
            reqBody.date = dateObj;
          }
        } catch (e) {
          console.error("Date parsing error:", e);
          // If parsing fails, we'll let Zod handle the validation error
        }
      }
      
      // If category is not provided, use AI to categorize based on expense name
      if (!reqBody.category && reqBody.name) {
        try {
          reqBody.category = await categorizeExpense(reqBody.name);
        } catch (e) {
          console.error("AI categorization error:", e);
          // Default to "other" if AI categorization fails
          reqBody.category = "other";
        }
      }
      
      // If status is not provided, use AI to determine status based on name, category, and amount
      if (!reqBody.status && reqBody.name && reqBody.category && reqBody.amount) {
        try {
          reqBody.status = await determineExpenseStatus(reqBody.name, reqBody.category, reqBody.amount);
        } catch (e) {
          console.error("AI status determination error:", e);
          // Default to "avoidable" if AI status determination fails
          reqBody.status = "avoidable";
        }
      }
      
      const expenseData = insertExpenseSchema.parse(reqBody);
      
      const newExpense = await storage.createExpense(expenseData);
      
      // Add coins for logging expenses
      let coinsAwarded = 0;
      
      // Award coins for first expenses of the day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayExpenses = await storage.getExpensesByDateRange(user.id, today, tomorrow);
      
      if (todayExpenses.length === 1) { // This is the first expense today
        coinsAwarded = 10;
        
        await storage.updateUser(user.id, {
          coins: (user.coins || 0) + coinsAwarded
        });
        
        const updatedUser = await storage.getUser(user.id);
        res.status(201).json({ 
          expense: newExpense,
          coinsAwarded,
          user: {
            coins: updatedUser?.coins || 0
          }
        });
      } else {
        res.status(201).json({ expense: newExpense });
      }
    } catch (error) {
      console.error("Expense creation error:", error);
      handleZodError(error, res);
    }
  });
  
  app.put("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const expenseId = parseInt(req.params.id);
      
      // Verify ownership
      const expense = await storage.getExpenseById(expenseId);
      if (!expense || expense.userId !== user.id) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Process the date field if it's a string
      const reqBody = { ...req.body };
      if (reqBody.date && typeof reqBody.date === 'string') {
        reqBody.date = new Date(reqBody.date);
      }
      
      // Validate data - allow partial updates
      const schemaKeys = Object.keys(insertExpenseSchema.shape).filter(key => key !== "userId");
      const filteredBody = Object.fromEntries(
        Object.entries(reqBody).filter(([key]) => schemaKeys.includes(key))
      );
      
      const updatedExpense = await storage.updateExpense(expenseId, filteredBody);
      res.status(200).json({ expense: updatedExpense });
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const expenseId = parseInt(req.params.id);
      
      // Verify ownership
      const expense = await storage.getExpenseById(expenseId);
      if (!expense || expense.userId !== user.id) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      const success = await storage.deleteExpense(expenseId);
      if (success) {
        res.status(200).json({ message: "Expense deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete expense" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting expense" });
    }
  });
  
  // SAVINGS ROUTES
  app.get("/api/savings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let startDate, endDate;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        
        const savings = await storage.getSavingsByDateRange(user.id, startDate, endDate);
        res.status(200).json({ savings });
      } else {
        const savings = await storage.getSavings(user.id);
        res.status(200).json({ savings });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching savings" });
    }
  });
  
  app.post("/api/savings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const savingData = insertSavingsSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const newSaving = await storage.createSaving(savingData);
      
      // Award 5 coins for piggy bank savings
      if (savingData.source === "piggy_bank") {
        const updatedUser = await storage.updateUser(user.id, {
          coins: (user.coins || 0) + 5
        });
        
        res.status(201).json({ 
          saving: newSaving,
          coinsAwarded: 5,
          user: {
            coins: updatedUser?.coins || 0
          }
        });
      } else {
        res.status(201).json({ saving: newSaving });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.delete("/api/savings/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const savingId = parseInt(req.params.id);
      
      // Verify ownership (would need to add a getSavingById method to the storage)
      const savings = await storage.getSavings(user.id);
      const saving = savings.find(s => s.id === savingId);
      
      if (!saving) {
        return res.status(404).json({ message: "Saving not found" });
      }
      
      const success = await storage.deleteSaving(savingId);
      if (success) {
        res.status(200).json({ message: "Saving deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete saving" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting saving" });
    }
  });
  
  // GOALS ROUTES
  app.get("/api/goals", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const goals = await storage.getGoals(user.id);
      res.status(200).json({ goals });
    } catch (error) {
      res.status(500).json({ message: "Error fetching goals" });
    }
  });
  
  app.post("/api/goals", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const newGoal = await storage.createGoal(goalData);
      res.status(201).json({ goal: newGoal });
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.put("/api/goals/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const goalId = parseInt(req.params.id);
      
      // Verify ownership
      const goal = await storage.getGoalById(goalId);
      if (!goal || goal.userId !== user.id) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Handle goal achievement if completed status is changing
      let coinsAwarded = 0;
      if (req.body.completed === true && !goal.completed) {
        coinsAwarded = 100;
        
        // Update user coins
        await storage.updateUser(user.id, {
          coins: (user.coins || 0) + coinsAwarded
        });
        
        // Create achievement
        await storage.createAchievement({
          userId: user.id,
          type: "goal_met",
          name: `Goal Achieved: ${goal.name}`,
          description: `You've successfully reached your goal of ${goal.name}!`,
          date: new Date(),
          coinsAwarded
        });
      }
      
      const updatedGoal = await storage.updateGoal(goalId, req.body);
      
      if (coinsAwarded > 0) {
        const updatedUser = await storage.getUser(user.id);
        res.status(200).json({ 
          goal: updatedGoal,
          coinsAwarded,
          user: {
            coins: updatedUser?.coins || 0
          }
        });
      } else {
        res.status(200).json({ goal: updatedGoal });
      }
    } catch (error) {
      handleZodError(error, res);
    }
  });
  
  app.delete("/api/goals/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const goalId = parseInt(req.params.id);
      
      // Verify ownership
      const goal = await storage.getGoalById(goalId);
      if (!goal || goal.userId !== user.id) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const success = await storage.deleteGoal(goalId);
      if (success) {
        res.status(200).json({ message: "Goal deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete goal" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting goal" });
    }
  });
  
  // ACHIEVEMENTS ROUTES
  app.get("/api/achievements", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const achievements = await storage.getAchievements(user.id);
      res.status(200).json({ achievements });
    } catch (error) {
      res.status(500).json({ message: "Error fetching achievements" });
    }
  });
  
  // PREDICTIONS ROUTES
  app.get("/api/predictions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const predictions = await storage.getPredictions(user.id);
      res.status(200).json({ predictions });
    } catch (error) {
      res.status(500).json({ message: "Error fetching predictions" });
    }
  });
  
  app.post("/api/predictions/generate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get all user expenses
      const expenses = await storage.getExpenses(user.id);
      
      if (expenses.length === 0) {
        return res.status(400).json({ message: "Not enough expense data to generate prediction" });
      }
      
      // Simple prediction logic based on average
      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const avgAmount = Math.round(totalAmount / expenses.length);
      
      // Group expenses by category for category predictions
      const categoriesMap = new Map<string, number>();
      expenses.forEach(expense => {
        const currentAmount = categoriesMap.get(expense.category) || 0;
        categoriesMap.set(expense.category, currentAmount + expense.amount);
      });
      
      // Convert to JSON-serializable object
      const categoriesObj: Record<string, number> = {};
      categoriesMap.forEach((amount, category) => {
        categoriesObj[category] = amount;
      });
      
      // Get the current month in YYYY-MM format
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const month = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if a prediction already exists for this month
      const existingPrediction = await storage.getPredictionByMonth(user.id, month);
      
      let prediction;
      if (existingPrediction) {
        // Update existing prediction
        prediction = await storage.updatePrediction(existingPrediction.id, {
          predictedAmount: avgAmount,
          categories: categoriesObj
        });
      } else {
        // Create new prediction
        prediction = await storage.createPrediction({
          userId: user.id,
          month,
          predictedAmount: avgAmount,
          categories: categoriesObj
        });
      }
      
      res.status(200).json({ prediction });
    } catch (error) {
      res.status(500).json({ message: "Error generating prediction" });
    }
  });
  
  // DASHBOARD SUMMARY ROUTE
  app.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get current date ranges
      const today = new Date();
      
      // Current month range
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Previous month range
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Get expenses for current and previous months
      const currentMonthExpenses = await storage.getExpensesByDateRange(
        user.id, 
        currentMonthStart, 
        currentMonthEnd
      );
      
      const prevMonthExpenses = await storage.getExpensesByDateRange(
        user.id,
        prevMonthStart,
        prevMonthEnd
      );
      
      // Calculate totals
      const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate percentageChange
      let percentageChange = 0;
      if (prevMonthTotal > 0) {
        percentageChange = Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
      }
      
      // Get savings for current month
      const currentMonthSavings = await storage.getSavingsByDateRange(
        user.id,
        currentMonthStart,
        currentMonthEnd
      );
      
      const savingsTotal = currentMonthSavings.reduce((sum, saving) => sum + saving.amount, 0);
      
      // Calculate avoidable and unnecessary expenses for AI recommendation
      const avoidableExpenses = currentMonthExpenses
        .filter(expense => expense.status === "avoidable")
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      const unnecessaryExpenses = currentMonthExpenses
        .filter(expense => expense.status === "unnecessary")
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate weekly potential savings (divide by 4 for rough weekly estimate)
      const potentialWeeklySavings = Math.round((avoidableExpenses + unnecessaryExpenses) / 4);
      
      // Get current goals
      const goals = await storage.getGoals(user.id);
      
      // Get achievements
      const achievements = await storage.getAchievements(user.id);
      const newAchievements = achievements.filter(
        achievement => new Date(achievement.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      res.status(200).json({
        summary: {
          currentMonthExpenses: currentMonthTotal,
          percentageChange,
          monthlyChange: currentMonthTotal - prevMonthTotal,
          savingsTotal,
          potentialWeeklySavings,
          avoidable: avoidableExpenses,
          unnecessary: unnecessaryExpenses,
          goalCount: goals.length,
          completedGoals: goals.filter(goal => goal.completed).length,
          newAchievements: newAchievements.length
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard summary" });
    }
  });
  
  // AI Route for categorizing expenses based on name using OpenAI
  app.post("/api/ai/categorize", isAuthenticated, async (req, res) => {
    try {
      const { expenseName } = req.body;
      
      if (!expenseName) {
        return res.status(400).json({ message: "Expense name is required" });
      }
      
      // Use OpenAI to categorize the expense
      const category = await categorizeExpense(expenseName);
      
      res.status(200).json({ category });
    } catch (error) {
      res.status(500).json({ message: "Error categorizing expense" });
    }
  });
  
  // MONTHLY REPORT API ENDPOINT
  app.get("/api/monthly-report", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const now = new Date();
      
      // Get the target month (default to current month if not specified)
      const targetMonth = req.query.month ? parseInt(req.query.month as string) : now.getMonth();
      const targetYear = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
      
      // Calculate date ranges for the target month
      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);
      
      // Get previous month for comparison
      const startOfPrevMonth = new Date(targetYear, targetMonth - 1, 1);
      const endOfPrevMonth = new Date(targetYear, targetMonth, 0);
      
      // Format month name for display
      const monthName = startOfMonth.toLocaleString('default', { month: 'long' });
      
      // Get expenses directly with date range filter for real-time data
      const monthExpenses = await storage.getExpensesByDateRange(user.id, startOfMonth, endOfMonth);
      const prevMonthExpenses = await storage.getExpensesByDateRange(user.id, startOfPrevMonth, endOfPrevMonth);
      
      // Calculate totals
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const prevMonthTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      // Get expense breakdown by category
      const expensesByCategory: Record<string, number> = {};
      monthExpenses.forEach(expense => {
        if (!expensesByCategory[expense.category]) {
          expensesByCategory[expense.category] = 0;
        }
        expensesByCategory[expense.category] += expense.amount;
      });
      
      // Convert to array and sort by amount
      const categoryBreakdown = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({ 
          category, 
          amount,
          percentage: Math.round((amount / totalExpenses) * 100) 
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Get expense breakdown by status
      const expensesByStatus: Record<string, number> = {};
      monthExpenses.forEach(expense => {
        if (!expensesByStatus[expense.status]) {
          expensesByStatus[expense.status] = 0;
        }
        expensesByStatus[expense.status] += expense.amount;
      });
      
      // Convert status breakdown to array
      const statusBreakdown = Object.entries(expensesByStatus)
        .map(([status, amount]) => ({ 
          status, 
          amount,
          percentage: Math.round((amount / totalExpenses) * 100) 
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Get savings for the month with date range filter for real-time data
      const monthSavings = await storage.getSavingsByDateRange(user.id, startOfMonth, endOfMonth);
      
      const totalSavings = monthSavings.reduce((sum, s) => sum + s.amount, 0);
      
      // Get goals progress
      const goals = await storage.getGoals(user.id);
      const activeGoals = goals.filter(g => !g.completed);
      
      // For completed goals, use completed flag and check if targetDate is in this month
      // This is a simplification - in a real app, we would track the actual completion date
      const completedGoals = goals.filter(g => {
        if (!g.completed) return false;
        const targetDate = new Date(g.targetDate);
        return targetDate >= startOfMonth && targetDate <= endOfMonth;
      });
      
      // Get achievements earned this month
      const achievements = await storage.getAchievements(user.id);
      const monthAchievements = achievements.filter(a => {
        const achieveDate = new Date(a.date);
        return achieveDate >= startOfMonth && achieveDate <= endOfMonth;
      });
      
      // Calculate percentages and trends
      const expenseChange = prevMonthTotal > 0 
        ? ((totalExpenses - prevMonthTotal) / prevMonthTotal) * 100 
        : 0;
      
      // Calculate income to expense ratio (using savings as proxy for income)
      const incomeProxy = totalExpenses + totalSavings;
      const savingsRate = incomeProxy > 0 ? (totalSavings / incomeProxy) * 100 : 0;
      
      // Generate insights based on the data
      const insights = [];
      
      // Spending insights
      if (expenseChange > 10) {
        insights.push(`Your spending increased by ${Math.round(expenseChange)}% compared to last month. Consider reviewing your budget.`);
      } else if (expenseChange < -10) {
        insights.push(`Great job! You reduced your spending by ${Math.round(Math.abs(expenseChange))}% compared to last month.`);
      }
      
      // Category insights
      if (categoryBreakdown.length > 0) {
        const topCategory = categoryBreakdown[0];
        insights.push(`Your largest expense category was ${topCategory.category} at ${topCategory.percentage}% of your total spending.`);
        
        // Potential savings opportunity
        if (topCategory.category !== 'housing' && topCategory.percentage > 30) {
          insights.push(`You might be overspending on ${topCategory.category}. This category makes up ${topCategory.percentage}% of your expenses.`);
        }
      }
      
      // Status insights
      const unnecessarySpending = expensesByStatus['unnecessary'] || 0;
      if (unnecessarySpending > 0) {
        const unnecessaryPercent = Math.round((unnecessarySpending / totalExpenses) * 100);
        if (unnecessaryPercent > 20) {
          insights.push(`${unnecessaryPercent}% of your spending was on unnecessary items. This could be an opportunity to save more.`);
        }
      }
      
      // Savings insights
      if (savingsRate < 10) {
        insights.push(`Your savings rate was ${Math.round(savingsRate)}% this month. Financial experts recommend saving at least 20% of your income.`);
      } else if (savingsRate > 20) {
        insights.push(`Excellent! You saved ${Math.round(savingsRate)}% of your income this month, which exceeds the recommended 20%.`);
      }
      
      // Goal insights
      if (completedGoals.length > 0) {
        insights.push(`Congratulations! You completed ${completedGoals.length} financial goals this month.`);
      }
      
      if (activeGoals.length > 0) {
        insights.push(`You're actively working towards ${activeGoals.length} financial goals.`);
      }
      
      // Achievement insights
      if (monthAchievements.length > 0) {
        insights.push(`You earned ${monthAchievements.length} achievements this month!`);
      }
      
      // Final report with all data
      res.status(200).json({
        monthName,
        year: targetYear,
        expenses: {
          total: totalExpenses,
          count: monthExpenses.length,
          change: Math.round(expenseChange),
          byCategory: categoryBreakdown,
          byStatus: statusBreakdown
        },
        savings: {
          total: totalSavings,
          count: monthSavings.length,
          savingsRate: Math.round(savingsRate)
        },
        goals: {
          active: activeGoals.length,
          completed: completedGoals.length,
          completedDetails: completedGoals.map(g => ({
            name: g.name,
            targetAmount: g.targetAmount,
            completedDate: g.targetDate // Using targetDate as a proxy for completion date
          }))
        },
        achievements: {
          count: monthAchievements.length,
          details: monthAchievements.map(a => ({
            name: a.name,
            type: a.type,
            date: a.date,
            coinsAwarded: a.coinsAwarded
          }))
        },
        insights: insights
      });
    } catch (error) {
      console.error("Monthly report error:", error);
      res.status(500).json({ message: "Error generating monthly report" });
    }
  });

  // AI Route for generating savings tips based on expense data
  app.get("/api/ai/savings-tips", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Get expenses from the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const expenses = await storage.getExpensesByDateRange(user.id, startDate, endDate);
      
      if (!expenses.length) {
        return res.status(200).json({ 
          tips: [
            "Start tracking your expenses to get personalized savings tips.",
            "Try creating a budget to manage your finances better.",
            "Consider setting up savings goals to stay motivated."
          ]
        });
      }
      
      // Use OpenAI to generate savings tips
      const tips = await generateSavingsTips(expenses);
      
      res.status(200).json({ tips });
    } catch (error) {
      console.error("Error generating savings tips:", error);
      res.status(500).json({ message: "Error generating savings tips" });
    }
  });
  
  return httpServer;
}
