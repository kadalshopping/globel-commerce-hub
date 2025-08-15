import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin, useIsShopOwner } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { 
  Search, 
  User, 
  Menu,
  Heart,
  Bell,
  LogOut
} from "lucide-react";

export const Header = () => {
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const isShopOwner = useIsShopOwner();
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (user) {
      return;
    } else {
      navigate('/auth');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top bar - hidden on mobile */}
      <div className="bg-gradient-hero px-4 py-2 hidden sm:block">
        <div className="container mx-auto flex items-center justify-between text-sm text-primary-foreground">
          <div>Free shipping on orders over ₹499</div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">Sell on MarketPlace</span>
            <span>Help & Support</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <span className="text-yellow-400 font-poppins font-black text-base sm:text-xl">K</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-poppins font-bold text-primary">
              <span className="text-red-600">kadal</span>
              <span className="text-foreground ml-1 hidden sm:inline">shopping</span>
            </h1>
          </div>

          {/* Search - hidden on mobile, shown on larger screens */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full">
              <Input
                placeholder="Search for products..."
                className="w-full pl-4 pr-12 h-10 sm:h-12 border-2 focus:border-primary"
              />
              <Button 
                size="icon" 
                variant="hero"
                className="absolute right-1 top-1 h-8 w-8 sm:h-10 sm:w-10"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-sm">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')}>
                    My Orders
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  {isShopOwner && (
                    <DropdownMenuItem onClick={() => navigate('/shop')}>
                      Shop Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-sm" onClick={handleAuthClick}>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}

            <CartDrawer />

            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Input
              placeholder="Search for products..."
              className="w-full pl-4 pr-12 h-10 border-2 focus:border-primary"
            />
            <Button 
              size="icon" 
              variant="hero"
              className="absolute right-1 top-1 h-8 w-8"
            >
              <Search className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Categories - scrollable on mobile */}
        <div className="flex items-center gap-3 sm:gap-6 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t overflow-x-auto scrollbar-hide">
          <Button variant="ghost" className="whitespace-nowrap text-sm">Electronics</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">Fashion</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">Home & Garden</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">Sports</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">Books</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">Health</Button>
          <Button variant="ghost" className="whitespace-nowrap text-sm">More</Button>
        </div>
      </div>
    </header>
  );
};