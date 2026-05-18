import React, { useState, useEffect } from 'react';

interface PremiumLogoProps {
  query: string;
  className?: string;
  size?: number;
  fallbackIcon?: React.ReactNode;
}

export default function PremiumLogo({ query, className = '', size = 32, fallbackIcon = null }: PremiumLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchLogo() {
      try {
        setLoading(true);
        // Using Next.js API route to protect credentials
        const res = await fetch(`/api/iconscout?query=${encodeURIComponent(query)}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch premium logo');
        }
        
        const data = await res.json();
        
        // Find the best matching premium logo (or any logo if premium not available)
        const items = data.response?.items?.data || [];
        if (items.length > 0) {
          // Find the first SVG or PNG URL from IconScout
          const item = items[0];
          const url = item.urls?.svg || item.urls?.png_256 || item.urls?.png_128;
          if (url) {
            setLogoUrl(url);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching logo:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (query) {
      fetchLogo();
    }
  }, [query]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-700/50 rounded-full flex items-center justify-center ${className}`} style={{ width: size, height: size }}></div>;
  }

  if (error || !logoUrl) {
    return <span className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>{fallbackIcon}</span>;
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Next.js Image component might need domains config, using standard img for external CDN as fallback if unconfigured */}
      <img 
        src={logoUrl} 
        alt={`${query} logo`}
        width={size}
        height={size}
        className="object-contain"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
