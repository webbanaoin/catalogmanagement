# Event Planners & Decorators — Staging Plan and User Acceptance Tests

## Category hierarchy

Platform business type: **Event Planners & Decorators** (`event-planners-decorators`).

The platform administrator manages independent global default category nodes:

- Decoration
  - Theme-Based Decoration
    - Baby Boss Theme, Princess Theme, Jungle Theme, Panda Theme,
      Chhota Bheem Theme, Radha Krishna Theme
  - Flower Decoration
  - Haldi, Mehndi & Sangeet Decoration
  - Ring Ceremony Decoration, Wedding Decoration, Birthday Decoration
  - Stage & Backdrop Decoration, Balloon Decoration, Anniversary Decoration,
    Corporate Event Decoration
- Event Entries
  - Jhoomar Entry, Mirror with Ring Entry, Bridal Balloon Entry
  - Fireworks Entry, Cold Pyro Entry, Smoke & Fog Entry

Admin: **Business categories → Event Planners & Decorators → Manage subcategories**.
Admins can create and reorder parents/children/grandchildren, rename displayed labels
(with stable slugs), activate/deactivate safely and upload shared category images.
The three-level tree and category images are **templates**: each merchant gets
independent `ShopCategory` rows with parent links and can control their own catalog.
No automatic deletions/reparenting of existing merchants.

## Service entry workflow

Merchant: choose **Event Planners & Decorators** at registration. Once the shop is approved,
visit **Dashboard → Products** (service/package workspace). New entries default to:
- `Price Type: Ask Price`
- `Availability: On Request`
- `Service Type: Decoration`

Examples:
- `Jungle Birthday Theme Decoration` → **Decoration → Theme-Based Decoration → Jungle Theme**
- `Wedding Flower Mandap Setup` → **Decoration → Flower Decoration**
- `Jhoomar Bridal Entry Package` → **Event Entries → Jhoomar Entry**

Upload original photos of work only with appropriate client permission.
Describe inclusions, location, customization and timing in the service description,
or optional package attributes. Existing WhatsApp inquiry and Wishlist flows work.
Fireworks/pyrotechnic services require locally compliant, qualified providers.

## First release limitations

- This is a **service catalog and enquiry showroom**, not an event booking platform.
- No inventory reservation, advance payment, event calendar or contract signing.
- Display terms still follow the shared product data model in some dashboard labels.
- The hierarchy is capped at 3 levels; admins can add themes and event entry types
  without code changes.
- Initial theme names are suggestions, not promises of official character licensing.

## Deployment and tests

1. **Staging DB only:** take appropriate backup if needed, deploy staging code and
   apply migration `20261017130000_event_planner_category_tree` using the existing
   staging migration mechanism.
2. Admin → Business categories: verify the new business type exists once and the
   two roots, child categories and six third-level themes are correctly nested.
3. Try adding **Unicorn Theme** under **Theme-Based Decoration** and a new
   **Grand Entry** under **Event Entries**. Attempt a 4th-level theme, foreign parent
   and cyclic parent: all must be rejected.
4. Verify the new type appears during registration, then register/approve a demo shop.
   Dashboard → Categories: inspect parent-child links; confirm new custom admin
   defaults sync to the shop without replacing merchant customizations.
5. Add one package to Jungle Theme and one to Jhoomar Entry. Check default ASK_PRICE
   and ON_REQUEST; upload sample images through existing R2 flow.
6. Public storefront: choose Decoration → Theme-Based Decoration → Jungle Theme.
   The root and middle level should list descendant services; the final theme lists
   its package. Verify category images, mobile view and breadcrumbs.
7. Test product/service links, hidden price, Wishlist and WhatsApp enquiry.
8. Regress jewellery, Gift/Toys & Stationery, Excel imports, image upload, merchant
   tenant isolation and subscription/payment features.
9. **Do not merge to main** until manual staging tests pass.

No new runtime environment variables are required. A DB migration is required for
the new global category template parent relation. Utensils is intentionally
out of scope; it will be handled in a separate staged release.
