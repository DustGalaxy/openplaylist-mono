# Theme Creation Guide (Color System v2)

Design system guide for building balanced, accessible UI themes. Outlines token architecture, color harmonies, WCAG 2.1 contrast guidelines, and anti-patterns.

---

## 01 — Architecture: Theme Token Structure

A theme comprises 7 tokens with distinct visual roles:

* **`level1` (Base Canvas):** The deepest dark or lightest light layer. Page canvas.
  - *Dark rule:* $S = 20\text{–}55\%$, $L = 5\text{–}8\%$ · *Light rule:* $L = 94\text{–}100\%$

* **`level2` (Surface Layer):** Cards, panels, sidebars, modals. Always layered above `level1`.
  - *Dark rule:* $L$ is $5\text{–}8\%$ lighter than `level1` · *Light rule:* $L$ is $5\text{–}8\%$ darker than `level1`

* **`level3` (Primary Accent):** Buttons, active controls, icons, focus rings. Anchor point of the palette.
  - *Rule:* Fixed anchor. Surrounding palettes derive from its Hue.

* **`level4` (Tint Overlay):** Translucent backdrop for selections, hover states, tint cards.
  - *Rule:* `= level3 + opacity 0.10–0.18`. Not a disconnected custom color.

* **`textMain` (Primary Text):** Headings, body text, critical data.
  - *Rule:* Contrast against `level2`: $\ge 7.0:1$ (WCAG AAA)

* **`textSecondary` (Secondary Text):** Labels, subtitles, timestamps, descriptions.
  - *Rule:* Contrast against `level2`: $\ge 4.5:1$ (WCAG AA)

* **`textPlaceholder` (Placeholder Text):** Form placeholders and hints.
  - *Rule:* `= textMain + opacity 0.35–0.45`. Always derived from `textMain`.

---

## 02 — Construction Process & Color Harmonies

1. Anchor `level3` $\rightarrow$ 2. Define harmony $\rightarrow$ 3. Derive HSL surfaces $\rightarrow$ 4. Tint text $\rightarrow$ 5. Validate contrast

### Harmonies for Surfaces

Surfaces should carry intentional tinting rather than neutral grayscale:
* **Monochromatic:** Backgrounds share the exact Hue of `level3`, adjusting only Lightness and Saturation.
* **Analogous:** Backgrounds shifted by $\pm 20\text{–}40^\circ$ on the color wheel.
* **Split-Complementary:** Backgrounds shifted by $\sim 150^\circ$ from the accent, maximizing visual pop.

### HSL Layer Ranges
* **L1 (dark):** $L: 5\text{–}8\%$ · $S: 25\text{–}55\%$
* **L2 (dark):** $L: 12\text{–}16\%$ · $S$: slightly lower than L1
* **L2 (light):** $L: 84\text{–}92\%$ · $S: 15\text{–}40\%$
* **L1 (light):** $L: 94\text{–}100\%$ · $S: 0\text{–}20\%$

---

## 03 — Accessibility & WCAG 2.1 Requirements

| Color Pair | Minimum Ratio | Level | Target Element |
| --- | --- | --- | --- |
| `textMain` on `level2` | 7.0:1 | **WCAG AAA** | Headings, body text |
| `textSecondary` on `level2` | 4.5:1 | **WCAG AA** | Labels, captions |
| White on `level3` | 3.0:1 | **WCAG AA Large** | Button text $\ge 18\text{px}$ / bold $14\text{px}$ |
| `textMain` on `level1` | 4.5:1 | **WCAG AA** | Canvas body text |
| `level3` on `level2` | 3.0:1 | **WCAG AA Large** | Borders, active indicators |

---

## 04 — Checklist Before Publication

* [ ] Surfaces `level1`/`level2` are tinted relative to `level3` Hue.
* [ ] `level2` separates from `level1` by $\ge 5\%\ L$ and $\ge 3\%\ S$.
* [ ] `textMain` / `level2` $\ge 7:1$ · `textSecondary` / `level2` $\ge 4.5:1$.
* [ ] White on `level3` $\ge 3:1$ verified via WCAG luminance calculation.
* [ ] `textMain` tinted toward `level3` Hue rather than plain `#ffffff` / `#000000`.
* [ ] `textPlaceholder` = `textMain` + opacity 0.35–0.45.
* [ ] `level4` = `level3` + opacity 0.10–0.18.
