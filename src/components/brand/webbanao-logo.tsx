import Image from "next/image";

const LOGO_SRC = "/branding/webbanao-digital-showroom-logo.webp";

/** The supplied green Webbanao Digital Showroom logo. */
export function WebbanaoLogo({ compact = false }: { compact?: boolean }) {
  if (!compact) {
    return (
      <Image
        src={LOGO_SRC}
        alt="Webbanao Digital Showroom"
        width={260}
        height={178}
        priority
        className="block h-auto w-[142px] sm:w-[170px]"
      />
    );
  }

  // Crop two views of the stacked artwork into a horizontal header/footer
  // lockup, retaining the original supplied icon, lettering and tagline.
  return (
    <span className="inline-flex h-11 shrink-0 items-center gap-2" role="img" aria-label="Webbanao Digital Showroom">
      <span className="relative block h-[35px] w-14 shrink-0 overflow-hidden" aria-hidden="true">
        <Image src={LOGO_SRC} alt="" width={260} height={178} className="pointer-events-none absolute -left-[10px] -top-[3px] h-auto w-[83px] max-w-none" />
      </span>
      <span className="relative block h-11 w-[172px] shrink-0 overflow-hidden" aria-hidden="true">
        <Image src={LOGO_SRC} alt="" width={260} height={178} className="pointer-events-none absolute -left-[3px] -top-[72px] h-auto w-[165px] max-w-none" />
      </span>
    </span>
  );
}
