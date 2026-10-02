import { ShareButton } from "@/components/storefront/share-button";
import { buttonClassName } from "@/components/ui";
import { telephoneHref, whatsappHref } from "@/lib/storefront";

export function StorefrontActions({
  title,
  phone,
  whatsapp,
  directionsUrl,
  whatsappMessage,
}: {
  title: string;
  phone: string | null;
  whatsapp: string | null;
  directionsUrl: string | null;
  whatsappMessage?: string;
}) {
  const whatsAppLink = whatsapp ? whatsappHref(whatsapp, whatsappMessage) : null;
  const callLink = phone ? telephoneHref(phone) : null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Shop actions">
      {whatsAppLink ? (
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("primary", "sm")}
        >
          WhatsApp
        </a>
      ) : null}
      {callLink ? (
        <a href={callLink} className={buttonClassName("secondary", "sm")}>
          Call shop
        </a>
      ) : null}
      {directionsUrl ? (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName("secondary", "sm")}
        >
          Directions
        </a>
      ) : null}
      <ShareButton title={title} />
    </div>
  );
}
