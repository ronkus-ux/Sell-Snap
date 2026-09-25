/**
 * convert-tokens.js
 * 
 * Script to convert color tokens and typography tokens from JSON format into CSS variables.
 * 
 * Features:
 * - Reads color tokens from color-tokens.json and typography tokens from design-tokens.tokens.json.
 * - Extracts color roles (ignoring primitive colors) for Light and Dark themes.
 * - Generates light mode, dark mode ([data-theme="dark"]), and media query (prefers-color-scheme) CSS variables.
 * - Extracts typography tokens (font-size, font-family, font-weight, font-style, letter-spacing, line-height).
 * - Converts letter-spacing values to 'em' units relative to font-size.
 * - Outputs all CSS variables into a single tokens.css file.
 */

const fs = require('fs');
const path = require('path');

// Helper to convert camelCase, Title Case, or space-separated strings to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Format letter spacing from px to em relative to font size
function formatLetterSpacing(val, fontSize) {
  if (typeof val === 'number' && fontSize) {
    const emVal = parseFloat((val / fontSize).toFixed(4));
    return `${emVal}em`;
  }
  if (typeof val === 'number') {
    return `${val}px`;
  }
  return val;
}

// Format font family with fallbacks if needed
function formatFontFamily(family) {
  if (!family) return 'sans-serif';
  const cleanFamily = family.replace(/^"|"$/g, '');
  if (cleanFamily.toLowerCase().includes('sans-serif') || cleanFamily.toLowerCase().includes('serif') || cleanFamily.toLowerCase().includes('monospace')) {
    return `"${cleanFamily}"`;
  }
  return `"${cleanFamily}", sans-serif`;
}

// Format dimension values to px if numeric
function formatDimension(val) {
  if (typeof val === 'number') {
    return `${val}px`;
  }
  return val;
}

