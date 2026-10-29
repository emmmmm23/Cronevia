# Cronevia appearance

Vintage is the default brand: sepia-brown ink, aged parchment, warm borders, serif headings, and restrained handwritten details. Design mobile first; the public landing page uses the same identity with a paper notebook illustration and responsive feature cards.

The canonical vintage colors live in `frontend/src/style.css` under the vintage-only root selector. `frontend/scripts/theme-colors.mjs` maps existing shared brand and surface colors to these tokens during CSS compilation. This lets older app pages share the brown identity without replacing their layouts. Unset vintage tokens fall back to the existing light palette, and dark colors keep their separate adaptations. Error and success colors retain their meaning.

Appearance preferences still use `vintage`, `light`, and `dark`. Choosing a mode applies it immediately and retains the existing account preference behavior. A missing preference selects vintage; the initial HTML also receives the vintage colors before the app initializes.

Saved tracker paper and ink, custom avatar frame values, photos, and other user artwork are content, not brand tokens. Keep those values intact. The decorative landing notebook has its own light paper so it stays recognizable across appearance modes.

Verify phone layouts at 320px and 390px as well as desktop. The landing browser suite checks public access, destination links, default colors, all three themes, and preservation of a custom notebook palette. The settings theme tests cover immediate switching and persistence across navigation.
