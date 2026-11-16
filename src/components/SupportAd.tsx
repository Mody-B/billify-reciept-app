import { useEffect, useRef } from "react";

const CLIENT = "ca-pub-8054280400638552";
const SCRIPT = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

export function SupportAd() {
  const pushed = useRef(false);

  useEffect(() => {
    if (!document.getElementById("adsbygoogle-js")) {
      const script = document.createElement("script");
      script.id = "adsbygoogle-js";
      script.async = true;
      script.src = SCRIPT;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
    if (pushed.current) return;
    pushed.current = true;
    const page = window as Window & { adsbygoogle?: object[] };
    const ads = (page.adsbygoogle = page.adsbygoogle || []);
    try {
      ads.push({});
    } catch {
      /* This unit was already requested. */
    }
  }, []);

  return (
    <aside className="home-support" data-testid="support-ad" aria-label="Support the creator">
      <p>Support the creator</p>
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: "200px", height: "50px" }}
        data-ad-client={CLIENT}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </aside>
  );
}
