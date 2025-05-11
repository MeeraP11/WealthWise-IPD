import {
  users, expenses, savings, goals, achievements, predictions,
  type User, type Expense, type Saving, type Goal, type Achievement, type Prediction,
  type InsertUser, type InsertExpense, type InsertSaving, type InsertGoal, type InsertAchievement, type InsertPrediction
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, lte, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined>;
  
  // Expense operations
  getExpenses(userId: number): Promise<Expense[]>;
  getExpensesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<Omit<Expense, "id">>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Savings operations
  getSavings(userId: number): Promise<Saving[]>;
  getSavingsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Saving[]>;
  createSaving(saving: InsertSaving): Promise<Saving>;
  deleteSaving(id: number): Promise<boolean>;
  
  // Goals operations
  getGoals(userId: number): Promise<Goal[]>;
  getGoalById(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, data: Partial<Omit<Goal, "id">>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  // Achievements operations
  getAchievements(userId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // Predictions operations
  getPredictions(userId: number): Promise<Prediction[]>;
  getPredictionByMonth(userId: number, month: string): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: number, data: Partial<Omit<Prediction, "id">>): Promise<Prediction | undefined>;

  // Session store
  sessionStore: session.Store;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private expenses: Map<number, Expense>;
  private savings: Map<number, Saving>;
  private goals: Map<number, Goal>;
  private achievements: Map<number, Achievement>;
  private predictions: Map<number, Prediction>;
  
  public sessionStore: session.Store;
  
  private userIdCounter: number;
  private expenseIdCounter: number;
  private savingIdCounter: number;
  private goalIdCounter: number;
  private achievementIdCounter: number;
  private predictionIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.expenses = new Map();
    this.savings = new Map();
    this.goals = new Map();
    this.achievements = new Map();
    this.predictions = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    this.userIdCounter = 1;
    this.expenseIdCounter = 1;
    this.savingIdCounter = 1;
    this.goalIdCounter = 1;
    this.achievementIdCounter = 1;
    this.predictionIdCounter = 1;
    
    // Add a default user for testing
    this.createUser({
      username: "demo",
      password: "password",
      name: "Rahul Kumar",
      coins: 750,
      streak: 4,
      lastLogin: new Date()
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      coins: user.coins ?? 0,
      streak: user.streak ?? 0,
      lastLogin: user.lastLogin ?? new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Expense operations
  async getExpenses(userId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getExpensesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => 
        expense.userId === userId && 
        new Date(expense.date) >= startDate && 
        new Date(expense.date) <= endDate
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getExpenseById(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.expenseIdCounter++;
    const newExpense: Expense = { 
      ...expense, 
      id,
      notes: expense.notes ?? null
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }
  
  async updateExpense(id: number, data: Partial<Omit<Expense, "id">>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...data };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }
  
  // Savings operations
  async getSavings(userId: number): Promise<Saving[]> {
    return Array.from(this.savings.values())
      .filter(saving => saving.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getSavingsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Saving[]> {
    return Array.from(this.savings.values())
      .filter(saving => 
        saving.userId === userId && 
        new Date(saving.date) >= startDate && 
        new Date(saving.date) <= endDate
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async createSaving(saving: InsertSaving): Promise<Saving> {
    const id = this.savingIdCounter++;
    const newSaving: Saving = { 
      ...saving, 
      id,
      notes: saving.notes ?? null
    };
    this.savings.set(id, newSaving);
    return newSaving;
  }
  
  async deleteSaving(id: number): Promise<boolean> {
    return this.savings.delete(id);
  }
  
  // Goals operations
  async getGoals(userId: number): Promise<Goal[]> {
    return Array.from(this.goals.values())
      .filter(goal => goal.userId === userId)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }
  
  async getGoalById(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }
  
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const id = this.goalIdCounter++;
    const newGoal: Goal = { ...goal, id, currentAmount: 0, completed: false };
    this.goals.set(id, newGoal);
    return newGoal;
  }
  
  async updateGoal(id: number, data: Partial<Omit<Goal, "id">>): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...data };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  async deleteGoal(id: number): Promise<boolean> {
    return this.goals.delete(id);
  }
  
  // Achievements operations
  async getAchievements(userId: number): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const id = this.achievementIdCounter++;
    const newAchievement: Achievement = { 
      ...achievement, 
      id,
      coinsAwarded: achievement.coinsAwarded ?? 0
    };
    this.achievements.set(id, newAchievement);
    return newAchievement;
  }
  
  // Predictions operations
  async getPredictions(userId: number): Promise<Prediction[]> {
    return Array.from(this.predictions.values())
      .filter(prediction => prediction.userId === userId)
      .sort((a, b) => a.month.localeCompare(b.month));
  }
  
  async getPredictionByMonth(userId: number, month: string): Promise<Prediction | undefined> {
    return Array.from(this.predictions.values())
      .find(prediction => prediction.userId === userId && prediction.month === month);
  }
  
  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const id = this.predictionIdCounter++;
    const newPrediction: Prediction = { ...prediction, id, actualAmount: null };
    this.predictions.set(id, newPrediction);
    return newPrediction;
  }
  
  async updatePrediction(id: number, data: Partial<Omit<Prediction, "id">>): Promise<Prediction | undefined> {
    const prediction = this.predictions.get(id);
    if (!prediction) return undefined;
    
    const updatedPrediction = { ...prediction, ...data };
    this.predictions.set(id, updatedPrediction);
    return updatedPrediction;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Expense operations
  async getExpenses(userId: number): Promise<Expense[]> {
    return db.select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async getExpensesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    return db.select()
      .from(expenses)
      .where(
        eq(expenses.userId, userId)
      )
      .orderBy(desc(expenses.date))
      .then(expenses => 
        expenses.filter(expense => 
          expense.date >= startDate && 
          expense.date <= endDate
        )
      );
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const result = await db.select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return result[0];
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses)
      .values(expense)
      .returning();
    return result[0];
  }

  async updateExpense(id: number, data: Partial<Omit<Expense, "id">>): Promise<Expense | undefined> {
    const result = await db.update(expenses)
      .set(data)
      .where(eq(expenses.id, id))
      .returning();
    return result[0];
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses)
      .where(eq(expenses.id, id));
    return !!result;
  }

  // Savings operations
  async getSavings(userId: number): Promise<Saving[]> {
    return db.select()
      .from(savings)
      .where(eq(savings.userId, userId))
      .orderBy(desc(savings.date));
  }

  async getSavingsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Saving[]> {
    return db.select()
      .from(savings)
      .where(eq(savings.userId, userId))
      .orderBy(desc(savings.date))
      .then(savings => 
        savings.filter(saving => 
          saving.date >= startDate && 
          saving.date <= endDate
        )
      );
  }

  async createSaving(saving: InsertSaving): Promise<Saving> {
    const result = await db.insert(savings)
      .values(saving)
      .returning();
    return result[0];
  }

  async deleteSaving(id: number): Promise<boolean> {
    const result = await db.delete(savings)
      .where(eq(savings.id, id));
    return !!result;
  }

  // Goals operations
  async getGoals(userId: number): Promise<Goal[]> {
    return db.select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(asc(goals.targetDate));
  }

  async getGoalById(id: number): Promise<Goal | undefined> {
    const result = await db.select()
      .from(goals)
      .where(eq(goals.id, id));
    return result[0];
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await db.insert(goals)
      .values({
        ...goal,
        currentAmount: 0,
        completed: false
      })
      .returning();
    return result[0];
  }

  async updateGoal(id: number, data: Partial<Omit<Goal, "id">>): Promise<Goal | undefined> {
    const result = await db.update(goals)
      .set(data)
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  async deleteGoal(id: number): Promise<boolean> {
    const result = await db.delete(goals)
      .where(eq(goals.id, id));
    return !!result;
  }

  // Achievements operations
  async getAchievements(userId: number): Promise<Achievement[]> {
    return db.select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.date));
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const result = await db.insert(achievements)
      .values(achievement)
      .returning();
    return result[0];
  }

  // Predictions operations
  async getPredictions(userId: number): Promise<Prediction[]> {
    return db.select()
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(asc(predictions.month));
  }

  async getPredictionByMonth(userId: number, month: string): Promise<Prediction | undefined> {
    const result = await db.select()
      .from(predictions)
      .where(eq(predictions.userId, userId));
    return result.find(p => p.month === month);
  }

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const result = await db.insert(predictions)
      .values({
        ...prediction,
        actualAmount: null
      })
      .returning();
    return result[0];
  }

  async updatePrediction(id: number, data: Partial<Omit<Prediction, "id">>): Promise<Prediction | undefined> {
    const result = await db.update(predictions)
      .set(data)
      .where(eq(predictions.id, id))
      .returning();
    return result[0];
  }
}

// Exporting a single instance of the storage
export const storage = new DatabaseStorage();
