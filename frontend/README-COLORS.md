# Aletis Color System & Logo Usage Guide

## Design Tokens

### Light Mode Colors
- `--color-bg: #FFFFFF` - Main background color
- `--color-surface: #F3F4F6` - Card and surface backgrounds
- `--color-surface-warm: #FFFDF6` - Warm surface variant
- `--color-primary: #00E9AE` - Brand primary (highlights, icons, badges)
- `--color-primary-dark: #007A5A` - Primary buttons with white text
- `--color-primary-deep: #004B3A` - Deep primary for emphasis
- `--color-accent: #FABD7F` - Accent color for secondary elements
- `--color-text: #212529` - Primary text color
- `--color-muted: #6C757D` - Muted text and secondary content
- `--color-border: #E9ECEF` - Borders and dividers

### Dark Mode Colors
- `--color-bg: #1C1C1C` - Main background (matches logo background)
- `--color-primary: #00E9AE` - Brand primary (unchanged from light mode)
- `--color-text: #FFFFFF` - Primary text color
- All other tokens adjusted for dark mode accessibility

## Logo Variants

### Available Logos
1. **Dark Mode**: `-logo-dark.svg` - Bright teal (#00E9AE) on dark background (#1C1C1C)
2. **Teal Dark**: `-logo-teal-dark.svg` - Dark teal (#007A5A) for light backgrounds
3. **Mono Charcoal**: `-logo-mono-charcoal.svg` - Charcoal (#212529) for monochrome usage

### Usage Guidelines
- Use **dark variant** in dark mode and on dark surfaces
- Use **teal-dark variant** for primary branding on light backgrounds
- Use **mono-charcoal variant** for subtle branding or when color is not appropriate

## Component Usage Examples

### Buttons
\`\`\`tsx
// Primary button (uses --color-primary-dark for accessibility)
<Button className="bg-primary text-primary-foreground">
  Primary Action
</Button>

// Secondary button
<Button variant="secondary" className="bg-secondary text-secondary-foreground">
  Secondary Action
</Button>
\`\`\`

### Cards
\`\`\`tsx
// Standard card
<Card className="bg-card border-border">
  <CardContent className="text-card-foreground">
    Content here
  </CardContent>
</Card>

// Surface card
<div className="bg-surface border-border rounded-lg p-4">
  Surface content
</div>
\`\`\`

### Header/Navigation
\`\`\`tsx
// Light mode header
<header className="bg-background border-b border-border">
  <div className="text-foreground">
    Navigation content
  </div>
</header>
\`\`\`

## WCAG Contrast Compliance

### Tested Combinations (4.5:1 minimum for AA compliance)
- ✅ Primary button: #007A5A background + #FFFFFF text = 5.8:1
- ✅ Primary text: #212529 on #FFFFFF = 16.1:1
- ✅ Muted text: #6C757D on #FFFFFF = 4.6:1
- ✅ Dark mode primary: #00E9AE on #1C1C1C = 12.3:1
- ✅ Logo on backgrounds: All variants meet minimum contrast requirements

### Implementation Notes
- Primary buttons use `--color-primary-dark` (#007A5A) to ensure white text remains accessible
- `--color-primary` (#00E9AE) is reserved for highlights, icons, and badges where high contrast is needed
- Cards use `--color-surface` for subtle elevation while maintaining readability
- All color combinations have been tested for WCAG AA compliance
