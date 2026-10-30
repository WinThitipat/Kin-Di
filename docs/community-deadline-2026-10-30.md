# Community deadline release — 2026-10-30

Completed the three agreed usability changes for the presentation release.

- Each recipe row now has one “ดูเมนู” link. A native expandable details control holds source, edit, share and delete actions. Escape closes it and returns focus. The options expand in flow, avoiding clipped popovers inside the recipe list. Admin PIN checks remain unchanged.
- Below 1024px, separate “เพิ่มสูตร” and “ดูเมนูที่แบ่งปัน” views give direct access without scrolling through the form. The form stays mounted, preserving inputs and current step. Editing a recipe returns to the form after confirmation.
- Ingredient entry now supports Thai-name search, a no-results message and removable selected ingredient chips. Existing custom ingredients, allergen fields and validation remain intact.

Validation: production build; existing mobile touch and desktop form flow extended to cover tab persistence, ingredient search/removal, management disclosure and edit return; six responsive widths (320,390,600,768,1024,1440), collection search and load more. Mock API tests do not create live recipes. Taste app inspector screenshots reviewed; established palette and approved banner retained. No new dependencies or database migrations.
