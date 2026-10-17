"use client";

import * as React from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { META_PIXEL_ID, isMetaPixelEnabled, trackPageView } from "@/lib/meta";

/** Pixel ids are numeric; anything else is dropped rather than injected
 *  into an inline script. */
const PIXEL_ID = /^\d+$/.test(META_PIXEL_ID) ? META_PIXEL_ID : "";

/** The back office is not an ad audience: no pixel on /admin. */
function isExcluded(pathname: string | null): boolean {
  return Boolean(pathname && pathname.startsWith("/admin"));
}

/** Set once the base snippet's own PageView has accounted for the first
 *  public URL of this page lifetime. Module-level so it survives the
 *  tracker re-rendering. */
let snippetPageViewConsumed = false;

/** Loads the base pixel once (first public page) and records PageView on
 *  that load and on every later client-side navigation. Renders nothing
 *  when NEXT_PUBLIC_META_PIXEL_ID is unset. */
export function MetaPixel() {
  const pathname = usePathname();
  if (!isMetaPixelEnabled() || !PIXEL_ID) return null;

  return (
    <>
      {!isExcluded(pathname) && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}
      <React.Suspense fallback={null}>
        <RouteChangePageView />
      </React.Suspense>
    </>
  );
}

/** App Router has no router events, so this watches pathname + query.
 *  The first public URL is skipped because the snippet sends that
 *  PageView itself; the same URL is never sent twice in a row. */
function RouteChangePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = React.useRef<string | null>(null);

  React.useEffect(() => {
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (url === lastUrl.current) return;
    lastUrl.current = url;
    if (isExcluded(pathname)) return;
    if (!snippetPageViewConsumed) {
      snippetPageViewConsumed = true;
      return;
    }
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}
