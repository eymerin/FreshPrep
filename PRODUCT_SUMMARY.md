# FreshPrep — Product Summary

## Overview

FreshPrep is a meal prep execution system. Its purpose is to help users follow through on meal prep after they've decided to do it — tracking inventory, scheduling consumption, and maintaining consistency week over week.

**Core identity:** A practical tool for the plan → shop → prep → store → schedule → consume lifecycle.

**What it is not:** A calorie counter, macro tracker, recipe social app, grocery app, or nutrition coaching tool.

**Platform:** Mobile-first web app (React + Vite), packaged for Android via Capacitor. Dark-mode design throughout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| State | Zustand with `persist` middleware (localStorage, key: `freshprep-store`) |
| Styling | Tailwind CSS with a custom dark brand palette |
| Mobile | Capacitor (Android) |

### Brand Palette

| Token | Hex | Role |
|---|---|---|
| `brand-bg` | `#1C1F28` | Page background — near-black navy |
| `brand-surface` | `#2A3240` | Card surfaces — dark navy-grey |
| `brand-raised` | `#1E3A68` | Day headers, accent zones — deep navy |
| `brand-accent` | `#3D6A9A` | Buttons, active tabs, CTAs — steel blue |
| `brand-muted` | `#CFD9E6` | Primary text — soft blue-white |

All color opacity variants are Tailwind slash notation (`text-brand-muted/50`, `border-brand-accent/25`, etc.). Section labels use `text-brand-muted/40`. Secondary body copy uses `text-brand-muted/50`. Tertiary / supporting labels use `text-brand-muted/45`.

---

## Data Model

### Recipe

The template for a meal that can be prepped. Two structural types:

**Standard** — has a fixed list of core ingredients plus optional variants (different flavour profiles of the same base). Core ingredients always appear on the shopping list; variant-specific ingredients are added based on which variant is selected during planning.

**Composed / Build-Your-Own** — has component slots instead of variants. Each slot is a category (e.g. Protein, Carb, Vegetable) with selectable options (e.g. Chicken breast, Steak, Salmon). Users pick one or more options per slot when planning.

```
Recipe {
  id, name, description
  type: 'standard' | 'composed'
  coreIngredients: Ingredient[]      // standard only
  variants: RecipeVariant[]          // standard only
  slots?: ComponentSlot[]            // composed only
}

Ingredient    { id, name, quantity, category? }
RecipeVariant { id, name, additionalIngredients: Ingredient[] }
ComponentSlot { id, label, options: SlotOption[] }
SlotOption    { name, quantity, category? }
```

### PlanEntry

A recipe added to the current week's prep plan. Tracks serving count and configuration. Supports flexible selection — multiple variants or slot options can be chosen to keep options open; they resolve at prep log time.

```
PlanEntry {
  id, recipeId, servings: number
  selectedVariantIds: string[]        // standard: 1 = committed, 2+ = flexible
  slotPicks: Record<slotId, string[]> // composed: one or more options per slot
}
```

### PreparedMeal

A cooked batch now in inventory. Freshness derives in real time from `prepDate` + `storage`; it is never stored.

```
PreparedMeal {
  id, prepEventId, recipeId, variantId?
  recipeName, variantName
  servingsTotal, servingsRemaining
  prepDate: string        // YYYY-MM-DD
  storage: 'refrigerated' | 'frozen'
}
```

**Shelf life:**
- Refrigerated: 4 days
- Frozen: 90 days

**Freshness status** (computed, not stored):
- `fresh` — more than 25% of shelf life remaining
- `expiring` — at or below 25% of shelf life remaining
- `expired` — 0 or fewer days remaining

### ScheduledMeal

Links a PreparedMeal to a specific date and meal time slot. Does not consume a serving — consumption happens when the user marks the slot as eaten.

```
ScheduledMeal { id, date, mealTime: 'breakfast' | 'lunch' | 'dinner', preparedMealId }
```

### PendingPrep

Intermediate state created when a plan is sent to the Prep screen. If the user made flexible selections (multiple variants or slot options), those are preserved here and resolved at log time.

```
PendingPrep {
  id, recipeId, recipeName, servings
  variantId?, variantName?                  // resolved standard variant
  pendingVariants?: { id, name }[]          // unresolved — needs selection
  slotPicks?: Record<slotId, string[]>      // may have multiple options per slot
}
```

### UserPrefs

