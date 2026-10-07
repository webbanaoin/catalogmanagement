export function WebbanaoLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5" aria-label="Webbanao">
      <svg
        className={compact ? "h-9 w-10 shrink-0" : "h-11 w-12 shrink-0"}
        viewBox="0 0 96 82"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wb-blue" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#12B9FF" />
            <stop offset=".55" stopColor="#1677F2" />
            <stop offset="1" stopColor="#6538F5" />
          </linearGradient>
          <linearGradient id="wb-orange" x1="35" y1="72" x2="88" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF3D00" />
            <stop offset="1" stopColor="#FF9D00" />
          </linearGradient>
        </defs>
        <path
          d="M7 19h16l10 36 11-29h13l9 29 9-36h15L73 70H58L50 45l-9 25H25L7 19Z"
          fill="url(#wb-blue)"
        />
        <path
          d="M26 73c21-5 38-18 50-38l-8-1 20-15-3 25-6-7C66 57 48 69 26 73Z"
          fill="url(#wb-orange)"
        />
        <rect x="75" y="6" width="9" height="9" rx="2" fill="#12B9FF" />
        <rect x="86" y="13" width="7" height="7" rx="1.5" fill="#FF8A00" />
        <rect x="76" y="18" width="5" height="5" rx="1" fill="#1677F2" />
      </svg>

      <div className="leading-none">
        <div className={compact ? "text-lg font-bold tracking-tight" : "text-xl font-bold tracking-tight"}>
          <span className="text-sky-500">Web</span>
          <span className="text-indigo-600">Banao</span>
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Digital Showroom for Every Shop
        </div>
      </div>
    </div>
  );
}
