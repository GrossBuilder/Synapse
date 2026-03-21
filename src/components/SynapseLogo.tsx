/**
 * Synapse Logo — the S-curve synapse mark
 * Two nodes connected by an S-shaped neural pathway
 */

interface SynapseLogoProps {
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export function SynapseLogo({ size = 32, className = "", showBackground = true }: SynapseLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="synapse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {showBackground && (
        <>
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#030712" />
          <rect x="2" y="2" width="60" height="60" rx="14" stroke="url(#synapse-grad)" strokeWidth="1.5" fill="none" opacity="0.4" />
        </>
      )}

      {/* S-curve */}
      <path
        d="M 22 18 C 22 32, 32 26, 32 32 C 32 38, 42 32, 42 46"
        stroke="url(#synapse-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Top node */}
      <circle cx="22" cy="18" r="5.5" fill="url(#synapse-grad)" />

      {/* Bottom node */}
      <circle cx="42" cy="46" r="5.5" fill="url(#synapse-grad)" />

      {/* Center spark */}
      <circle cx="32" cy="32" r="2.5" fill="#a78bfa" opacity="0.8" />
    </svg>
  );
}

export function SynapseWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent ${className}`}>
      Synapse
    </span>
  );
}