Collected during onboarding. Used in coverage calculations, weekly target progress, and Planning section of Insights.

```
UserPrefs {
  mealsPerWeek: number                               // weekly scheduling target
  mealTypes: ('breakfast' | 'lunch' | 'dinner')[]   // multi-select, ≥ 1 required
  prepFrequency: '1x' | '2x' | 'flexible'
}
```

---

## Navigation Architecture

### Bottom Tab Bar

Five permanent tabs. Labels are intentional and stable — they represent learned navigation and are not renamed.

| Tab key | Label | Icon description |
|---|---|---|
| `plan` | Plan | Clipboard |
| `prep` | Prep | Cooking pot |
| `schedule` | Calendar | Calendar grid |
| `meals` | Meals | Database stack |
| `recipes` | Recipes | Open book |

Default landing tab after onboarding: **Calendar**.

### Persistent App Header

Fixed above all screens. Always visible regardless of active tab.

- **Center:** FreshPrep leaf logo + wordmark
- **Left:** Empty spacer (balances the layout so the logo appears centered)
- **Right:** Bar chart icon button — opens the Insights modal. `text-brand-muted/50` base, `/80` hover.

The header is global and tab-independent. The Insights entry point is always one tap away.

---

## Screens

---

### Onboarding

Shown when `onboardingComplete: false`. Completing or skipping sets the flag permanently. Collects `UserPrefs`.

**Screen 1 — Welcome**

Full-screen centered layout. FreshPrep leaf logo + wordmark at `text-brand-muted/75`. Headline: "Meal prep, every week." at `text-2xl`. Body copy at `text-sm`. Two actions:

- **Get Started** — advances to Screen 2
- **Skip setup** — completes onboarding with defaults, enters the app immediately

**Screen 2 — Prep Style**

A 3-segment progress bar shows position (2 of 3 filled). Subtitle: "Helps FreshPrep give you better guidance each week."

*Question 1 — How many meals do you usually prep weekly?*
Four chips: `3` · `5` · `7` · `Other`. Selecting Other reveals a number input. Defaults to 5.

*Question 2 — What meals are these mostly for?*
Multi-select chips: `Breakfast` · `Lunch` · `Dinner`. Any combination valid. Selected chips show a ✓. At least one must be selected — Continue is disabled otherwise. Defaults to Lunch + Dinner.

*Question 3 — How often do you typically prep?*
Stacked single-select cards with sub-descriptions:
- **Once a week** — "Sunday or weekend batch prep"
- **Twice a week** — "Two smaller prep sessions"
- **Flexible** — "Whenever it works for me"

Action: **Continue** (disabled if no meal types selected).

**Screen 3 — Confirmation**

All three progress segments filled. Checkmark icon in a soft accent circle. Headline: "You're all set."

Summary card:
- "N meals per week, for [meal types]"
- "Prepping [frequency]"
- "3 starter recipes ready to use"

Numbered "Your first steps" checklist pointing to Plan → Prep → Calendar.

Action: **Start Using FreshPrep** — lands on Calendar tab.

**Discoverability Tooltip**

On first post-onboarding app load, a clean tooltip bubble appears at `fixed top-[54px] right-3` — just below the insights icon. Content: "Track your progress here." with `text-brand-muted/80`. No broken CSS arrow — positioned proximity makes the association clear. Auto-dismisses after 4 seconds or on tap. Stored as `insightsTipSeen: true`, shown exactly once.

---

### Plan Screen

Heading: none (uses sub-tab as primary context). Two sub-tabs toggled by a segmented control.

#### What to Prep (`picks`)

Displays all current plan entries — meals the user intends to prep this week.

**Adding a meal:** A dashed "+ Add a meal to this week's plan" button opens a recipe picker modal. Tapping a recipe adds a new plan entry.

**Plan entry card:**
- Recipe name (with "Meal N" suffix if the same recipe appears more than once)
- Collapse/expand toggle — collapsed shows a summary line; expanded shows the full configuration
- Serving counter (− / N / + stepper)
- Remove (×)

**Standard recipe — expanded:** All variants shown as checkboxes. Selecting one = committed. Two or more = flexible.

**Composed recipe — expanded:** Each slot as a pill-button group. Multiple options per slot = flexible.

**Summary line (collapsed):**
- Standard: variant names comma-joined, "(flexible)" if multiple
- Composed: options joined with ·, or "N of M components set" if partially configured

Empty state: "No meals planned yet."

