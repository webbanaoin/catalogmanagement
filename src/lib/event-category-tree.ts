// Initial *suggestions* for the Event Planners & Decorators business type.
// Once imported, the database is authoritative. Administrators may add or
// disable categories and themes without a code deployment.
export const EVENT_BUSINESS_SLUG = "event-planners-decorators";

export type EventCategoryDefinition = {
  name: string;
  parentSlug: string | null;
};

export const EVENT_CATEGORY_TREE: readonly EventCategoryDefinition[] = [
  { name: "Decoration", parentSlug: null },
  { name: "Event Entries", parentSlug: null },

  { name: "Theme-Based Decoration", parentSlug: "decoration" },
  { name: "Flower Decoration", parentSlug: "decoration" },
  { name: "Haldi, Mehndi & Sangeet Decoration", parentSlug: "decoration" },
  { name: "Ring Ceremony Decoration", parentSlug: "decoration" },
  { name: "Wedding Decoration", parentSlug: "decoration" },
  { name: "Birthday Decoration", parentSlug: "decoration" },
  { name: "Stage & Backdrop Decoration", parentSlug: "decoration" },
  { name: "Balloon Decoration", parentSlug: "decoration" },
  { name: "Anniversary Decoration", parentSlug: "decoration" },
  { name: "Corporate Event Decoration", parentSlug: "decoration" },

  { name: "Baby Boss Theme", parentSlug: "theme-based-decoration" },
  { name: "Princess Theme", parentSlug: "theme-based-decoration" },
  { name: "Jungle Theme", parentSlug: "theme-based-decoration" },
  { name: "Panda Theme", parentSlug: "theme-based-decoration" },
  { name: "Chhota Bheem Theme", parentSlug: "theme-based-decoration" },
  { name: "Radha Krishna Theme", parentSlug: "theme-based-decoration" },

  { name: "Jhoomar Entry", parentSlug: "event-entries" },
  { name: "Mirror with Ring Entry", parentSlug: "event-entries" },
  { name: "Bridal Balloon Entry", parentSlug: "event-entries" },
  { name: "Fireworks Entry", parentSlug: "event-entries" },
  { name: "Cold Pyro Entry", parentSlug: "event-entries" },
  { name: "Smoke & Fog Entry", parentSlug: "event-entries" },
];
