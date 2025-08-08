import { Badge } from "@/components/ui/badge";

const offers = [
  "🎉 Flash Sale: Up to 70% off Electronics",
  "🚚 Free shipping on orders above ₹499",
  "💸 Flat ₹200 off on first order with code WELCOME200",
  "🔥 Limited time: Buy 2 Get 1 Free on Fashion",
  "⚡ Lightning deals every hour",
  "🎁 Special gift with orders above ₹999",
];

export const ScrollingOffers = () => {
  return (
    <div className="bg-gradient-offer py-3 overflow-hidden">
      <div className="animate-scroll-left whitespace-nowrap">
        <div className="inline-flex items-center gap-8 text-primary-foreground font-medium">
          {offers.map((offer, index) => (
            <div key={index} className="flex items-center gap-2">
              <span>{offer}</span>
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                HOT
              </Badge>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {offers.map((offer, index) => (
            <div key={`duplicate-${index}`} className="flex items-center gap-2">
              <span>{offer}</span>
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                HOT
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};