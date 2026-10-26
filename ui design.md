# FileWala UI/UX Design System Specification (`ui design.md`)
> **Gold Standard Reference**: Image Compressor (`/compress-image`)  
> **Platform**: FileWalaTool.com (100% Client-Side Privacy-First Web Utility)  
> **Tech Stack**: React 18+, Vite, TypeScript, Tailwind CSS, Lucide Icons  
> **Architecture Core**: In-Browser RAM execution, zero server uploads, 2D flat unboxed design, hardened SSR SEO.

---

## 1. Design Philosophy & Architectural Rules

### 1.1 The "Unboxed & Minimalist 2D Flat" Rule
- **No Box-in-a-Box Nesting**: Never wrap dropzones, guides, or feature cards inside redundant outer border containers (e.g., avoid `rounded-xl border p-8 bg-white` wrapping an inner `border border-dashed rounded-xl`). Dropzones and content sections must sit directly on the page canvas.
- **2D Flat Elevation**: Avoid heavy drop-shadows (`shadow-xl`, `shadow-2xl`) or glossy 3D gradients. Use crisp borders (`border-zinc-200` in light, `border-zinc-800` in dark) and subtle micro-shadows (`shadow-xs`) only on active segmented toggle states.
- **Zero Redundant Copy**: Subtitles must be exactly 1 to 2 concise lines. Do not show boilerplate instructional text above the interactive canvas; reserve in-depth educational material for the post-tool SEO guide section.
- **Privacy First Visibility**: Every tool must display the 100% Client-Side In-Browser RAM badge prominently before user interaction.

---

## 2. Master Color Token Palette

### 2.1 Surface & Neutral Backgrounds
| Token Role | Light Mode Tailwind | Dark Mode Tailwind | Description |
| :--- | :--- | :--- | :--- |
| **Page Canvas** | `bg-white` / `bg-zinc-50/50` | `bg-zinc-950` | Root background for tool views |
| **Primary Container Surface** | `bg-white` | `bg-zinc-900` | Main interactive cards, controls panels |
| **Secondary Soft Surface** | `bg-zinc-50` / `bg-zinc-100` | `bg-zinc-850` / `bg-zinc-900/60` | Metric tiles, preset tabs, preview wells |
| **Interactive Well / Slot** | `bg-zinc-100/70` | `bg-zinc-950/70` | Thumbnail backgrounds, image canvas wrappers |
| **Hover State Surface** | `hover:bg-zinc-100` | `hover:bg-zinc-800` | Clickable list items, buttons, table rows |

### 2.2 Borders & Dividers
| Border Role | Light Mode Tailwind | Dark Mode Tailwind | Notes |
| :--- | :--- | :--- | :--- |
| **Card / Panel Border** | `border-zinc-200` | `border-zinc-800` | Standard 1px solid card outline |
| **Divider & Separator** | `border-zinc-200` / `divide-zinc-200/60` | `border-zinc-800` / `divide-zinc-800/60` | Internal panel borders, table divides |
| **Dropzone Dashed Border** | `border-dashed border-zinc-300` | `border-dashed border-zinc-800` | Empty file dropzone boundary |
| **Dropzone Hover State** | `hover:border-zinc-400` | `hover:border-zinc-700` | Cursor hover over dropzone |
| **Drag-Over Active State** | `border-zinc-500 bg-zinc-50` | `border-zinc-500 bg-zinc-850/50` | Active drag-and-drop hover |

### 2.3 Text & Typography Tokens
| Text Token Role | Light Mode Tailwind | Dark Mode Tailwind | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Headings & Titles** | `text-zinc-950` | `text-zinc-50` / `text-white` | H1, H2, major metric numbers |
| **Card Titles & Subheadings** | `text-zinc-900` | `text-zinc-100` | Section titles, file names, input labels |
| **Body & Explanatory Text** | `text-zinc-600` | `text-zinc-400` | Descriptions, guide paragraphs, FAQ answers |
| **Muted Meta / Sub-labels** | `text-zinc-500` | `text-zinc-400` | File dimensions, timestamp, step descriptions |
| **Mono Badges / Kickers** | `text-zinc-600` | `text-zinc-400` | Uppercase category kickers, status tags |