#### Shopping List (`shopping`)

Dynamically built from all plan entries. Ingredients for all planned meals.

**View toggles:** By Recipe or By Category. Category view groups all ingredients into store-section categories using keyword inference.

**Status bar:** "N of M checked" counter + Reset button.

**Item types:**
- **Single ingredient** — tap to check/uncheck. Checked shows strikethrough + filled checkbox. Quantity on right.
- **Flexible group** (from multi-select) — "Select a [slot label]" expands all options. Selecting one collapses the group and marks it done.

**Section behavior:** Header toggles collapse/expand. Section auto-collapses and shows ✓ when all items inside are checked.

**Send to Log Prep button:** Floating above the bottom nav. Enabled only when all items are checked. On tap:
1. Converts plan entries to PendingPrep items
2. Clears the plan
3. Resets shopping state
4. Routes to Prep tab's pending queue

---

### Prep Screen

Heading: **Log Prep** — always shown regardless of pending queue state. Adaptive subtitle:
- Pending queue present: "N meal(s) from your plan ready to confirm."
- No queue: "Record what you cooked to track it all week."

#### Pending Queue

Shows when PendingPrep items exist (sent from Shopping List). Cards appear at the top.

Each pending card:
- Recipe name + serving count
- **Flexible variant resolution** — pill buttons: "Which variant did you make?" Required before completing.
- **Flexible slot resolution** — same pattern per slot for composed recipes.
- **Storage selector** — Refrigerated or Frozen (defaults to Refrigerated).
- **Mark as Prepped** — disabled until all choices resolved. Creates PreparedMeal, removes pending item, increments `prepSessionsLogged`.

Divider below the queue reads: "Or log a different meal manually:" before the form.

#### Manual Log Form

Always visible below the queue (or alone when no queue exists).

Fields:
1. **Recipe** — dropdown of all saved recipes
2. **Variant** — dropdown (standard recipes with variants only)
3. **Slot picks** — pill-button groups per slot (composed recipes only)
4. **Your plate preview** — · -joined slot summary (composed, shown when all slots picked)
5. **Servings** — − / N / + stepper, defaults to 4
6. **Prep Date** — date input, defaults to today
7. **Storage** — Refrigerated / Frozen toggle with shelf-life note ("Fresh for 4 days" / "Fresh for 90 days")

Submit: **Log Prep Session** (disabled until recipe + variant/slots fully resolved). On submit, increments `prepSessionsLogged`, creates PreparedMeal, resets the form.

#### Prep Completion Reward Card

Appears for 3 seconds after a successful log. Reads live store values at render time — store is already updated synchronously before the card displays. Copy is benefit-first, not log-centric.

**Card layout:**

*Headline row (with checkmark badge on right):*
- Large: "X meals ready." — total PreparedMeals with servings remaining
- Below (muted, `text-brand-muted/50`): coverage line

*Coverage line logic:*
- `mealsPerDay = userPrefs.mealsPerWeek ÷ 7` (falls back to 1 if no prefs)
- `coverageDays = round(available ÷ mealsPerDay)`
- ≥ 7 days: "You're set for the week."
- < 7 days and > 0: "Covered through [Weekday]."
- 0: no coverage line shown

*Stat chips row:*
- **In inventory** — PreparedMeals with servings > 0
- **Streak** — current week streak in weeks (chip hidden if streak = 0)
- **Session** — `#N` (current `prepSessionsLogged`)

*Footer line (one of three, contextual):*
- Streak ≥ 2: "N-week consistency streak."
- Streak = 1: "First week active. Keep going."
- Streak = 0, first session: "Head to Calendar to schedule your meals."
- Otherwise: nothing

---

### Calendar Screen

Two sub-tabs: **Daily** and **Weekly**.

#### Daily View

Heading label: **Today's Schedule** with today's full date on the right. Three zones stacked vertically with consistent `mb-6` spacing between them.

---

**TODAY zone**

*Next Action Card* — a single contextual card rendered between the heading and the meal slots. One card maximum. Priority-ordered decision tree:

