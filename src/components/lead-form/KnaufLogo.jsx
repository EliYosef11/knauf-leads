import React, { useState } from 'react';

export default function KnaufLogo({ className = "", size = "md" }) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    sm: { main: "h-8", statement: "h-6", text: "text-xl" },
    md: { main: "h-12", statement: "h-7", text: "text-3xl" },
    lg: { main: "h-16", statement: "h-9", text: "text-4xl" },
    xl: { main: "h-20", statement: "h-10", text: "text-5xl" }
  };

  const currentSizes = sizes[size] || sizes.md;

  return (
    <div className={`flex items-end gap-3 ${className}`}>
      {imgError ? (
        <span className={`font-bold text-white tracking-widest ${currentSizes.text}`} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.15em' }}>
          KNAUF
        </span>
      ) : (
        <img
          src="https://media.base44.com/images/public/6a15a08fdeebfd8254f3814d/25e6708d9_KNAUFLogo2024WhitesRGB.png"
          alt="KNAUF"
          className={`${currentSizes.main} w-auto object-contain`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}