### 2.4 Semantic Functional Accents
| Semantic Role | Accent Tailwind Classes | Used In Component |
| :--- | :--- | :--- |
| **Emerald (Success & Privacy)** | `text-emerald-500`, `bg-emerald-500/10`, `text-emerald-400`, `border-emerald-500/20` | Privacy shield icon, file reduction % badge, savings calculation, checkmarks |
| **Blue (Primary Action / Slider)** | `bg-blue-500`, `text-blue-500`, `accent-blue-500`, `focus:ring-blue-500` | Active range slider track, sample button sparkles, copy icon, target KB highlight |
| **Amber (Caution & Education)** | `text-amber-500`, `bg-amber-500/10`, `text-amber-400` | "Size increased" warning badge, Guide step icons, pro tip lightbulbs |
| **Rose (Error & Mistakes)** | `text-rose-500`, `bg-rose-500/10`, `border-rose-500/30`, `text-rose-400` | Error notification alert banner, common mistakes troubleshooting cards |
| **Indigo (Dimension Notice)** | `bg-indigo-500/10`, `text-indigo-400` | Automatic downscaling notice banner, share icon |

---

## 3. Typography Hierarchy & Sizing Specs

### 3.1 Type Scales
```
========================================================================================
LEVEL        SIZE (Mobile -> Desktop)        WEIGHT         TRACKING          LINE HEIGHT
========================================================================================
Page H1      text-2xl sm:text-3xl lg:text-4xl font-bold      tracking-tight    leading-tight
Section H2   text-xl sm:text-2xl             font-bold      tracking-tight    leading-snug
Card H3      text-sm sm:text-base            font-semibold  tracking-tight    leading-snug
Section H4   text-xs                         font-semibold  tracking-wider    uppercase
Body (Lead)  text-sm                         font-normal    normal            leading-relaxed
Body (Text)  text-xs sm:text-sm              font-normal    normal            leading-relaxed
Micro / Meta text-[10px] / text-[11px]       font-medium    tracking-normal   leading-normal
Mono Metrics text-xs / text-sm               font-bold      tracking-normal   font-mono
Badge Kicker text-xs                         font-mono      tracking-wider    uppercase
========================================================================================
```

### 3.2 Font Family Rules
- **Sans-Serif (`font-sans` / default `Inter`)**: Used for all headings, body text, buttons, FAQs, and labels.
- **Monospace (`font-mono`)**: Exclusively reserved for file sizes (`245.8 KB`), pixel dimensions (`1920 × 1080 px`), step counters (`01`, `02`), uppercase category kickers, and compression percentages (`-72%`).

---

## 4. Spacing, Radii & Grid System

### 4.1 Border Radii
- **Outer Dropzone & Major Panels**: `rounded-xl` (12px)
- **Buttons, Segmented Tabs, Image Wells**: `rounded-lg` (8px)
- **Mini Preset Buttons, Badges, Tags**: `rounded-md` (6px)
- **Pills, Circular Badges, Sliders**: `rounded-full` (9999px)

### 4.2 Containers & Layout Constraints
- **Global Tool Wrapper**: `w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 select-none`
- **Header Section**: `text-center space-y-2.5 max-w-2xl mx-auto`
- **Empty Dropzone Container**: `max-w-7xl mx-auto` (or `max-w-3xl` for single-step tools)
- **Guide Section**: `w-full max-w-7xl mx-auto mt-14 pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-14`

### 4.3 12-Column Responsive Workspace Grid
```
+-----------------------------------------------------------------------------+
| Active Workspace Top Header Bar: Thumbnail | Name | Dimensions | Action CTAs |
+-----------------------------------------------------------------------------+
|                                    |                                        |
|  LEFT COLUMN: lg:col-span-8         |  RIGHT COLUMN: lg:col-span-4           |
|                                    |                                        |
|  - View Mode Toggle (Split / Dual) |  - Result & Savings Metrics Card       |
|  - Interactive Comparison Canvas   |  - Mode Selector (Quality / Target KB) |
|  - Under-Preview Toolbar:          |  - Slider / KB Input                   |
|    [Shield RAM] [Copy] [Share]     |  - Quick Presets Grid                  |
|                                    |  - Output Format Selector              |
|                                    |  - Resolution Scale Grid               |
|                                    |  - Primary Download CTA Button         |
+------------------------------------+----------------------------------------+
```

---

## 5. UI Component Specifications & States

