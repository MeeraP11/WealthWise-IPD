import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'wealthwise_secret_key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Authenticating user:", username);
        const user = await storage.getUserByUsername(username);
        console.log("User found in database:", user ? "Yes" : "No");
        
        if (!user) {
          console.log("User not found in database");
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // For demo account, allow direct password login without hash check
        if (username === 'demo' && password === 'password') {
          console.log("Demo account login successful");
          return done(null, user);
        }
        
        console.log("Checking password for non-demo user");
        const isValid = await comparePasswords(password, user.password);
        console.log("Password valid:", isValid ? "Yes" : "No");
        
        if (!isValid) {
          console.log("Password validation failed");
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        console.log("Authentication successful for:", username);
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        coins: 0,
        streak: 0,
        lastLogin: new Date()
      });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login attempt:", req.body.username);
    
    passport.authenticate("local", (err: Error, user: SelectUser, info: any) => {
      console.log("Authentication result:", { error: err ? true : false, userFound: !!user, info });
      
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, async (err) => {
        if (err) {
          console.log("Login error:", err);
          return next(err);
        }
        
        console.log("User logged in successfully:", user.username);
        
        // Update last login time and increment streak if appropriate
        const now = new Date();
        const lastLogin = user.lastLogin || new Date(0);
        
        // Calculate streak based on last login time
        const hoursSinceLastLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
        let newStreak = user.streak;
        let coinsAwarded = 0;
        
        // Only update streak and award coins if it's been more than 20 hours since last login
        // This prevents multiple logins in the same day from counting toward streak
        if (hoursSinceLastLogin > 20) {
          if (hoursSinceLastLogin < 48) {
            // More than 20 hours but less than 48 hours - increment streak
            newStreak++;
            console.log(`Increasing streak to ${newStreak}`);
            
            // Award daily login coins (15 per day)
            coinsAwarded += 15;
            
            // Check if reached 5-day streak milestone for bonus
            if (newStreak === 5 || newStreak % 5 === 0) {
              coinsAwarded += 20; // Bonus for 5-day streak
              console.log(`Awarding 5-day streak bonus! Total coins: ${coinsAwarded}`);
            }
          } else {
            // Reset streak if more than 48 hours
            console.log(`Resetting streak from ${newStreak} to 1`);
            newStreak = 1;
            coinsAwarded = 15; // Still award daily login coins
          }
        }
        
        // Update user with new streak and coins
        const updatedCoins = user.coins + coinsAwarded;
        const updatedUser = await storage.updateUser(user.id, {
          lastLogin: now,
          streak: newStreak,
          coins: updatedCoins
        });
        
        // Create the response by merging the updated user with coin award info
        const responseUser = {
          ...(updatedUser || user), // Use updatedUser if available, fallback to original user
          coinsAwarded: coinsAwarded > 0 ? coinsAwarded : undefined
        };
        
        return res.json(responseUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });
}