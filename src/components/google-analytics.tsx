
'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  gaId?: string;
}

const GoogleAnalytics = ({ gaId }: GoogleAnalyticsProps) => {
  if (!gaId) {
    // In a production environment, you might want to log this to a monitoring service.
    // For now, we'll log to the browser console.
    console.log("Google Analytics ID is missing. Analytics will be disabled.");
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
};

export default GoogleAnalytics;