| Priority | Condition | Color | Message |
|---|---|---|---|
| 1 | All today's scheduled meals eaten + inventory empty | normal | "All done today. Inventory empty — plan your next batch." → Plan |
| 2 | All today's meals eaten + inventory ≤ 2 | normal | "On track today. Running low on inventory." → Plan |
| 3 | All today's meals eaten + inventory healthy | green | "All meals eaten today. You're on track." |
| 4 | Any meals expiring or expired in inventory | amber | "N meal(s) expiring soon — prioritize these." → Meals |
| 5 | Inventory empty | normal | "No meals in inventory. Plan your next prep batch." → Plan |
| 6 | Weekly reset window active (see below) | green | Reset prompt → Plan |
| 7 | Meals available, none scheduled today | normal | "N meal(s) ready — none scheduled for today." |
| 8 | Shopping list in progress | normal | "Shopping list in progress." → Plan |
| 9 | Inventory ≤ 2 | normal | "Running low — plan your next prep soon." → Plan |
| — | No condition met | — | No card shown |

Cards with a linked tab show a small CTA button on the right. Three urgency styles:
- **green** (`bg-emerald-900/20 border-emerald-700/25`) — success states
- **amber** (`bg-amber-900/20 border-amber-700/25`) — warn states
- **normal** (`bg-brand-raised/20 border-brand-accent/20`) — neutral guidance

*Weekly Reset Trigger* (priority 6) fires when ALL of these are true simultaneously:
- Time window: Sunday at or after 5pm, OR Monday before 1pm
- `mealEatenDates` has ≥ 3 entries from the prior 7 days
- `planEntries.length === 0`
- No expiring meals, inventory not empty

Message variants:
- ≥ 5 meals last week: "Strong week. Build this week's plan to keep the momentum."
- 3–4 meals last week: "You stayed on track last week. Ready to plan this week?"

*Meal time slots* — Breakfast, Lunch, Dinner cards with dark navy headers.

*Empty slot:* "+ Assign meal" tap area → Assign Modal.

*Filled slot:* Recipe name + variant subtitle. Two states:
- **Not yet eaten:** "Mark as Eaten" (primary), "Swap" (secondary), "×" (remove).
- **Eaten:** Name with strikethrough, "✓ Eaten" in accent color.

Marking as eaten: decrements `servingsRemaining`, appends ID to `eatenScheduledIds`, increments `mealsEatenAllTime`, appends today to `mealEatenDates`.

---

**THIS WEEK zone**

*Scheduled progress card:*
- "Meals scheduled" label + "N / target" count
- Progress bar at `scheduled ÷ mealsPerWeek` width (hidden if `userPrefs` null)
- Sub-label: "N more to hit your weekly target" or "Weekly target hit" (accent color)

*Two stat chips:*
- **In inventory** — PreparedMeals with servings > 0
- **Eaten this week** — `mealEatenDates` entries in current 7-day rolling window

---

**MOMENTUM zone**

Hidden when `prepSessionsLogged === 0 && mealsEatenAllTime === 0`. Avoids all-zero state for new users.

Three stat chips with `text-brand-muted/45` labels:

| Chip | Value | Label |
|---|---|---|
| Streak | Consecutive Mon–Sun weeks backwards from now with ≥ 1 eaten | "week streak" |
| Eaten | `mealEatenDates` count in current 7-day window | "eaten this week" |
| Prep | `prepSessionsLogged` | "prep sessions" |

Streak is computed on render via `computeWeekStreak(mealEatenDates)` — never stored.

---

#### Weekly View

Heading: **Weekly Plan** label (`text-brand-muted/40`) + subtitle "Assign and adjust meals across the week" (`text-brand-muted/45`).

Seven day-cards stacked. Each card:
- Header: day name + date
- Row per meal time (Breakfast, Lunch, Dinner)
- Filled slot: meal name + Swap pill + × remove
- Empty slot: "+ Assign meal" → Assign Modal

#### Assign Modal

Opened from any empty slot (daily or weekly). Scrollable list of available PreparedMeals (servings > 0, not expired). Shows recipe name, variant, and unassigned count. Tapping assigns to the slot.

#### Swap Modal

Opened from a Swap button on a filled, uneaten slot. Same inventory list as Assign. Tapping replaces the current assignment.

---

### Meals Screen

Heading: **Meals Ready**

**Header area (always visible):**
- Subtitle: "N prepared meals in inventory" or "No prepared meals in inventory"
- Coverage line — `text-brand-accent font-medium`, shown when inventory > 0 and coverage is computable:
  - "You're set for the week." — coverage ≥ 7 days
  - "Covered through [Weekday]." — partial coverage
  - Same formula as Prep reward card: `round(available ÷ (mealsPerWeek ÷ 7))`

