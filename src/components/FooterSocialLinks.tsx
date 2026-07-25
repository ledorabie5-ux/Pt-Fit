import React from "react";
import { Instagram } from "lucide-react";

export function FooterSocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {/* Instagram Button */}
      <a
        href="https://www.instagram.com/fitrep_?igsh=MTI5NmZhbzJmb3N2dw=="
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram (@fitrep_)"
        title="Instagram - @fitrep_"
        className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-pink-500/50 hover:bg-neutral-800/80 text-neutral-400 hover:text-pink-400 transition-all duration-200 shadow-sm"
      >
        <Instagram className="h-4 w-4 transition-transform group-hover:scale-110 text-pink-500/90" />
        <span className="text-xs font-medium text-neutral-300 group-hover:text-pink-300">
          Instagram
        </span>
      </a>

      {/* TikTok Button */}
      <a
        href="https://www.tiktok.com/@pt_fitvideos?_r=1&_t=ZS-98KdbwlcHR4"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok (@pt_fitvideos)"
        title="TikTok - @pt_fitvideos"
        className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/50 hover:bg-neutral-800/80 text-neutral-400 hover:text-cyan-400 transition-all duration-200 shadow-sm"
      >
        <svg
          className="h-4 w-4 fill-current transition-transform group-hover:scale-110 text-cyan-400/90"
          viewBox="0 0 24 24"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.33 6.33 0 0 0 9.33 22a6.33 6.33 0 0 0 6.33-6.33V9.05a8.16 8.16 0 0 0 4.93 1.63V7.23a4.85 4.85 0 0 1-1-.05z" />
        </svg>
        <span className="text-xs font-medium text-neutral-300 group-hover:text-cyan-300">
          TikTok
        </span>
      </a>
    </div>
  );
}
