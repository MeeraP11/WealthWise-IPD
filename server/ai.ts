import OpenAI from "openai";
import { expenseStatusEnum } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Expense categorization
export async function categorizeExpense(expenseName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "You are a financial categorization assistant. Categorize the expense into one of these categories:" +
            "\n- food_and_drinks" +
            "\n- groceries" +
            "\n- shopping" +
            "\n- entertainment" +
            "\n- transportation" +
            "\n- health" +
            "\n- utilities" +
            "\n- housing" +
            "\n- education" +
            "\n- travel" +
            "\n- personal_care" +
            "\n- gifts" +
            "\n- investment" +
            "\n- bills" +
            "\n- other" +
            "\nRespond with only the category name, nothing else."
        },
        {
          role: "user",
          content: expenseName
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const category = response.choices[0].message.content?.trim().toLowerCase();
    
    // Validate category
    const validCategories = [
      "food_and_drinks", "groceries", "shopping", "entertainment", 
      "transportation", "health", "utilities", "housing", 
      "education", "travel", "personal_care", "gifts", 
      "investment", "bills", "other"
    ];
    
    if (category && validCategories.includes(category)) {
      return category;
    } else {
      // Fallback to basic keyword matching if OpenAI returns invalid category
      return fallbackCategorization(expenseName);
    }
  } catch (error) {
    console.error("Error categorizing expense with OpenAI:", error);
    // Fallback to basic keyword matching if OpenAI fails
    return fallbackCategorization(expenseName);
  }
}

// Fallback categorization using keywords
function fallbackCategorization(expenseName: string): string {
  const text = expenseName.toLowerCase();
  
  if (text.match(/restaurant|cafe|coffee|tea|lunch|dinner|breakfast|food|meal|snack|drinks|pizza|burger/))
    return "food_and_drinks";
  
  if (text.match(/grocery|vegetables|fruits|supermarket|market|bread|milk|egg/))
    return "groceries";
  
  if (text.match(/shopping|clothes|shirt|dress|pants|shoes|accessories|mall|store|buy/))
    return "shopping";
  
  if (text.match(/movie|cinema|theatre|concert|show|entertainment|game|subscription|netflix|amazon|prime|disney/))
    return "entertainment";
  
  if (text.match(/transport|uber|ola|lyft|taxi|train|bus|metro|subway|cab|petrol|gas|fuel|car|bike/))
    return "transportation";
  
  if (text.match(/doctor|hospital|medicine|medical|pharmacy|health|healthcare|fitness|gym|yoga/))
    return "health";
  
  if (text.match(/electricity|water|gas|internet|phone|bill|utility|broadband|wifi/))
    return "utilities";
  
  if (text.match(/rent|mortgage|property|house|apartment|maintenance|repair|furniture|home/))
    return "housing";
  
  if (text.match(/school|college|university|tuition|course|class|education|book|learning|tutorial/))
    return "education";
  
  if (text.match(/travel|holiday|vacation|hotel|resort|flight|ticket|booking|tour|trip/))
    return "travel";
  
  if (text.match(/salon|spa|haircut|beauty|personal|care|cosmetics|grooming/))
    return "personal_care";
  
  if (text.match(/gift|present|donation|charity/))
    return "gifts";
  
  if (text.match(/investment|stock|mutual fund|gold|equity|shares|bond|crypto|bitcoin/))
    return "investment";
  
  if (text.match(/bill|payment|subscription|fee|insurance|tax|emi/))
    return "bills";
  
  // Default category
  return "other";
}

// Determine expense status (necessary, avoidable, unnecessary)
export async function determineExpenseStatus(expenseName: string, category: string, amount: number): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "You are a financial advisor helping users classify their expenses. " +
            "Based on the expense name, category, and amount, classify it as one of: " +
            "\n- necessary: Essential expenses that are difficult to avoid" +
            "\n- avoidable: Expenses that could potentially be reduced" +
            "\n- unnecessary: Discretionary spending that could be eliminated" +
            "\nRespond with only one of these three words, nothing else."
        },
        {
          role: "user",
          content: `Expense name: ${expenseName}\nCategory: ${category}\nAmount: ₹${amount / 100}`
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
      response_format: { type: "text" }
    });

    const status = response.choices[0].message.content?.trim().toLowerCase();
    
    // Validate status
    const validStatuses = Array.from(expenseStatusEnum.enumValues);
    
    if (status && validStatuses.includes(status as any)) {
      return status as "necessary" | "avoidable" | "unnecessary";
    } else {
      // Fallback if OpenAI returns invalid status
      return fallbackStatusDetermination(category, amount);
    }
  } catch (error) {
    console.error("Error determining expense status with OpenAI:", error);
    // Fallback if OpenAI fails
    return fallbackStatusDetermination(category, amount);
  }
}

// Fallback status determination based on category and amount
function fallbackStatusDetermination(category: string, amount: number): string {
  // Categories that tend to be necessary
  const necessaryCategories = ["groceries", "utilities", "housing", "health", "transportation", "bills", "education"];
  
  // Categories that could be avoidable depending on amount
  const potentiallyAvoidableCategories = ["food_and_drinks", "personal_care", "investment"];
  
  // Categories that tend to be unnecessary
  const unnecessaryCategories = ["entertainment", "shopping", "travel", "gifts"];
  
  // Convert paise to rupees for threshold comparison
  const amountInRupees = amount / 100;
  
  if (necessaryCategories.includes(category)) {
    // High amounts in necessary categories might still be avoidable
    return amountInRupees > 5000 ? "avoidable" : "necessary";
  }
  
  if (potentiallyAvoidableCategories.includes(category)) {
    // Moderate amounts for these categories
    return amountInRupees > 1000 ? "avoidable" : "necessary";
  }
  
  if (unnecessaryCategories.includes(category)) {
    // High amounts in unnecessary categories are definitely unnecessary
    return amountInRupees > 2000 ? "unnecessary" : "avoidable";
  }
  
  // Default for other categories
  return amountInRupees > 3000 ? "unnecessary" : "avoidable";
}