**Sort context line** — shown just below the header when expiring meals exist:
"Sorted by urgency — eat oldest meals first." (`text-[11px] text-brand-muted/35`)

**Sorting:** Expired → Expiring → Fresh.

**Empty state:** SVG package/box icon (stroke-1, `text-brand-muted/20`) + "Inventory empty" heading + "Log a prep session to add meals to your inventory."

**Meal card contents:**
- Recipe name + variant subtitle
- Storage badge (`❄️ Fridge` or `🧊 Frozen`) on the right
- Prep date
- Servings remaining + unassigned count
- **Freshness bar** — colored progress bar:
  - Badge: `Fresh` (green) / `Expiring soon` (amber) / `Expired` (red)
  - Right: "Nd left · expires [date]" or "Expired [date]"
  - Bar colors: `bg-emerald-500` / `bg-amber-400` / `bg-red-500`

**Card actions:**
- **Schedule** — opens Schedule Modal. Disabled + "Fully Scheduled" when all servings are assigned.
- **Remove** — deletes the meal and removes all associated ScheduledMeals.

**Schedule Modal** (from Meals): 7-day week view showing open meal time slots. Tapping assigns one serving.

**Used Up section:** Meals with `servingsRemaining === 0` shown below main list at 50% opacity. Label: "Used Up". Remove button only.

---

### Insights Modal

Opened via the bar chart icon in the app header. Available from every tab. Renders as a `fixed inset-0` bottom sheet at `max-h-[88vh]` — tall enough to feel like a destination page.

**Header:**
- "Your Progress" heading
- "N weeks of data" subtitle (when data exists)
- × close button

**Empty state:** SVG bar chart icon (stroke-1, `text-brand-muted/20`) + "No data yet" + "Complete your first prep session to start tracking your consistency."

---

**Section 1 — Consistency**

Description: "Weeks with at least one meal eaten from your prep inventory."

| Stat | Value | Notes |
|---|---|---|
| Current streak | `computeWeekStreak(mealEatenDates)` | Shown in `text-brand-accent` with accent border when equal to best streak |
| Best streak | `computeBestWeekStreak(mealEatenDates)` | All-time longest consecutive run |
| Active weeks | `new Set(mealEatenDates.map(getMondayOfWeek)).size` | Full-width chip |

When current streak = best streak and both > 1: accent line "Current streak matches your all-time best."

Values displayed as "N wks" with the number in large type and the unit as a muted suffix.

---

**Section 2 — Execution**

Description: "Meals cooked and eaten since you started tracking."

| Stat | Value |
|---|---|
| Prep sessions | `prepSessionsLogged` |
| Eaten this week | `mealEatenDates` entries in current rolling 7-day window |
| Total meals eaten | `mealsEatenAllTime` (full-width chip) |

---

**Section 3 — Planning**

Description (target-aware):
- If `userPrefs` set: "Weeks where you hit your target of N meals."
- If no prefs: "Weeks where you ate 3 or more prepped meals."

| Stat | Value |
|---|---|
| Weeks on target | `computeWeeksOnTarget(mealEatenDates, target)` |
| Hit rate | `round(weeksOnTarget ÷ activeWeeks × 100)%` — "—" if no active weeks |

---

### Recipes Screen

Two views: list and detail.

#### Recipe List

Header: **Recipes** with "+ New" button. Each recipe card shows name, optional description, ingredient/slot count, variant count, and type label (Build-Your-Own / With Variants / Simple).

**Create form** (inline when "+ New" tapped):
- Name input
- Optional description
- Type selector:
  - **Recipe** — standard with core ingredients + optional variants
  - **Build-Your-Own** — component slots with selectable options

Creates immediately and opens detail view.

#### Recipe Detail

Back nav + type badge + Delete (with "Delete? Yes / No" confirmation).

Name and description: editable inline inputs, saved on blur.

**Standard recipe:**

*Core Ingredients* — list with × per item. "+ Add ingredient" expands inline form:
- Ingredient name with autocomplete (fixed-position dropdown to avoid overflow clipping)
- Quantity field
- Category dropdown (Auto or explicit from `CATEGORY_ORDER`)

*Variants* — collapsible cards. Expanded shows editable name + additional ingredients (same add/delete UI). "+ New variant name" input below.

**Composed recipe:**

*Component Slots* — collapsible cards per slot. Expanded shows editable slot label + options list (name, category badge, quantity, × delete) + AddIngredientForm. "+ New slot label" input below.

