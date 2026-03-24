import React from "react";

/**
 * Full-width cinematic image divider between sections.
 * Creates a professional "parallax-like" visual break.
 */
const ImageDivider = ({ src, alt, quote, height = "h-[50vh]" }) => {
  return (
    <div className={`relative ${height} w-full overflow-hidden`}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
      />
      {/* Cinematic overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50"></div>
      
      {/* Optional centered quote */}
      {quote && (
        <div className="relative z-10 flex items-center justify-center h-full px-4">
          <p className="text-white text-2xl md:text-4xl font-light italic text-center max-w-3xl leading-relaxed drop-shadow-lg">
            "{quote}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageDivider;
