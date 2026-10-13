export interface CatalogAttributePreset {
  name: string;
  label: string;
  placeholder?: string;
  options?: string[];
  optionsByGroup?: Record<string, string[]>;
  visibleForGroups?: string[];
}

export interface CatalogPreset {
  key: string;
  groupLabel: string;
  groups: string[];
  primaryFilterAttribute?: string;
  attributes: CatalogAttributePreset[];
}

const DEFAULT_PRESET: CatalogPreset = {
  key: "general",
  groupLabel: "Collection",
  groups: [],
  attributes: [
    { name: "Brand", label: "Brand", placeholder: "Optional brand" },
    { name: "Specification", label: "Specification", placeholder: "Size, model, material, etc." },
  ],
};

const PRESETS: Array<{
  matches: string[];
  preset: CatalogPreset;
}> = [
  {
    matches: ["jewellery", "jewelry", "jeweller", "jeweler"],
    preset: {
      key: "jewellery",
      groupLabel: "Jewellery Type",
      groups: ["Gold", "Silver", "Diamond", "Platinum", "Imitation / Fashion"],
      primaryFilterAttribute: "Purity",
      attributes: [
        {
          name: "Purity",
          label: "Purity",
          placeholder: "Select purity",
          visibleForGroups: ["Gold", "Silver", "Platinum"],
          optionsByGroup: {
            Gold: ["24K", "22K", "20K", "18K", "14K"],
            Silver: ["999 Silver", "925 Silver", "900 Silver", "800 Silver"],
            Platinum: ["999 Platinum", "950 Platinum", "900 Platinum", "850 Platinum"],
          },
        },
        { name: "Weight", label: "Weight", placeholder: "e.g. 6.4 g" },
        {
          name: "Diamond Carat",
          label: "Diamond Carat",
          placeholder: "e.g. 0.50 ct",
          visibleForGroups: ["Diamond"],
        },
        {
          name: "Gender",
          label: "For",
          options: ["Women", "Men", "Unisex", "Kids"],
        },
      ],
    },
  },
  {
    matches: ["toy", "gift"],
    preset: {
      key: "toys-gifts",
      groupLabel: "Department",
      groups: ["Toys", "Gifts", "Return Gifts", "Party", "Home Decor"],
      primaryFilterAttribute: "Age Group",
      attributes: [
        {
          name: "Age Group",
          label: "Age Group",
          options: ["0-2 Years", "3-5 Years", "6-8 Years", "9-12 Years", "13+ Years", "All Ages"],
        },
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Material", label: "Material", placeholder: "e.g. Plastic, Wood, Plush" },
      ],
    },
  },
  {
    matches: ["garment", "clothing", "apparel", "fashion", "boutique"],
    preset: {
      key: "garments",
      groupLabel: "For",
      groups: ["Men", "Women", "Kids", "Unisex"],
      primaryFilterAttribute: "Size",
      attributes: [
        { name: "Size", label: "Size", placeholder: "e.g. M, L, XL", options: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"] },
        { name: "Color", label: "Color", placeholder: "e.g. Black" },
        { name: "Fabric", label: "Fabric", placeholder: "e.g. Cotton" },
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
      ],
    },
  },
  {
    matches: ["footwear", "shoe", "shoes"],
    preset: {
      key: "footwear",
      groupLabel: "For",
      groups: ["Men", "Women", "Kids", "Unisex"],
      primaryFilterAttribute: "Size",
      attributes: [
        { name: "Size", label: "Size", placeholder: "e.g. UK 8" },
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Color", label: "Color", placeholder: "e.g. Black" },
        { name: "Material", label: "Material", placeholder: "e.g. Leather" },
      ],
    },
  },
  {
    matches: ["utensil", "kitchenware", "cookware", "steel utensil"],
    preset: {
      key: "utensils-kitchenware",
      groupLabel: "Collection",
      groups: ["Cookware", "Dining", "Serveware", "Storage", "Kitchen Tools"],
      primaryFilterAttribute: "Material",
      attributes: [
        {
          name: "Material",
          label: "Material",
          options: ["Stainless Steel", "Aluminium", "Cast Iron", "Copper", "Brass", "Non-stick", "Glass", "Plastic"],
        },
        { name: "Capacity", label: "Capacity", placeholder: "e.g. 2 L" },
        { name: "Size", label: "Size", placeholder: "e.g. 24 cm" },
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
      ],
    },
  },
  {
    matches: ["electronic", "mobile", "computer", "appliance"],
    preset: {
      key: "electronics",
      groupLabel: "Department",
      groups: ["Mobiles", "Computers", "TV & Audio", "Home Appliances", "Accessories"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "e.g. Samsung" },
        { name: "Model", label: "Model", placeholder: "Model number/name" },
        { name: "Warranty", label: "Warranty", placeholder: "e.g. 1 Year" },
      ],
    },
  },
  {
    matches: ["grocery", "supermarket", "supermart", "kirana"],
    preset: {
      key: "grocery",
      groupLabel: "Department",
      groups: ["Staples", "Snacks", "Beverages", "Personal Care", "Household"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Pack Size", label: "Pack Size", placeholder: "e.g. 1 kg / 500 ml" },
      ],
    },
  },
  {
    matches: ["cosmetic", "beauty", "salon"],
    preset: {
      key: "beauty",
      groupLabel: "Department",
      groups: ["Makeup", "Skincare", "Haircare", "Fragrance", "Personal Care"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Shade", label: "Shade", placeholder: "Color/shade if applicable" },
        { name: "Size", label: "Size / Volume", placeholder: "e.g. 50 ml" },
      ],
    },
  },
  {
    matches: ["furniture", "home decor", "decor"],
    preset: {
      key: "home-furniture",
      groupLabel: "Room / Collection",
      groups: ["Living Room", "Bedroom", "Dining", "Office", "Decor"],
      primaryFilterAttribute: "Material",
      attributes: [
        { name: "Material", label: "Material", placeholder: "e.g. Teak Wood" },
        { name: "Dimensions", label: "Dimensions", placeholder: "e.g. 120 x 60 x 75 cm" },
        { name: "Color", label: "Color / Finish", placeholder: "e.g. Walnut" },
      ],
    },
  },
  {
    matches: ["hardware", "electrical", "plumbing", "paint"],
    preset: {
      key: "hardware",
      groupLabel: "Department",
      groups: ["Tools", "Electrical", "Plumbing", "Paint", "Fasteners"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Specification", label: "Specification / Size", placeholder: "e.g. 10 mm" },
      ],
    },
  },
  {
    matches: ["auto", "automobile", "vehicle", "spare part"],
    preset: {
      key: "auto-parts",
      groupLabel: "Vehicle Type",
      groups: ["Car", "Two Wheeler", "Commercial Vehicle", "Universal"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "Part brand" },
        { name: "Compatibility", label: "Compatible Model", placeholder: "e.g. Swift 2018-2024" },
        { name: "Part Number", label: "Part Number", placeholder: "Manufacturer part number" },
      ],
    },
  },
  {
    matches: ["book", "stationery"],
    preset: {
      key: "books-stationery",
      groupLabel: "Department",
      groups: ["Books", "School Supplies", "Office Supplies", "Art & Craft"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand / Publisher", placeholder: "Brand or publisher" },
        { name: "Class / Level", label: "Class / Level", placeholder: "If applicable" },
      ],
    },
  },
  {
    matches: ["sports", "fitness"],
    preset: {
      key: "sports",
      groupLabel: "Department",
      groups: ["Fitness", "Cricket", "Football", "Badminton", "Sportswear", "Accessories"],
      primaryFilterAttribute: "Brand",
      attributes: [
        { name: "Brand", label: "Brand", placeholder: "Optional brand" },
        { name: "Size", label: "Size", placeholder: "If applicable" },
      ],
    },
  },
];

