import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const expenseStatusEnum = pgEnum('expense_status', ['necessary', 'avoidable', 'unnecessary']);
export const paymentModeEnum = pgEnum('payment_mode', ['upi', 'debit_card', 'credit_card', 'cash', 'wallet']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  coins: integer("coins").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastLogin: timestamp("last_login").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // Stored in paise (1/100th of rupee)
  date: timestamp("date").notNull().defaultNow(),
  status: expenseStatusEnum("status").notNull(),
  category: text("category").notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  notes: text("notes"),
});

// Savings table
export const savings = pgTable("savings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // Stored in paise
  date: timestamp("date").notNull().defaultNow(),
  source: text("source").notNull(), // e.g., "piggy_bank", "weekly_goal"
  notes: text("notes"),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(), // Stored in paise
  currentAmount: integer("current_amount").notNull().default(0), // Stored in paise
  startDate: timestamp("start_date").notNull().defaultNow(),
  targetDate: timestamp("target_date").notNull(),
  completed: boolean("completed").notNull().default(false),
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // e.g., "goal_met", "savings_goal", "streak"
  name: text("name").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  coinsAwarded: integer("coins_awarded").notNull().default(0),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  month: text("month").notNull(), // ISO format YYYY-MM
  predictedAmount: integer("predicted_amount").notNull(), // Stored in paise
  actualAmount: integer("actual_amount"), // May be null until month end
  categories: json("categories").notNull(), // JSON structure of category predictions
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  expenses: many(expenses),
  savings: many(savings),
  goals: many(goals),
  achievements: many(achievements),
  predictions: many(predictions)
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id]
  })
}));

export const savingsRelations = relations(savings, ({ one }) => ({
  user: one(users, {
    fields: [savings.userId],
    references: [users.id]
  })
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id]
  })
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id]
  })
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
// Base expense schema from drizzle
const baseExpenseSchema = createInsertSchema(expenses).omit({ id: true });

// Custom expense schema with date handling
export const insertExpenseSchema = baseExpenseSchema.extend({
  date: z.preprocess(
    // Handle different date formats
    (val) => {
      if (val instanceof Date) return val;
      
      // If it's a string, attempt to convert to Date
      if (typeof val === 'string') {
        const date = new Date(val);
        // Verify we got a valid date
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Return as is for Zod to validate/reject invalid values
      return val;
    },
    z.date({
      required_error: "Date is required",
      invalid_type_error: "Date must be a valid date string or Date object"
    })
  )
});
// Custom savings schema with date handling
export const insertSavingsSchema = createInsertSchema(savings).omit({ id: true }).extend({
  date: z.preprocess(
    (val) => {
      if (val instanceof Date) return val;
      
      if (typeof val === 'string') {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return val;
    },
    z.date({
      required_error: "Date is required",
      invalid_type_error: "Date must be a valid date string or Date object"
    })
  )
});
// Custom goals schema with date handling
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, currentAmount: true, completed: true }).extend({
  startDate: z.preprocess(
    (val) => {
      if (val instanceof Date) return val;
      
      if (typeof val === 'string') {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return val;
    },
    z.date({
      required_error: "Start date is required",
      invalid_type_error: "Start date must be a valid date string or Date object"
    })
  ),
  targetDate: z.preprocess(
    (val) => {
      if (val instanceof Date) return val;
      
      if (typeof val === 'string') {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return val;
    },
    z.date({
      required_error: "Target date is required",
      invalid_type_error: "Target date must be a valid date string or Date object"
    })
  )
});
// Custom achievements schema with date handling
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true }).extend({
  date: z.preprocess(
    (val) => {
      if (val instanceof Date) return val;
      
      if (typeof val === 'string') {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return val;
    },
    z.date({
      required_error: "Date is required",
      invalid_type_error: "Date must be a valid date string or Date object"
    })
  )
});
// Custom predictions schema with text-based month format (YYYY-MM)
export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, actualAmount: true }).extend({
  month: z.string({
    required_error: "Month is required in YYYY-MM format"
  }).regex(/^\d{4}-\d{2}$/, {
    message: "Month must be in YYYY-MM format"
  })
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Saving = typeof savings.$inferSelect;
export type InsertSaving = z.infer<typeof insertSavingsSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;

// Helper schema for login
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