// Generate savings tips based on expense data
export async function generateSavingsTips(expenses: Array<{
  name: string;
  category: string;
  amount: number;
  status: string;
}>): Promise<string[]> {
  try {
    // Calculate total amounts by status
    const totalByStatus = expenses.reduce((acc, expense) => {
      acc[expense.status] = (acc[expense.status] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate total by category
    const totalByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Get top spending categories (convert to rupees from paise)
    const topCategories = Object.entries(totalByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount: amount / 100 }));
    
    const prompt = `
      Based on the user's spending data:
      
      Total avoidable expenses: ₹${(totalByStatus.avoidable || 0) / 100}
      Total unnecessary expenses: ₹${(totalByStatus.unnecessary || 0) / 100}
      
      Top spending categories:
      ${topCategories.map(c => `- ${c.category}: ₹${c.amount}`).join('\n')}
      
      Please provide 3 practical, specific savings tips. Each tip should be concise (max 150 characters) and actionable.
      Format your response as a JSON array of strings with exactly 3 tips.
    `;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a financial advisor specializing in helping users save money."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      return fallbackSavingsTips(topCategories.map(c => c.category));
    }
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.tips) && parsed.tips.length > 0) {
        return parsed.tips.slice(0, 3);
      }
    } catch (error) {
      console.error("Error parsing OpenAI JSON response:", error);
    }
    
    return fallbackSavingsTips(topCategories.map(c => c.category));
  } catch (error) {
    console.error("Error generating savings tips with OpenAI:", error);
    // Generate fallback tips based on top spending categories
    return fallbackSavingsTips(
      Object.entries(expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category)
    );
  }
}

// Fallback savings tips based on categories
function fallbackSavingsTips(topCategories: string[]): string[] {
  const tipsByCategory: Record<string, string[]> = {
    food_and_drinks: [
      "Try meal prepping on weekends to reduce eating out expenses",
      "Consider bringing lunch to work instead of buying every day",
      "Look for happy hour deals when dining out to save on food and drinks"
    ],
    groceries: [
      "Make a shopping list and stick to it to avoid impulse purchases",
      "Buy seasonal produce to get better prices on fruits and vegetables",
      "Consider store brands instead of name brands for staple items"
    ],
    shopping: [
      "Wait 24 hours before making non-essential purchases to avoid impulse buys",
      "Look for secondhand options for clothing and accessories",
      "Use price tracking apps to buy items when they're at their lowest price"
    ],
    entertainment: [
      "Consider sharing subscription services with family or friends",
      "Look for free entertainment options like parks, community events, or libraries",
      "Use student or other available discounts for entertainment venues"
    ],
    transportation: [
      "Consider carpooling or using public transport to save on fuel costs",
      "Plan your routes to minimize distance and avoid traffic",
      "Maintain your vehicle regularly to prevent expensive repairs later"
    ],
    health: [
      "Look for generic medication options instead of brand names",
      "Take advantage of preventive care services covered by insurance",
      "Consider telemedicine options which may be less expensive than in-person visits"
    ],
    utilities: [
      "Turn off lights and appliances when not in use to reduce electricity bills",
      "Consider installing energy-efficient bulbs and appliances",
      "Check for better plans or providers for internet and phone services"
    ],
    housing: [
      "Consider a roommate to share housing costs if feasible",
      "Negotiate rent when renewing your lease",
      "DIY minor home repairs instead of hiring someone"
    ],
    education: [
      "Look for used textbooks or digital versions to save money",
      "Apply for scholarships and grants, even small ones add up",
      "Consider community college courses that can transfer to universities"
    ],
    travel: [
      "Book flights and accommodations well in advance to get better rates",
      "Travel during off-peak seasons for lower prices",
      "Consider budget accommodations like hostels or vacation rentals"
    ],
    other: [
      "Review your expenses regularly to identify areas to cut back",
      "Use budgeting apps to track spending and set limits",
      "Consider if purchases are wants or needs before spending"
    ]
  };
  
  const tips: string[] = [];
  
  // Add a tip from each top category
  topCategories.forEach(category => {
    const categoryTips = tipsByCategory[category] || tipsByCategory.other;
    if (categoryTips.length > 0) {
      // Get a random tip for this category
      const randomIndex = Math.floor(Math.random() * categoryTips.length);
      tips.push(categoryTips[randomIndex]);
      // Remove this tip from the array to avoid duplicates
      categoryTips.splice(randomIndex, 1);
    }
  });
  
  // If we don't have enough tips, add general ones
  const generalTips = [
    "Track your expenses regularly to identify areas where you can cut back",
    "Set up automatic transfers to your savings account on payday",
    "Try the 30-day rule: wait 30 days before making non-essential purchases",
    "Review and cancel unused subscriptions and memberships",
    "Use cash instead of cards for discretionary spending to be more mindful"
  ];
  
  while (tips.length < 3) {
    tips.push(generalTips[tips.length % generalTips.length]);
  }
  
  return tips.slice(0, 3);
}