function normalized(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function getCatalogPreset(input?: {
  slug?: string | null;
  name?: string | null;
} | null): CatalogPreset {
  const haystack = `${normalized(input?.slug)} ${normalized(input?.name)}`;

  for (const item of PRESETS) {
    if (item.matches.some((match) => haystack.includes(match))) {
      return item.preset;
    }
  }

  return DEFAULT_PRESET;
}

export function catalogAttributesForGroup(
  preset: CatalogPreset,
  catalogGroup?: string | null,
): CatalogAttributePreset[] {
  const group = (catalogGroup ?? "").trim();

  return preset.attributes.filter((attribute) => {
    if (!attribute.visibleForGroups?.length) return true;
    if (!group) return false;
    return attribute.visibleForGroups.includes(group);
  });
}

export function catalogAttributeOptions(
  attribute: CatalogAttributePreset,
  catalogGroup?: string | null,
): string[] {
  const group = (catalogGroup ?? "").trim();
  if (group && attribute.optionsByGroup?.[group]) {
    return attribute.optionsByGroup[group] ?? [];
  }
  return attribute.options ?? [];
}

export function catalogGroupSuggestions(input?: {
  slug?: string | null;
  name?: string | null;
} | null): string[] {
  return getCatalogPreset(input).groups;
}
