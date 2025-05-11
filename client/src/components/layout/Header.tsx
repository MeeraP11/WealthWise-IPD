import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/userContext";
import MonthlyReportModal from "@/components/reports/MonthlyReportModal";

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const { user, logout } = useUser();
  const [location, setLocation] = useLocation();
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/expenses":
        return "Expense Tracker";
      case "/savings":
        return "Savings";
      case "/goals":
        return "Goals";
      case "/predictions":
        return "Future Predictions";
      case "/achievements":
        return "Achievements";
      default:
        return title;
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-neutral-800">{getPageTitle()}</h2>
        </div>
        
        <div className="flex items-center">
          {/* Only show the Monthly Report button on the Dashboard page */}
          {location === "/" && (
            <div className="mr-2">
              <MonthlyReportModal />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100">
                <i className="fas fa-bell"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-auto">
                <div className="p-3 text-sm text-center text-neutral-500">
                  No new notifications
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100">
                <i className="fas fa-cog"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <i className="fas fa-user mr-2"></i> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <i className="fas fa-palette mr-2"></i> Theme
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <i className="fas fa-bell mr-2"></i> Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-danger-DEFAULT" onClick={logout}>
                <i className="fas fa-sign-out-alt mr-2"></i> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
