import { useEffect, useRef, useState } from "react";

interface UseLazyBackgroundOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useLazyBackground = (
  imageUrl: string | null,
  options: UseLazyBackgroundOptions = {}
) => {
  const { threshold = 0.1, rootMargin = "50px", enabled = true } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !imageUrl || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [enabled, imageUrl, threshold, rootMargin]);

  useEffect(() => {
    if (!isInView || !imageUrl) return;

    const img = new Image();

    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoaded(false);
    };

    img.src = imageUrl;
  }, [isInView, imageUrl]);

  // Handle responsive background images with srcset
  useEffect(() => {
    if (!isLoaded || !ref.current) return;

    const element = ref.current;
    const srcset = element.getAttribute("data-bg-srcset");

    const overlay = element.getAttribute("data-bg-overlay");
    const imgPart = srcset
      ? `image-set(${srcset}), url(${imageUrl})`
      : `url(${imageUrl})`;

    element.style.backgroundImage = overlay ? `${overlay}, ${imgPart}` : imgPart;
  }, [isLoaded, imageUrl]);

  return {
    ref,
    isLoaded,
    isInView,
    hasError,
    backgroundImage: isLoaded ? `url(${imageUrl})` : null,
  };
};
