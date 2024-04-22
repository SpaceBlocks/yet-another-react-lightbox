import * as React from "react";

import {
  CLASS_FLEX_CENTER,
  clsx,
  createIcon,
  cssClass,
  cssVar,
  ELEMENT_ICON,
  ImageSlide,
  isImageSlide,
  makeComposePrefix,
  RenderThumbnailProps,
  Slide,
  useEventCallback,
  useLightboxProps,
} from "../../index.js";
import { cssThumbnailPrefix } from "./utils.js";
import { useThumbnailsProps } from "./props.js";

const VideoThumbnailIcon = createIcon(
  "VideoThumbnail",
  <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />,
);

const UnknownThumbnailIcon = createIcon(
  "UnknownThumbnail",
  <path d="M23 18V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zM8.5 12.5l2.5 3.01L14.5 11l4.5 6H5l3.5-4.5z" />,
);

function renderThumbnail({ slide, render, rect, imageFit }: RenderThumbnailProps) {
  const customThumbnail = render.thumbnail?.({ slide, render, rect, imageFit });
  if (customThumbnail) {
    return customThumbnail;
  }

  const thumbnailIconClass = cssClass(cssThumbnailPrefix(ELEMENT_ICON));

  if (isImageSlide(slide)) {
    return <ImageSlide slide={slide} render={render} rect={rect} imageFit={imageFit} />;
  }

  if (slide.type === "video") {
    return (
      <>
        {slide.poster && <ImageSlide slide={{ src: slide.poster }} render={render} rect={rect} imageFit={imageFit} />}

        <VideoThumbnailIcon className={thumbnailIconClass} />
      </>
    );
  }

  return <UnknownThumbnailIcon className={thumbnailIconClass} />;
}

const activePrefix = makeComposePrefix("active");
const fadeInPrefix = makeComposePrefix("fadein");
const fadeOutPrefix = makeComposePrefix("fadeout");
const placeholderPrefix = makeComposePrefix("placeholder");

const DELAY = "delay";
const DURATION = "duration";

export type FadeSettings = {
  duration: number;
  delay: number;
};

export type ThumbnailProps = {
  slide: Slide | null;
  onClick: () => void;
  active: boolean;
  fadeIn?: FadeSettings;
  fadeOut?: FadeSettings;
  placeholder: boolean;
  onLoseFocus: () => void;
};

export function Thumbnail({ slide, onClick, active, fadeIn, fadeOut, placeholder, onLoseFocus }: ThumbnailProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const { render, styles } = useLightboxProps();
  const { width, height, imageFit } = useThumbnailsProps();
  const rect = { width, height };

  const onLoseFocusCallback = useEventCallback(onLoseFocus);

  React.useEffect(() => {
    if (fadeOut && document.activeElement === ref.current) {
      onLoseFocusCallback();
    }
  }, [fadeOut, onLoseFocusCallback]);

  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        cssClass(CLASS_FLEX_CENTER),
        cssClass(cssThumbnailPrefix()),
        active && cssClass(cssThumbnailPrefix(activePrefix())),
        fadeIn && cssClass(cssThumbnailPrefix(fadeInPrefix())),
        fadeOut && cssClass(cssThumbnailPrefix(fadeOutPrefix())),
        placeholder && cssClass(cssThumbnailPrefix(placeholderPrefix())),
      )}
      style={{
        ...(fadeIn
          ? {
              [cssVar(cssThumbnailPrefix(fadeInPrefix(DURATION)))]: `${fadeIn.duration}ms`,
              [cssVar(cssThumbnailPrefix(fadeInPrefix(DELAY)))]: `${fadeIn.delay}ms`,
            }
          : null),
        ...(fadeOut
          ? {
              [cssVar(cssThumbnailPrefix(fadeOutPrefix(DURATION)))]: `${fadeOut.duration}ms`,
              [cssVar(cssThumbnailPrefix(fadeOutPrefix(DELAY)))]: `${fadeOut.delay}ms`,
            }
          : null),
        ...styles.thumbnail,
      }}
      onClick={onClick}
    >
      {slide && renderThumbnail({ slide, render, rect, imageFit })}
    </button>
  );
}
