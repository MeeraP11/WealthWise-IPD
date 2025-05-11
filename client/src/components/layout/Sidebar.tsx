import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@/lib/userContext";
import { Button } from "@/components/ui/button";
import { StreakTracker } from "@/components/shared/StreakTracker";

const Sidebar = () => {
  const { user, logout } = useUser();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    { path: "/", label: "Dashboard", icon: "fa-home" },
    { path: "/expenses", label: "Expenses", icon: "fa-receipt" },
    { path: "/savings", label: "Savings", icon: "fa-piggy-bank" },
    { path: "/goals", label: "Goals", icon: "fa-bullseye" },
    { path: "/predictions", label: "Future Predictions", icon: "fa-chart-line" },
    { path: "/achievements", label: "Achievements", icon: "fa-trophy" },
    { path: "/ai-explanation", label: "AI Models", icon: "fa-robot" }
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 z-20 md:hidden p-4">
        <Button 
          variant="ghost"
          size="icon"
          onClick={toggleMobileMenu}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </Button>
      </div>

      {/* Sidebar - desktop always visible, mobile conditionally visible */}
      <aside className={`
        w-64 bg-white border-r border-neutral-200 md:h-screen md:fixed 
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-primary text-white flex items-center justify-center text-lg font-bold">
              W
            </div>
            <h1 className="text-xl font-bold ml-2 text-neutral-800">WealthWise</h1>
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold">
              {user.name.split(' ').map(name => name[0]).join('').toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-800">{user.name}</p>
              <div className="flex items-center text-sm text-neutral-500">
                <i className="fas fa-coins text-warning-DEFAULT mr-1"></i>
                <span>{user.coins}</span> coins
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-2">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  className={`
                    flex items-center p-2 rounded-md group transition-colors
                    ${location === item.path 
                      ? 'bg-primary-light text-primary-dark font-medium' 
                      : 'text-neutral-600 hover:bg-primary-light hover:text-primary-dark'}
                  `}
                >
                  <i className={`
                    fas ${item.icon} w-5 text-center mr-3
                    ${location === item.path ? 'text-primary' : 'group-hover:text-primary'}
                  `}></i>
                  <span>{item.label}</span>
                  
                  {item.label === "Achievements" && (
                    <span className="ml-auto bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      3
                    </span>
                  )}
                </Link>
              </li>
            ))}
            
            <li className="mt-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-neutral-600 hover:bg-danger-light hover:text-danger-DEFAULT"
                onClick={logout}
              >
                <i className="fas fa-sign-out-alt w-5 text-center mr-3"></i>
                <span>Logout</span>
              </Button>
            </li>
          </ul>
        </nav>
        
        {/* Streak Information */}
        <div className="mt-4 mx-4">
          <StreakTracker streak={user.streak} />
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleMobileMenu}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
