import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  keywords?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  schema?: object[];
}

export const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = '/og-default.jpg',
  ogType = 'website',
  keywords,
  author = 'Kadal Shopping',
  publishedDate,
  modifiedDate,
  schema = []
}: SEOHeadProps) => {
  const fullTitle = title.includes('Kadal Shopping') ? title : `${title} | Kadal Shopping`;
  const currentUrl = canonical || window.location.href;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Kadal Shopping" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Article specific meta tags */}
      {publishedDate && (
        <>
          <meta property="article:published_time" content={publishedDate} />
          <meta name="twitter:label1" content="Published" />
          <meta name="twitter:data1" content={new Date(publishedDate).toLocaleDateString()} />
        </>
      )}
      
      {modifiedDate && (
        <meta property="article:modified_time" content={modifiedDate} />
      )}
      
      {/* Structured Data */}
      {schema.map((schemaItem, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaItem)
          }}
        />
      ))}
      
      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Mobile Optimization */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Helmet>
  );
};