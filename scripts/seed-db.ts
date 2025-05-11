import { storage } from '../server/storage';

async function main() {
  console.log('Seeding database with sample data...');
  
  try {
    // Get or create demo user
    let demoUser = await storage.getUserByUsername('demo');
    
    if (!demoUser) {
      console.log('Creating demo user...');
      demoUser = await storage.createUser({
        username: 'demo',
        password: 'password',
        name: 'Rahul Kumar',
        coins: 750,
        streak: 4,
        lastLogin: new Date()
      });
    }
    
    console.log('Demo user:', demoUser);
    
    // Create sample expenses
    console.log('Creating sample expenses...');
    const expenseData = [
      {
        userId: demoUser.id,
        name: 'Groceries',
        amount: 120000, // ₹1,200.00
        date: new Date(2025, 4, 1), // May 1, 2025
        status: 'necessary',
        category: 'Food & Groceries',
        paymentMode: 'debit_card',
        notes: 'Monthly grocery shopping'
      },
      {
        userId: demoUser.id,
        name: 'Movie Tickets',
        amount: 50000, // ₹500.00
        date: new Date(2025, 4, 2), // May 2, 2025
        status: 'avoidable',
        category: 'Entertainment',
        paymentMode: 'upi',
        notes: 'Weekend movie'
      },
      {
        userId: demoUser.id,
        name: 'Electricity Bill',
        amount: 350000, // ₹3,500.00
        date: new Date(2025, 4, 3), // May 3, 2025
        status: 'necessary',
        category: 'Utilities',
        paymentMode: 'credit_card',
        notes: 'Monthly bill'
      }
    ];
    
    for (const expense of expenseData) {
      await storage.createExpense(expense);
    }
    
    // Create sample savings
    console.log('Creating sample savings...');
    const savingsData = [
      {
        userId: demoUser.id,
        amount: 100000, // ₹1,000.00
        date: new Date(2025, 4, 1), // May 1, 2025
        source: 'piggy_bank',
        notes: 'Weekly savings'
      },
      {
        userId: demoUser.id,
        amount: 200000, // ₹2,000.00
        date: new Date(2025, 4, 5), // May 5, 2025
        source: 'salary',
        notes: 'Saved from salary'
      }
    ];
    
    for (const saving of savingsData) {
      await storage.createSaving(saving);
    }
    
    // Create sample goals
    console.log('Creating sample goals...');
    const goalsData = [
      {
        userId: demoUser.id,
        name: 'New Laptop',
        targetAmount: 8000000, // ₹80,000.00
        startDate: new Date(2025, 4, 1), // May 1, 2025
        targetDate: new Date(2025, 8, 1) // Sept 1, 2025
      },
      {
        userId: demoUser.id,
        name: 'Vacation Fund',
        targetAmount: 5000000, // ₹50,000.00
        startDate: new Date(2025, 4, 1), // May 1, 2025
        targetDate: new Date(2025, 10, 1) // Nov 1, 2025
      }
    ];
    
    for (const goal of goalsData) {
      const createdGoal = await storage.createGoal(goal);
      
      // Update the first goal with some progress
      if (goal.name === 'New Laptop') {
        await storage.updateGoal(createdGoal.id, {
          currentAmount: 1000000 // ₹10,000.00
        });
      }
    }
    
    // Create sample achievements
    console.log('Creating sample achievements...');
    const achievementsData = [
      {
        userId: demoUser.id,
        type: 'savings_goal',
        name: 'Savings Starter',
        description: 'Saved money for the first time',
        date: new Date(2025, 4, 1), // May 1, 2025
        coinsAwarded: 50
      },
      {
        userId: demoUser.id,
        type: 'streak',
        name: 'Consistency',
        description: 'Logged in for 3 days in a row',
        date: new Date(2025, 4, 2), // May 2, 2025
        coinsAwarded: 25
      }
    ];
    
    for (const achievement of achievementsData) {
      await storage.createAchievement(achievement);
    }
    
    // Create sample predictions
    console.log('Creating sample predictions...');
    const predictionsData = [
      {
        userId: demoUser.id,
        month: '2025-05',
        predictedAmount: 1500000, // ₹15,000.00
        categories: {
          'Food & Groceries': 600000,
          'Entertainment': 300000,
          'Utilities': 400000,
          'Transportation': 200000
        }
      },
      {
        userId: demoUser.id,
        month: '2025-06',
        predictedAmount: 1800000, // ₹18,000.00
        categories: {
          'Food & Groceries': 700000,
          'Entertainment': 400000,
          'Utilities': 500000,
          'Transportation': 200000
        }
      }
    ];
    
    for (const prediction of predictionsData) {
      await storage.createPrediction(prediction);
    }
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main().catch(console.error);