# Frontend Design Patterns Quick Reference

For complete theme token tables (colors, typography, spacing, shadows, border radius) and component theme variant comparisons, see the **theming** skill's `references/theming-patterns.md`.

## Common `::part()` Selectors

### Grid
```css
vaadin-grid::part(header-cell)     /* Header cells */
vaadin-grid::part(body-cell)       /* Body cells */
vaadin-grid::part(row)             /* All rows */
vaadin-grid::part(even-row)        /* Even rows (zebra) */
vaadin-grid::part(odd-row)         /* Odd rows */
vaadin-grid::part(selected-row)    /* Selected rows */
vaadin-grid::part(first-column-cell) /* First column */
```

### Dialog
```css
vaadin-dialog-overlay::part(overlay)   /* Dialog container */
vaadin-dialog-overlay::part(content)   /* Dialog content */
vaadin-dialog-overlay::part(header)    /* Dialog header */
vaadin-dialog-overlay::part(footer)    /* Dialog footer */
vaadin-dialog-overlay::part(backdrop)  /* Background overlay */
```

### TextField / Input Components
```css
vaadin-text-field::part(input-field)    /* Input container */
vaadin-text-field::part(label)          /* Label text */
vaadin-text-field::part(helper-text)    /* Helper text */
vaadin-text-field::part(error-message)  /* Error text */
```

### Button
```css
vaadin-button::part(label)   /* Button label text */
vaadin-button::part(prefix)  /* Prefix slot area */
vaadin-button::part(suffix)  /* Suffix slot area */
```

## CSS Animation Recipes

### Fade in from bottom
```css
.fade-in-up {
    animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}
```

### Scale in
```css
.scale-in {
    animation: scaleIn 0.2s ease-out;
}
@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
```

### Staggered children
```css
.stagger > * {
    animation: fadeInUp 0.3s ease-out backwards;
}
.stagger > *:nth-child(1) { animation-delay: 0.05s; }
.stagger > *:nth-child(2) { animation-delay: 0.1s; }
.stagger > *:nth-child(3) { animation-delay: 0.15s; }
.stagger > *:nth-child(4) { animation-delay: 0.2s; }
.stagger > *:nth-child(5) { animation-delay: 0.25s; }
.stagger > *:nth-child(6) { animation-delay: 0.3s; }
```

### Hover lift
```css
.hover-lift {
    transition: box-shadow 0.2s ease, transform 0.2s ease;
    cursor: pointer;
}
.hover-lift:hover {
    box-shadow: 0 4px 8px -2px rgba(0,0,0,0.1);
    transform: translateY(-2px);
}
```

### Smooth color transition
```css
.color-transition {
    transition: background-color 0.2s ease, color 0.2s ease;
}
```

## Color Palette Recipes

### Professional Blue

**Aura:**
```css
html {
    --aura-accent-color-light: hsl(215, 75%, 50%);
    --aura-accent-color-dark: hsl(215, 75%, 65%);
    --aura-blue: hsl(215, 75%, 50%);
}
```

**Lumo:**
```css
html {
    --lumo-primary-color: hsl(215, 75%, 50%);
    --lumo-primary-color-50pct: hsla(215, 75%, 50%, 0.5);
    --lumo-primary-color-10pct: hsla(215, 75%, 50%, 0.1);
    --lumo-primary-text-color: hsl(215, 75%, 45%);
}
```

### Warm Terracotta

**Aura:**
```css
html {
    --aura-accent-color-light: hsl(15, 65%, 52%);
    --aura-accent-color-dark: hsl(15, 65%, 65%);
    --aura-orange: hsl(15, 65%, 52%);
}
```

**Lumo:**
```css
html {
    --lumo-primary-color: hsl(15, 65%, 52%);
    --lumo-primary-color-50pct: hsla(15, 65%, 52%, 0.5);
    --lumo-primary-color-10pct: hsla(15, 65%, 52%, 0.1);
    --lumo-primary-text-color: hsl(15, 65%, 42%);
}
```

### Deep Teal

**Aura:**
```css
html {
    --aura-accent-color-light: hsl(175, 60%, 38%);
    --aura-accent-color-dark: hsl(175, 60%, 55%);
    --aura-green: hsl(175, 60%, 38%);
}
```

**Lumo:**
```css
html {
    --lumo-primary-color: hsl(175, 60%, 38%);
    --lumo-primary-color-50pct: hsla(175, 60%, 38%, 0.5);
    --lumo-primary-color-10pct: hsla(175, 60%, 38%, 0.1);
    --lumo-primary-text-color: hsl(175, 60%, 32%);
}
```

### Vivid Purple

**Aura:**
```css
html {
    --aura-accent-color-light: hsl(270, 65%, 55%);
    --aura-accent-color-dark: hsl(270, 65%, 70%);
    --aura-purple: hsl(270, 65%, 55%);
}
```

**Lumo:**
```css
html {
    --lumo-primary-color: hsl(270, 65%, 55%);
    --lumo-primary-color-50pct: hsla(270, 65%, 55%, 0.5);
    --lumo-primary-color-10pct: hsla(270, 65%, 55%, 0.1);
    --lumo-primary-text-color: hsl(270, 65%, 45%);
}
```