---

## End-to-End User Flows

### Full Weekly Cycle

```
1. PLAN
   Recipes → review or create recipes
   Plan (What to Prep) → add meals, set servings, pick variants/slots
   Plan (Shopping List) → check off all ingredients while shopping
   → Send to Log Prep

2. PREP
   Prep → pending cards appear from plan
   → Resolve any flexible variant/slot choices
   → Select storage type (Refrigerated / Frozen)
   → Mark as Prepped → PreparedMeal added to inventory
   → Reward card: "X meals ready. Covered through [day]."

3. SCHEDULE
   Calendar (Daily or Weekly) → assign meals to slots across the week
   OR Meals → tap Schedule on any card → assign from the modal
   → THIS WEEK zone updates with scheduled count vs. target

4. CONSUME
   Calendar (Daily) → mark meals as eaten each day
   → servingsRemaining decrements
   → mealEatenDates grows → streak updates in MOMENTUM zone
   → mealsEatenAllTime increments

5. RETURN
   TODAY zone: one contextual action card — the single most relevant next step
   THIS WEEK zone: progress bar toward weekly target, inventory chip
   MOMENTUM zone: streak, eaten this week, prep sessions
   Weekly reset trigger (Sun 5pm / Mon before 1pm): prompts new plan cycle
   Header insights icon: full progress history always accessible
```

### New User Flow

```
First launch
→ Onboarding Screen 1 (welcome) → Screen 2 (set prefs) → Screen 3 (confirm)
→ Calendar / Daily view
→ Discoverability tooltip appears below insights icon (4-second auto-dismiss)
→ Seed demo data pre-loaded: 5 PreparedMeals, 4 ScheduledMeals, 5-week mealEatenDates history
→ TODAY zone: contextual card based on seed state
→ THIS WEEK zone: progress bar shows scheduled vs. userPrefs target
→ MOMENTUM zone: visible immediately (seed data includes prep sessions)
→ Insights modal: shows full 5-week consistency history with all metrics populated
→ Meals tab: coverage line + sort context visible with seed inventory
→ User explores, then begins own Plan → Prep cycle
```

### Flexible Prep Flow

```
Plan: User selects "Greek" + "Mexican" variants for Rice Bowl (flexible)
Shopping List: Both variant ingredient sets appear as a choice group
→ User resolves to one variant while shopping
→ Send to Log Prep

Prep: PendingCard for Rice Bowl
→ "Which variant did you make?" — user picks one
→ Mark as Prepped → single PreparedMeal, resolved variant
→ Reward card: "X meals ready. Covered through [day]."
```

### Manual Prep Log

```
Prep → Manual Log Form (no pending queue)
→ Select recipe → select variant → set servings / date / storage
→ Log Prep Session
→ Reward card: "X meals ready." + coverage + streak chip
```

### Weekly Reset Flow

```
Sunday 5pm–midnight OR Monday before 1pm
→ Prior 7 days: ≥ 3 entries in mealEatenDates
→ planEntries.length === 0 (no new plan started)
→ TODAY zone shows reset prompt:
   "You stayed on track last week. Ready to plan this week?"
   — or —
   "Strong week. Build this week's plan to keep the momentum." (≥ 5 meals)
→ CTA links to Plan tab
→ User plans → trigger no longer fires once planEntries.length > 0
```

### Insights Check-In

```
Any screen → tap bar chart icon in header
→ Insights modal slides up
→ Section 1 — Consistency: streak, best streak, active weeks
→ Section 2 — Execution: prep sessions, eaten this week, total eaten
→ Section 3 — Planning: weeks on target, hit rate %
→ Peak accent highlight if current streak = best streak
→ Tap × or backdrop to close
```

---

## State Management

All state lives in a single Zustand store, persisted to localStorage (`freshprep-store`).

### State Slices

