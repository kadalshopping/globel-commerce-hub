import { Product } from "@/types/product";

export const generateProductSchema = (product: Product) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description || product.title,
    "image": product.images?.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`) || [],
    "sku": product.sku || product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Kadal Shopping"
    },
    "category": product.category,
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/product/${product.id}`,
      "priceCurrency": "INR",
      "price": product.selling_price,
      "availability": product.stock_quantity && product.stock_quantity > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": "Kadal Shopping"
      }
    },
    "aggregateRating": product.average_rating ? {
      "@type": "AggregateRating",
      "ratingValue": product.average_rating,
      "reviewCount": product.review_count || 0,
      "bestRating": 5,
      "worstRating": 1
    } : undefined
  };
};

export const generateBreadcrumbSchema = (breadcrumbs: Array<{ name: string; url: string }>) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
};

export const generateOrganizationSchema = () => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Kadal Shopping",
    "url": baseUrl,
    "logo": `${baseUrl}/logo.png`,
    "description": "Your ultimate shopping destination for quality products at great prices",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "support@kadalshopping.com"
    },
    "sameAs": [
      "https://facebook.com/kadalshopping",
      "https://twitter.com/kadalshopping",
      "https://instagram.com/kadalshopping"
    ]
  };
};

export const generateWebsiteSchema = () => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Kadal Shopping",
    "url": baseUrl,
    "description": "Discover amazing products with great deals, fast shipping, and excellent customer service",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
};

export const generateProductListSchema = (products: Product[], listName: string = "Featured Products") => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.title,
        "url": `${baseUrl}/product/${product.id}`,
        "image": product.images?.[0] || "",
        "offers": {
          "@type": "Offer",
          "price": product.selling_price,
          "priceCurrency": "INR"
        }
      }
    }))
  };
};