import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
      {/* Top bar */}
      <div className="bg-gradient-hero px-4 py-2">
        <div className="container mx-auto flex items-center justify-between text-sm text-primary-foreground">
          <div>Free shipping on orders over ₹499</div>
          <div className="flex items-center gap-4">
            <span>Sell on MarketPlace</span>
            <span>Help & Support</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <span className="text-yellow-400 font-poppins font-black text-xl">K</span>
            </div>
            <h1 className="text-2xl font-poppins font-bold text-primary">
              <span className="text-red-600">kadal</span>
              <span className="text-foreground ml-1">shopping</span>
            </h1>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Input
                placeholder="Search for products..."
                className="w-full pl-4 pr-12 h-12 border-2 focus:border-primary"
              />
              <Button 
                size="icon" 
                variant="hero"
                className="absolute right-1 top-1 h-10 w-10"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span className="hidden md:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    Admin Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/shop')}>
                    Shop Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="flex items-center gap-2" onClick={handleAuthClick}>
                <User className="h-5 w-5" />
                <span className="hidden md:inline">Sign In</span>
              </Button>
            )}

            <CartDrawer />

            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
          <Button variant="ghost">Electronics</Button>
          <Button variant="ghost">Fashion</Button>
          <Button variant="ghost">Home & Garden</Button>
          <Button variant="ghost">Sports</Button>
          <Button variant="ghost">Books</Button>
          <Button variant="ghost">Health & Beauty</Button>
          <Button variant="ghost">More</Button>
        </div>
      </div>
    </header>
  );
};