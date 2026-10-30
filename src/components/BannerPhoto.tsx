"use client";

import { useEffect, useState } from "react";

export function BannerPhoto({ src, alt }: { src: string; alt: string }) {
  const [{ photo, previous }, setFrame] = useState<{
    photo: { src: string; alt: string }; previous: { src: string; alt: string } | null;
  }>({ photo: { src, alt }, previous: null });

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = src;
    // Keep the current image until its replacement has loaded and decoded.
    void image.decode().then(() => {
      if (cancelled) return;
      setFrame(current => current.photo.src === src ? current :
        { previous: current.photo, photo: { src, alt } });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [src, alt]);

  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setFrame(current => ({ ...current, previous: null })), 300);
    return () => window.clearTimeout(timer);
  }, [previous]);

  return <>
    {previous && <img src={previous.src} alt="" aria-hidden="true" width={640} height={640} />}
    <img key={photo.src} className={previous ? "banner-photo-enter" : undefined}
      src={photo.src} alt={photo.alt} width={640} height={640} />
  </>;
}
