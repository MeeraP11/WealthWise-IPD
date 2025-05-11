import { storage } from '../server/storage';

async function main() {
  console.log('Testing database connection and operations...');
  
  try {
    // Test user operations
    console.log('Testing user operations...');
    const demoUser = await storage.getUserByUsername('demo');
    
    if (demoUser) {
      console.log('Demo user found:', demoUser);
      
      // Test updating user
      const updatedUser = await storage.updateUser(demoUser.id, {
        coins: demoUser.coins + 10,
        streak: demoUser.streak + 1,
      });
      
      console.log('Updated user:', updatedUser);
    } else {
      console.log('Demo user not found, creating...');
      const newUser = await storage.createUser({
        username: 'demo',
        password: 'password',
        name: 'Rahul Kumar',
        coins: 750,
        streak: 4,
        lastLogin: new Date()
      });
      
      console.log('Created user:', newUser);
    }
    
    console.log('Database operations completed successfully!');
  } catch (error) {
    console.error('Error during database operations:', error);
  }
}

main().catch(console.error);