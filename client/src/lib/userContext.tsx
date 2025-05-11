import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './queryClient';
import { queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';

// Define user type
export interface User {
  id: number;
  username: string;
  name: string;
  coins: number;
  streak: number;
}

// Context type
interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; coinsAwarded?: number }>;
  logout: () => Promise<void>;
  updateCoins: (amount: number) => void;
}

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking for existing session...');
        
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('Session check status:', res.status);
        
        if (res.ok) {
          const userData = await res.json();
          console.log('Session found, user data:', userData);
          setUser(userData); // The server returns user directly, not wrapped in a 'user' property
        } else {
          console.log('No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      console.log('Attempting login with credentials:', { username });
      
      // Directly use fetch instead of apiRequest for more control
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      console.log('Login response status:', res.status);
      
      const userData = await res.json();
      console.log('Login response data:', userData);
      
      if (!res.ok) {
        return { 
          success: false, 
          message: userData.message || 'Authentication failed' 
        };
      }
      
      setUser(userData); // Server returns the user directly
      
      // Return success with any awards for streak
      return { 
        success: true, 
        coinsAwarded: userData.coinsAwarded 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'An error occurred during login';
      
      if (error instanceof Error) {
        message = error.message;
      }
      
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
      
      // Clear all query cache on logout
      queryClient.clear();
      
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account',
        duration: 3000,
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Update coins function (used after earning coins)
  const updateCoins = (amount: number) => {
    if (user) {
      setUser({
        ...user,
        coins: user.coins + amount,
      });
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateCoins,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for using the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