| Slice | Type | Contents |
|---|---|---|
| `recipes` | `Recipe[]` | All recipe definitions |
| `planEntries` | `PlanEntry[]` | Current week's plan |
| `pendingPreps` | `PendingPrep[]` | Meals awaiting prep confirmation |
| `preparedMeals` | `PreparedMeal[]` | In-inventory prepped meals |
| `scheduledMeals` | `ScheduledMeal[]` | Meal-to-slot bindings |
| `eatenScheduledIds` | `string[]` | IDs of scheduled meals marked eaten |
| `onboardingComplete` | `boolean` | Whether onboarding has been completed |
| `userPrefs` | `UserPrefs \| null` | Preferences from onboarding |
| `mealsEatenAllTime` | `number` | Running total — increments on `markScheduledEaten` |
| `prepSessionsLogged` | `number` | Running total — increments on `logPrepEvent` and `markPrepComplete` |
| `mealEatenDates` | `string[]` | YYYY-MM-DD appended per meal eaten; may duplicate within a day |
| `insightsTipSeen` | `boolean` | Whether the header tooltip has been shown and dismissed |
| `planSubTab` | `'picks' \| 'shopping'` | Active Plan sub-tab |
| `calendarSubTab` | `'daily' \| 'weekly'` | Active Calendar sub-tab |
| `shoppingGrabbed` | `string[]` | Checked shopping item keys |
| `shoppingChosen` | `Record<string, string>` | Resolved flexible shopping choices |
| `shoppingCollapsed` | `Record<string, boolean>` | Collapsed shopping sections |
| `shoppingSortMode` | `'recipe' \| 'category'` | Shopping list sort mode |
| `collapsedEntries` | `Record<string, boolean>` | Collapsed plan entry cards |
| `recipesSelectedId` | `string \| null` | Open recipe in detail view |

### Side Effects

**`markScheduledEaten(id)`**
- Appends `id` to `eatenScheduledIds`
- Increments `mealsEatenAllTime` by 1
- Appends `format(new Date())` to `mealEatenDates`

**`logPrepEvent(event)`**
- Creates `PreparedMeal` from event
- Increments `prepSessionsLogged` by 1

**`markPrepComplete(pendingId, storage, ...)`**
- Creates `PreparedMeal` from `PendingPrep`
- Removes pending item
- Increments `prepSessionsLogged` by 1

**`completeOnboarding(prefs)`** — sets `onboardingComplete: true`, stores `userPrefs`

**`markInsightsTipSeen()`** — sets `insightsTipSeen: true`

### Computed (not stored)

`getFreshnessStatus(meal)`, `getExpirationDate(meal)`, `getDaysRemaining(meal)` — derived from `meal.prepDate`, `meal.storage`, and `new Date()` at call time. Never persisted.

---

## Seed Data

On first load (fresh localStorage), the store initializes with demo data. Clearing `freshprep-store` from localStorage and reloading resets to this state.

### Seed Recipes (3)

| Recipe | Type | Structure |
|---|---|---|
| Protein Plate | Composed | 3 slots: Protein (5 options), Carb (6 options), Vegetable (6 options) |
| Rice Bowl | Standard | 5 core ingredients, 3 variants: Greek, Japanese BBQ, Mexican |
| Breakfast Burrito | Standard | 6 core ingredients, no variants |

### Seed Prepared Meals (5)

All dates computed relative to today at app load:

| Meal | Storage | Prepped | Servings remaining |
|---|---|---|---|
| Protein Plate (Chicken · Brown rice · Asparagus) | Refrigerated | 3 days ago | 2 |
| Protein Plate (Steak · Wild rice · Broccoli) | Frozen | 10 days ago | 5 |
| Rice Bowl Japanese BBQ | Refrigerated | Yesterday | 4 |
| Rice Bowl Mexican | Frozen | 14 days ago | 3 |
| Breakfast Burrito | Refrigerated | 2 days ago | 5 |

### Seed Scheduled Meals (4)

- Today: Breakfast (Breakfast Burrito), Lunch (Protein Plate Chicken)
- Tomorrow: Lunch (Rice Bowl Japanese BBQ)
- Day after tomorrow: Lunch (Rice Bowl Mexican)

### Seed Insights History

`mealEatenDates` is populated with 5 weeks of eating activity. Dates are anchored to each week's actual Monday via `getMondayOfWeek` — robust regardless of what day of the week localStorage is cleared.

| Week | Meals |
|---|---|
| 4 weeks ago | 3 meals — Tue, Wed, Thu of that Mon–Sun week |
| 3 weeks ago | 5 meals — Mon through Fri |
| 2 weeks ago | 4 meals — Mon, Tue, Thu, Fri |
| Last week | 5 meals — Mon through Fri |
| This week | Up to 3 meals — Mon, Tue, Wed (filtered to ≤ today) |

`mealsEatenAllTime: 20` and `prepSessionsLogged: 5` are also seeded.

