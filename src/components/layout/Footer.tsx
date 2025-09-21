import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import googlePlayBadge from '@/assets/google-play-badge.png';

export const Footer = () => {
  return (
    <footer className="bg-muted mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
                <span className="text-yellow-400 font-poppins font-black text-xl">K</span>
              </div>
              <h1 className="text-xl font-poppins font-bold text-primary">
                <span className="text-red-600">kadal</span>
                <span className="text-foreground ml-1">shopping</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your trusted marketplace for quality products from local and global sellers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary">Home</Link></li>
              <li><Link to="/auth" className="text-muted-foreground hover:text-primary">Sign In</Link></li>
              <li><Link to="/orders" className="text-muted-foreground hover:text-primary">My Orders</Link></li>
              <li><Link to="/profile" className="text-muted-foreground hover:text-primary">My Profile</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary">Help Center</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Contact Us</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Shipping Info</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Returns</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Terms of Service</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Cookie Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary">Seller Agreement</a></li>
            </ul>
          </div>

          {/* Mobile App */}
          <div>
            <h3 className="font-semibold mb-4">Get Our App</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Download our mobile app for a better shopping experience
              </p>
              <a 
                href="https://play.google.com/store/apps/details?id=com.kadal.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:opacity-80 transition-opacity"
              >
                <img
                  src={googlePlayBadge}
                  alt="Get it on Google Play"
                  className="h-12 w-auto"
                />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            © 2025 Kadal Shop. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-primary">Privacy</Link>
            <span>•</span>
            <a href="#" className="hover:text-primary">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-primary">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};