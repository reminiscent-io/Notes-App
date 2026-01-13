# Voice Notes App - Design Guidelines

## Brand Identity

**Purpose**: Frictionless thought capture and intelligent retrieval through voice-first interaction.

**Aesthetic Direction**: Brutally minimal with focused hierarchy. The mic button is the hero—everything else supports it. Think "breathing room meets instant action."

**Memorable Element**: The impossibly large, pulsing microphone button that dominates the screen when active—impossible to miss, satisfying to tap.

## Navigation Architecture

**Root Navigation**: Single screen (stack-only)
- No tabs, no drawer
- One primary screen with collapsible sections
- Modal overlays for recording and query states

**Screen List**:
1. **Main Feed** (Home) - Combined capture + review interface
2. **Recording Overlay** (Modal) - Active voice capture state
3. **Query Overlay** (Modal) - Voice search interface

## Screen-by-Screen Specifications

### 1. Main Feed Screen

**Purpose**: Display organized notes and provide instant access to voice capture.

**Layout**:
- Header: Transparent, minimal
  - Left: App name "Voice Notes" (Typography.title3)
  - Right: None
  - No search bar (voice query replaces it)
- Content: Scrollable with sections
  - Top: Voice query button (compact, secondary style)
  - Sections: TODAY, TOMORROW, IDEAS, TO BUY, etc.
  - Each section collapsible with show more/less
- Floating Element: Large circular mic button (80x80pt)
  - Position: bottom center, 24pt from bottom safe area
  - Safe area insets: bottom: insets.bottom + Spacing.xl

**Components**:
- Voice query button (pill-shaped, subtle)
- Section headers (bold, all caps, left-aligned)
- Task cards with checkbox, title, time/date
- Note cards with emoji, title, preview text
- Large floating action button (mic)

**Empty State**: Single centered illustration (empty-notes.png) with "Tap the mic to start capturing thoughts"

**Interactions**:
- Swipe right on task: mark complete (shows checkmark animation)
- Swipe left on any item: delete (shows confirmation alert)
- Tap section header: collapse/expand section
- Pull to refresh: re-sync items

---

### 2. Recording Overlay (Modal)

**Purpose**: Provide focused voice capture experience.

**Layout**:
- Full screen overlay with dimmed background (rgba(0,0,0,0.6))
- Center: Large pulsing mic icon (120x120pt)
- Below mic: Live transcription text (appears as user speaks)
- Top right: Close button (X)
- Bottom: "Tap to stop" hint text

**Visual Feedback**:
- Mic icon pulses with audio levels
- Transcription text fades in word by word
- On complete: Quick checkmark animation before dismissing

---

### 3. Query Overlay (Modal)

**Purpose**: Voice-powered search and retrieval.

**Layout**:
- Full screen overlay with dimmed background
- Center: Search mic icon (80x80pt)
- Below: "Ask me anything" prompt
- Results area: Displays AI response + relevant cards
- Top right: Close button

**States**:
- Listening: Pulsing mic
- Processing: Subtle spinner
- Results: Conversational text + filtered note cards

---

## Color Palette

**Primary**: #2D3748 (Charcoal) - dominant color for text, icons, primary button backgrounds
**Accent**: #F59E0B (Amber) - recording state, active indicators, completion checkmarks
**Background**: #FFFFFF (Pure White)
**Surface**: #F7FAFC (Off-white) - card backgrounds
**Text Primary**: #1A202C (Near Black)
**Text Secondary**: #718096 (Medium Gray)
**Text Tertiary**: #CBD5E0 (Light Gray)
**Error**: #EF4444 (Red)
**Success**: #10B981 (Green)

---

## Typography

**Font**: System default (SF Pro on iOS, Roboto on Android)

**Type Scale**:
- Display: 48pt, Bold - for empty states
- Title1: 28pt, Bold - section headers
- Title3: 20pt, Semibold - card titles, header
- Body: 16pt, Regular - card content
- Caption: 14pt, Regular - timestamps, hints
- Label: 12pt, Medium - badges, categories

---

## Visual Design System

**Spacing Scale**:
- xs: 4pt
- sm: 8pt
- md: 16pt
- lg: 24pt
- xl: 32pt
- xxl: 48pt

**Corner Radius**:
- Small: 8pt (cards)
- Medium: 16pt (buttons)
- Large: 40pt (mic button - full circle)

**Shadows** (floating mic button ONLY):
- shadowOffset: {width: 0, height: 2}
- shadowOpacity: 0.10
- shadowRadius: 2
- shadowColor: #000000

**Card Style**:
- Background: Colors.surface
- Border: none
- Padding: Spacing.md
- Corner radius: Radius.small
- NO shadow (flat design)

**Touch States**:
- Default: Full opacity
- Pressed: 0.6 opacity + scale(0.98)
- Active/Selected: Accent color border (2pt)

**Icons**: Use @expo/vector-icons (Feather icon set) - check, x, mic, search, chevron-down, etc.

---

## Assets to Generate

**Required**:
1. **icon.png** - App icon, minimalist mic glyph on solid Charcoal background
2. **splash-icon.png** - Same mic glyph for launch screen
3. **empty-notes.png** - Subtle illustration of floating thought bubbles, used on Main Feed when no notes exist
4. **empty-today.png** - Open notebook illustration, used when TODAY section is empty
5. **empty-ideas.png** - Light bulb with rays, used when IDEAS section is empty

**Avatar Preset**:
6. **avatar-default.png** - Simple geometric avatar (circle with initials placeholder) for future profile feature

**Style for all assets**: Minimal line art, single accent color (Amber), lots of negative space, ~200x200pt, transparent background