function generateCSS() {
  const workspaceDir = __dirname;
  const colorTokensPath = path.join(workspaceDir, 'color-tokens.json');
  const typographyTokensPath = path.join(workspaceDir, 'design-tokens.tokens.json');
  const outputPath = path.join(workspaceDir, 'tokens.css');
  const appOutputPath = path.join(workspaceDir, '..', 'sellsnap', 'tokens', 'tokens.css');

  // 1. Parse Color Tokens
  let colorTokens = {};
  if (fs.existsSync(colorTokensPath)) {
    colorTokens = JSON.parse(fs.readFileSync(colorTokensPath, 'utf8'));
  } else {
    console.warn(`Warning: ${colorTokensPath} not found.`);
  }

  // Extract color roles (filtering out primitive/palette/base colors)
  // Primitive keywords to ignore if present
  const primitiveKeywords = ['primitive', 'primitives', 'palette', 'ref', 'global', 'base', 'raw'];
  
  const colorData = colorTokens.color || colorTokens;
  const lightRoles = {};
  const darkRoles = {};

  for (const [key, value] of Object.entries(colorData)) {
    const lowerKey = key.toLowerCase();
    if (primitiveKeywords.some(p => lowerKey.includes(p))) {
      // Ignore primitive colors as specified
      continue;
    }

    if (lowerKey === 'light') {
      Object.assign(lightRoles, value);
    } else if (lowerKey === 'dark') {
      Object.assign(darkRoles, value);
    }
  }

  // Build light color variables block
  const lightColorLines = [];
  for (const [roleName, colorVal] of Object.entries(lightRoles)) {
    const varName = `--color-${toKebabCase(roleName)}`;
    lightColorLines.push(`  ${varName}: ${colorVal};`);
  }

  // Build dark color variables block
  const darkColorLines = [];
  for (const [roleName, colorVal] of Object.entries(darkRoles)) {
    const varName = `--color-${toKebabCase(roleName)}`;
    darkColorLines.push(`  ${varName}: ${colorVal};`);
  }

  // 2. Parse Typography Tokens
  let typographyTokens = {};
  if (fs.existsSync(typographyTokensPath)) {
    typographyTokens = JSON.parse(fs.readFileSync(typographyTokensPath, 'utf8'));
  } else {
    console.warn(`Warning: ${typographyTokensPath} not found.`);
  }

  const typographyLines = [];
  const fontData = typographyTokens.font || typographyTokens.typography;

  if (fontData) {
    for (const [category, variants] of Object.entries(fontData)) {
      if (typeof variants !== 'object' || !variants) continue;
      
      const catKebab = toKebabCase(category);
      const catCap = category.charAt(0).toUpperCase() + category.slice(1);
      
      typographyLines.push(`  /* ── ${catCap} ── */\n`);

      for (const [variantName, variantObj] of Object.entries(variants)) {
        if (typeof variantObj !== 'object' || !variantObj) continue;

        // Determine value object structure (Figma tokens format or DTCG format)
        let valObj = variantObj.value || variantObj;

        // If DTCG format where properties are objects with .value
        const fontSizeRaw = valObj.fontSize?.value !== undefined ? valObj.fontSize.value : valObj.fontSize;
        const fontFamilyRaw = valObj.fontFamily?.value !== undefined ? valObj.fontFamily.value : valObj.fontFamily;
        const fontWeightRaw = valObj.fontWeight?.value !== undefined ? valObj.fontWeight.value : valObj.fontWeight;
        const fontStyleRaw = valObj.fontStyle?.value !== undefined ? valObj.fontStyle.value : valObj.fontStyle;
        const letterSpacingRaw = valObj.letterSpacing?.value !== undefined ? valObj.letterSpacing.value : valObj.letterSpacing;
        const lineHeightRaw = valObj.lineHeight?.value !== undefined ? valObj.lineHeight.value : valObj.lineHeight;

        const variantKebab = toKebabCase(variantName);
        const prefix = `--font-${catKebab}-${variantKebab}`;

        typographyLines.push(`  /* ${variantName} */`);
        
        if (fontSizeRaw !== undefined) {
          typographyLines.push(`  ${prefix}-font-size: ${formatDimension(fontSizeRaw)};`);
        }
        if (fontFamilyRaw !== undefined) {
          typographyLines.push(`  ${prefix}-font-family: ${formatFontFamily(fontFamilyRaw)};`);
        }
        if (fontWeightRaw !== undefined) {
          typographyLines.push(`  ${prefix}-font-weight: ${fontWeightRaw};`);
        }
        if (fontStyleRaw !== undefined) {
          typographyLines.push(`  ${prefix}-font-style: ${fontStyleRaw};`);
        }
        if (letterSpacingRaw !== undefined) {
          typographyLines.push(`  ${prefix}-letter-spacing: ${formatLetterSpacing(letterSpacingRaw, fontSizeRaw)};`);
        }
        if (lineHeightRaw !== undefined) {
          typographyLines.push(`  ${prefix}-line-height: ${formatDimension(lineHeightRaw)};`);
        }

        typographyLines.push(''); // blank line between variants
      }
    }
  }

  // 3. Assemble CSS output
  const now = new Date().toISOString();
  const cssContent = `/**
 * tokens.css — Generated Design Tokens
 * Auto-generated by convert-tokens.js on ${now}
 * DO NOT EDIT THIS FILE MANUALLY — edit the JSON source files instead.
 *
 * Usage:
 *   Color roles   → var(--color-<role-name>)
 *   Typography    → var(--font-<category>-<variant>-<property>)
 *
 * Dark mode is toggled via [data-theme="dark"] on <html> or <body>,
 * and also respects prefers-color-scheme automatically.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   COLOR ROLES — Light (default)
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
${lightColorLines.join('\n')}
}


/* ═══════════════════════════════════════════════════════════════════════════
   COLOR ROLES — Dark
   Applied when [data-theme="dark"] is set on <html> or <body>.
   Also applied automatically when the OS is in dark mode (unless the user
   has explicitly toggled to light mode via the data attribute).
   ═══════════════════════════════════════════════════════════════════════════ */

[data-theme="dark"] {
${darkColorLines.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkColorLines.map(line => '  ' + line).join('\n')}
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   TYPOGRAPHY TOKENS
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
${typographyLines.join('\n')}
}
`;

  fs.writeFileSync(outputPath, cssContent, 'utf8');
  console.log(`Successfully generated tokens.css at ${outputPath}`);

  try {
    fs.writeFileSync(appOutputPath, cssContent, 'utf8');
    console.log(`Successfully copied tokens.css to Next.js app at ${appOutputPath}`);
  } catch (err) {
    console.error(`Failed to copy tokens.css to Next.js app:`, err);
  }
}

generateCSS();
