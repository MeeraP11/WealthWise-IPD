# WealthWise Architecture

## Overview

WealthWise is a personal finance management application that helps users track expenses, set savings goals, and gain financial insights. The application follows a client-server architecture with a React frontend and a Node.js Express backend. It uses PostgreSQL as the database with Drizzle ORM for data access.

The application integrates with OpenAI's GPT-4o model to provide AI-powered expense categorization, savings recommendations, and financial insights.

## System Architecture

### High-Level Architecture

WealthWise follows a modern web application architecture:

1. **Client**: React-based Single Page Application (SPA)
2. **Server**: Node.js Express REST API 
3. **Database**: PostgreSQL database accessed via Drizzle ORM
4. **AI Services**: Integration with OpenAI for intelligent features

The architecture follows these key principles:
- Clear separation between frontend and backend
- Type-safe interfaces between components using TypeScript
- REST API for client-server communication
- Data persistence using relational database
- AI-powered financial insights

### Directory Structure

```
├── client/                  # React frontend application
│   ├── src/                 # Source code for frontend
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and context providers
│   │   └── pages/           # Page components
├── server/                  # Node.js backend
│   ├── auth.ts              # Authentication logic
│   ├── ai.ts                # AI service integration
│   ├── db.ts                # Database connection
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Data access layer
│   └── vite.ts              # Vite server configuration
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Database schema and type definitions
├── scripts/                 # Utility scripts for database ops
└── migrations/              # Database migrations (generated)
```

## Key Components

### Frontend Architecture

1. **UI Framework**: Built with React, using functional components with hooks
2. **State Management**: 
   - React Query for server state management
   - React Context for global application state (user context)
   - Local component state for UI-specific state

3. **UI Components**: Uses Shadcn UI components, which are built on Radix UI primitives, styled with Tailwind CSS

4. **Client-side Routing**: Uses Wouter for lightweight client-side routing

5. **Data Visualization**: Uses Recharts for charting and data visualization components

### Backend Architecture

1. **API Server**: Express.js with RESTful endpoints
   - Structured around resources (expenses, savings, goals, etc.)
   - Session-based authentication

2. **Authentication**: 
   - Passport.js with local strategy for username/password
   - Session management with PostgreSQL session store
   - Secure password hashing using crypto.scrypt

3. **Database Access**: 
   - Drizzle ORM for type-safe database access
   - Repository pattern implemented in storage.ts
   - Schema defined in shared/schema.ts

4. **AI Services**:
   - Integration with OpenAI's GPT-4o model
   - Expense categorization
   - Financial insights generation
   - Savings recommendations

### Database Schema

The database schema consists of the following main entities:

1. **Users**:
   - Basic user information (username, password, name)
   - Gamification elements (coins, streak)

2. **Expenses**:
   - Transactions with amount, category, date
   - Classification by status (necessary, avoidable, unnecessary)
   - Payment mode tracking

3. **Savings**:
   - Savings entries with amount, date, source
   - Associated with users

4. **Goals**:
   - Financial goals with target amount and progress
   - Associated with users

5. **Achievements**:
   - Gamification feature to track user accomplishments
   - Associated with users

### Authentication System

The application uses session-based authentication:

1. **User Registration**: Secure password hashing using scrypt
2. **Login**: Passport.js with local strategy
3. **Session Management**: Express session with PostgreSQL session store
4. **Protection**: Routes secured with authentication middleware

## Data Flow

### Client-Server Interaction

1. **Data Fetching**:
   - React Query for data fetching and caching
   - RESTful API endpoints for CRUD operations
   - JSON data format for request/response

2. **Authentication Flow**:
   - Client submits credentials
   - Server validates and sets session cookie
   - Client includes session cookie in subsequent requests
   - Server validates session on protected routes

3. **Real-time Updates**:
   - Currently uses polling with React Query
   - No WebSocket implementation identified

### AI-Powered Insights

1. **Expense Categorization**:
   - User enters expense description
   - Server sends description to OpenAI API
   - AI categorizes expense into predefined categories
   - Fallback to keyword matching if AI service unavailable

2. **Financial Insights**:
   - Expense data analyzed for patterns
   - AI generates personalized recommendations
   - Insights displayed on dashboard

## External Dependencies

### Frontend Dependencies

1. **UI Framework**: React
2. **State Management**: React Query
3. **Routing**: Wouter
4. **UI Components**: Radix UI, Shadcn UI
5. **Styling**: Tailwind CSS
6. **Data Visualization**: Recharts
7. **Forms**: React Hook Form, Zod for validation

### Backend Dependencies

1. **API Server**: Express.js
2. **Database ORM**: Drizzle ORM
3. **Database Driver**: @neondatabase/serverless
4. **Authentication**: Passport.js, express-session
5. **AI Services**: OpenAI API
6. **Session Store**: connect-pg-simple

### External Services

1. **Database**: PostgreSQL (Neon Database)
2. **AI**: OpenAI's GPT-4o model

## Deployment Strategy

The application is configured for deployment on Replit:

1. **Development Environment**:
   - Development server: `npm run dev`
   - Uses Vite's development server for HMR
   - Serves frontend and backend from same origin

2. **Production Build**:
   - Frontend: Built with Vite (`npm run build`)
   - Backend: Bundled with esbuild
   - Output directory: `/dist`

3. **Production Deployment**:
   - Node.js server: `NODE_ENV=production node dist/index.js`
   - Replit configuration for auto-deployment
   - Environment variables for database connection and secrets

4. **Database**:
   - Uses Neon's serverless PostgreSQL
   - Connection via DATABASE_URL environment variable
   - Schema migrations via Drizzle Kit

### Scaling Considerations

The current architecture has some limitations for scaling:

1. **Session Storage**: Uses database sessions which may impact performance at scale
2. **Monolithic Structure**: Backend and frontend deployed together, limiting independent scaling
3. **Server Rendering**: No server-side rendering, which may impact initial load performance

Future improvements could include:
- Separating frontend and backend deployments
- Implementing JWT authentication for stateless scaling
- Adding caching layers for database and AI responses