### 5.1 Privacy Pill Badge (Top Kicker)
- **Container**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850`
- **Icon**: `<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />`
- **Text**: `100% Client-Side Engine · Zero Uploads`

### 5.2 Minimalist 2D Flat Dropzone (Empty State)
- **Container**:
  ```tsx
  className={`relative group border border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-colors duration-150 select-none outline-none ${
    isDragOver
      ? isDark
        ? 'border-zinc-500 bg-zinc-850/50'
        : 'border-zinc-500 bg-zinc-50'
      : isDark
        ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
        : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/60'
  }`}
  ```
- **Icon Container**: `w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-110`
- **Primary Title**: `text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100` (`Drop an image here or browse`)
- **Subtitle**: `text-xs text-zinc-500 dark:text-zinc-400` (`Supports PNG, JPG, WebP · Press Ctrl+V to paste`)
- **Try Sample Button**:
  ```tsx
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
  ```

### 5.3 Active Workspace Top Header Bar
- **Container**:
  ```tsx
  className={`flex flex-wrap items-center justify-between gap-4 p-3.5 sm:p-4 border rounded-xl ${
    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
  }`}
  ```
- **Thumbnail Slot**: `w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950`
- **File Metadata**:
  - Title: `text-xs sm:text-sm font-semibold truncate`
  - Dimensions & Size: `text-[11px] font-mono text-zinc-500 dark:text-zinc-400` (`1920 × 1080 px · 1.4 MB`)
- **Action Buttons in Header**:
  - **Secondary (Replace / Reset)**: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer`
  - **Primary CTA (Download)**: `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50`

### 5.4 Segmented Control Switcher (e.g. View Mode & Setting Mode)
- **Container**: `inline-flex p-0.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800`
- **Active Tab**:
  ```tsx
  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs transition-colors cursor-pointer"
  ```
- **Inactive Tab**:
  ```tsx
  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors cursor-pointer"
  ```

### 5.5 Metrics & Result Comparison Tiles
- **Card Container**: `p-4 sm:p-5 rounded-xl border space-y-3.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800`
- **Metric Tiles (Grid 2-Col)**:
  ```tsx
  className={`p-3 rounded-lg ${isDark ? 'bg-zinc-850' : 'bg-zinc-100'}`}
  ```
  - Label: `text-[10px] font-mono block text-zinc-500 dark:text-zinc-400` (`ORIGINAL` / `COMPRESSED`)
  - Value: `text-sm font-bold mt-0.5 block font-mono text-zinc-900 dark:text-white`
  - Savings Delta: `text-[10px] font-mono text-emerald-500 block truncate`
- **Savings Badge**:
  ```tsx
  className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
    isReduced
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  }`}
  ```

### 5.6 Interactive Range Slider
- **Slider Track**:
  ```tsx
  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
  style={{
    background: isDark
      ? `linear-gradient(to right, #3b82f6 ${(value - min) / range * 100}%, #27272a ${(value - min) / range * 100}%)`
      : `linear-gradient(to right, #3b82f6 ${(value - min) / range * 100}%, #e4e4e7 ${(value - min) / range * 100}%)`
  }}
  ```

### 5.7 Presets Buttons Grid
- **Container**: `grid grid-cols-4 gap-1.5`
- **Active Preset**:
  ```tsx
  className="text-[10px] py-1 px-1 rounded-md font-semibold text-center bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-white transition-colors cursor-pointer"
  ```
- **Inactive Preset**:
  ```tsx
  className="text-[10px] py-1 px-1 rounded-md font-medium text-center bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
  ```

### 5.8 Primary Call-to-Action Buttons
- **Full-Width Submit / Download Button**:
  ```tsx
  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
    isDark
      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
      : 'bg-zinc-900 hover:bg-zinc-800 text-white'
  }`}
  ```

---

## 6. SEO Guide & Educational Architecture (`ImageToolGuideSection`)

Every tool page must feature the standardized educational guide component below the interactive tool. This guarantees 100% SEO indexability, schema matching, and user trust.

### 6.1 Section 1: Privacy Guarantee Strip (Borderless `border-y`)
- **Structure**:
  ```tsx
  <div className="py-4 border-y border-zinc-200/80 dark:border-zinc-800/80">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              100% Client-Side Privacy & Zero Server Uploads
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Local RAM
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
            Your files never leave your device. All calculations run directly in your local browser memory using HTML5 Canvas 2D and WebAssembly.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>0 Bytes Transmitted</span>
        </span>
      </div>
    </div>
  </div>
  ```

### 6.2 Section 2: Educational Overview ("About This Tool")
- **Kicker**: `<Sparkles className="w-4 h-4 text-blue-500" /> Educational Guide & Technical Capabilities` (`text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400`)
- **H2 Title**: `About {toolName}` (`text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50`)
- **Body**: `text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl`