**Resulting Insights metrics** with `userPrefs.mealsPerWeek = 5`:

| Metric | Value |
|---|---|
| Current streak | 5 weeks |
| Best streak | 5 weeks |
| Active weeks | 5 |
| Weeks on target (≥ 5 meals) | 2 |
| Hit rate | 40% |
| Total meals eaten | 20 |
| Prep sessions | 5 |

The current streak equals the best streak, so the accent peak-highlight fires in the Insights modal.

---

## Utility Modules

### `utils/dates.ts`

| Function | Signature | Description |
|---|---|---|
| `format` | `(date: Date) → string` | Date → YYYY-MM-DD |
| `parseISO` | `(str: string) → Date` | YYYY-MM-DD → Date at noon (timezone-safe) |
| `addDays` | `(date: Date, n: number) → Date` | New Date offset by N days |
| `differenceInDays` | `(a: Date, b: Date) → number` | Signed day difference |
| `formatDisplay` | `(str: string) → string` | YYYY-MM-DD → "Apr 26" |
| `getDayLabel` | `(str: string) → string` | YYYY-MM-DD → "Mon", "Tue", etc. |
| `getMondayOfWeek` | `(str: string) → string` | YYYY-MM-DD → Monday of that ISO week |
| `computeWeekStreak` | `(dates: string[]) → number` | Consecutive Mon–Sun weeks backwards from current with ≥ 1 entry |
| `computeBestWeekStreak` | `(dates: string[]) → number` | Longest consecutive Mon–Sun week run in history |
| `computeWeeksOnTarget` | `(dates: string[], target: number) → number` | Weeks with ≥ `target` entries |

### `utils/scale.ts`

`scaleQuantity(quantity: string, servings: number) → string` — multiplies numeric quantities in ingredient strings by a serving multiplier. Handles fractions and mixed units.

### `utils/categorize.ts`

`categorizeIngredient(name: string) → string` — keyword inference → shopping category (Produce, Proteins, Dairy & Eggs, Pantry, etc.)

`categorizeSlotLabel(label: string) → string` — same for composed slot labels (Protein, Carb, etc.)

`CATEGORY_ORDER: string[]` — canonical display order for shopping list grouping.

---

## Component Inventory

| File | What it renders |
|---|---|
| `Layout.tsx` | Persistent header, bottom nav, discoverability tooltip, Insights modal trigger |
| `OnboardingScreen.tsx` | 3-step onboarding flow |
| `PlanScreen.tsx` | What to Prep sub-tab + Shopping List sub-tab |
| `PrepScreen.tsx` | Pending prep queue + manual log form + reward card |
| `ScheduleScreen.tsx` | Calendar Daily view (3-zone dashboard) + Calendar Weekly view |
| `MealsScreen.tsx` | Inventory list with freshness bars, coverage line, schedule modal |
| `RecipesScreen.tsx` | Recipe list + recipe detail with ingredients/variants/slots |
| `InsightsModal.tsx` | Progress modal with Consistency / Execution / Planning sections |

---

## Design System Conventions

**Typography scale in use:**
- `text-lg font-semibold` — screen headings
- `text-base font-semibold` — card headings, large stat values
- `text-sm` — body copy, form labels, card body text
- `text-xs` — supporting labels, dates, badges
- `text-[11px]` — section zone labels, chip labels
- `text-[10px]` — reserved for extreme secondary context only

**Opacity conventions:**
- `text-brand-muted` (100%) — primary text, headings
- `text-brand-muted/60` — secondary body text
- `text-brand-muted/50` — muted body text, subtitles
- `text-brand-muted/45` — chip labels, supporting copy
- `text-brand-muted/40` — section zone labels
- `text-brand-muted/35` — sort context notes, minimum readable
- `text-brand-muted/30` — do not use (below readable threshold)

**Card pattern:** `bg-brand-surface rounded-lg border border-brand-muted/15 p-4`

**Active / selected state:** `bg-brand-accent text-brand-muted border-brand-accent`

**Empty states:** SVG icon at `text-brand-muted/20` (stroke-1) + heading at `/55`–`/60` + body at `/40`. No emoji.

**Section zone labels:** `text-[11px] font-semibold text-brand-muted/40 uppercase tracking-widest`

**Modals:** `fixed inset-0 bg-black/70` backdrop + `bg-brand-surface border border-brand-muted/15 rounded-xl` sheet + `max-h-[75–88vh]` depending on content depth.
