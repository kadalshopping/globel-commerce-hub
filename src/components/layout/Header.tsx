import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin, useIsShopOwner } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { CartDrawer } from "@/components/cart/CartDrawer"; // Disabled cart functionality
import { 
  Search, 
  User, 
  Menu,
  Heart,
  Bell,
  LogOut,
  MessageCircle,
  Phone
} from "lucide-react";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import googlePlayBadge from "@/assets/google-play-badge.png";

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
            <a 
              href="https://wa.me/918056821111?text=Hi%2C%20I%20want%20to%20sell%20on%20your%20marketplace.%20Please%20help%20me%20get%20started."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1 hover:text-primary-foreground/80 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              Sell on MarketPlace
            </a>
            <a 
              href="https://wa.me/918056821111?text=Hi%2C%20I%20need%20help%20with%20my%20order%20or%20have%20a%20question."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary-foreground/80 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              Help & Support
            </a>
            <a 
              href="tel:+918056821111"
              className="hidden sm:flex items-center gap-1 hover:text-primary-foreground/80 transition-colors"
            >
              <Phone className="h-3 w-3" />
              +91 80568 21111
            </a>
            <a 
              href="https://play.google.com/store/apps/details?id=com.kadal.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src={googlePlayBadge}
                alt="Get it on Google Play"
                className="h-8 w-auto"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg overflow-hidden shadow-lg hover-scale">
              <ImageWithSkeleton
                src="/lovable-uploads/67371650-0175-429b-b951-997f7ef76e93.png" 
                alt="Kadal Shopping Logo" 
                className="h-full w-full object-cover"
                optimizeSize={{ width: 64, height: 64, quality: 60 }}
                priority={true}
              />
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
                  {(isShopOwner || isAdmin) && (
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

            {/* <CartDrawer /> */} {/* Disabled cart - using direct buy now */}

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