### 6.3 Section 3: 3-Step Actionable Guide (Unboxed 3-Column Layout)
- **Container**: `grid grid-cols-1 md:grid-cols-3 gap-8` (Zero outer card box)
- **Step Item**:
  - Number Badge: `w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0` (`01`, `02`, `03`)
  - Title: `text-sm font-semibold text-zinc-950 dark:text-zinc-50`
  - Description: `text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal`

### 6.4 Section 4: Technical Specifications Matrix (Open Borderless Table)
- **Container**: `w-full overflow-x-auto`
- **Table**: `w-full text-left text-xs border-collapse`
- **Header**: `border-b font-mono text-[11px] uppercase tracking-wider text-zinc-500 border-zinc-200 dark:border-zinc-800`
- **Rows**: `divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300`
- **Key Parameters Tracked**:
  1. Processing Engine (e.g. `HTML5 Canvas 2D + Binary Search Solver`)
  2. Standard Specifications (e.g. `ISO/IEC 10918-1, Google WebP`)
  3. Execution Mode (`100% Client-Side In-Browser Execution`)
  4. Supported Inputs (`JPEG, PNG, WebP, AVIF, BMP`)
  5. Export Formats (`Match Original, JPEG, WebP, PNG`)
  6. File Size Guidance (`Up to 50 MB in local RAM`)
  7. Privacy Guarantee (`100% Private: 0 bytes uploaded`)

### 6.5 Section 5: Pro Tips & Best Practices (Unboxed 3-Column Layout)
- **Container**: `grid grid-cols-1 md:grid-cols-3 gap-8`
- **Tip Item**:
  - Icon Badge: `w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0`
  - Title: `text-xs font-semibold text-zinc-900 dark:text-zinc-100`
  - Description: `text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed`

### 6.6 Section 6: Common Mistakes & Troubleshooting (Soft Borderless Tiles)
- **Container**: `grid grid-cols-1 md:grid-cols-2 gap-4`
- **Tile Card**: `p-4 rounded-xl space-y-2 bg-zinc-100/70 dark:bg-zinc-850/60`
- **Mistake / Solution Format**:
  - Header: `text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5`
  - Mistake Text: `<strong className="text-zinc-800 dark:text-zinc-200">Mistake: </strong>...`
  - Solution Text: `<strong className="text-emerald-600 dark:text-emerald-400">Solution: </strong>...`

### 6.7 Section 7: Expandable FAQs (`<details>` / `<summary>`)
- **Details Element**:
  ```tsx
  className={`group rounded-xl border transition-colors ${
    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  }`}
  ```
- **Summary**:
  ```tsx
  className="w-full p-4 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors list-none [&::-webkit-details-marker]:hidden select-none"
  ```
- **Expanded Answer**:
  ```tsx
  className={`px-4 pb-4 text-xs sm:text-sm leading-relaxed border-t ${
    isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-600 border-zinc-100'
  }`}
  ```
- **Strict SEO Rule**: The text in these `<summary>` and `answer` elements must exactly match the `FAQPage` JSON-LD schema definitions in `src/core/flagshipSeoData.ts` to satisfy Google Rich Snippet compliance.

---

## 7. Audit & Verification Checklist for All Tools

When migrating or building any tool component on FileWalaTool.com, verify against these criteria:

- [ ] **Unboxed Dropzone**: Dropzone has NO enclosing outer card wrapper (`rounded-lg border p-6 bg-white`).
- [ ] **1-Line Subtitle**: Subtitle is clean, professional, and max 1-2 lines (`text-xs sm:text-sm text-zinc-600 dark:text-zinc-400`).
- [ ] **Privacy Badge**: Top pill badge displays `100% Client-Side Engine · Zero Uploads` with `<ShieldCheck />`.
- [ ] **Keyboard Shortcuts**: Tool includes global keyboard shortcuts (`[Enter]` to process, `[D]` to download, `[Esc]` / `[N]` to reset).
- [ ] **Guide Section Consistency**: Employs unboxed privacy strip (`border-y`), open 3-column steps, open 3-column tips, and borderless specs table.
- [ ] **Exact H1 Match**: Page H1 text strictly matches `src/core/flagshipSeoData.ts` or `src/core/toolsData.ts`.
- [ ] **TypeScript Linting**: `npm run lint` passes with 0 errors.
- [ ] **Prerender Build**: `npm run build` compiles all 46 SSR static routes.
- [ ] **Hardened SEO Verification**: `npm run verify:seo` exits with code 0 (46/46 routes passed).
