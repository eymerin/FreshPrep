export type MessageSet = 'first-steps' | 'prep-day' | 'clean-plate' | 'week-champion' | 'streak';

export interface CollectibleMessage {
  id: string;
  set: MessageSet;
  text: string;
}

export const SET_CONFIG: Record<MessageSet, {
  label: string;
  emoji: string;
  hint: string;
  gradient: string;
  accentColor: string;
  cardCount: number;
}> = {
  'first-steps': {
    label: 'First Steps',
    emoji: '⭐',
    hint: 'Earned for major milestones',
    gradient: 'linear-gradient(135deg, #92400E 0%, #B45309 100%)',
    accentColor: '#F59E0B',
    cardCount: 5,
  },
  'prep-day': {
    label: 'Prep Day',
    emoji: '🥘',
    hint: 'Earned when you log a prep session',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
    accentColor: '#10B981',
    cardCount: 20,
  },
  'clean-plate': {
    label: 'Clean Plate Club',
    emoji: '✨',
    hint: 'Earned when you eat all planned meals in a day',
    gradient: 'linear-gradient(135deg, #164E63 0%, #0E7490 100%)',
    accentColor: '#06B6D4',
    cardCount: 15,
  },
  'week-champion': {
    label: 'Week Champion',
    emoji: '🏆',
    hint: 'Earned when you eat through a full planned week',
    gradient: 'linear-gradient(135deg, #3B0764 0%, #5B21B6 100%)',
    accentColor: '#8B5CF6',
    cardCount: 10,
  },
  'streak': {
    label: 'Streak Builder',
    emoji: '🔥',
    hint: 'Earned at consecutive prep-week milestones',
    gradient: 'linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)',
    accentColor: '#F97316',
    cardCount: 10,
  },
};

export const STREAK_MILESTONES = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

export const ALL_MESSAGES: CollectibleMessage[] = [
  // ── First Steps (5) ──────────────────────────────────────────
  { id: 'fs-1', set: 'first-steps', text: "You prepped. That puts you ahead of literally everyone still saying 'I'll start Monday.'" },
  { id: 'fs-2', set: 'first-steps', text: "Your first full day of planned meals, eaten on purpose. That's not nothing. That's actually everything." },
  { id: 'fs-3', set: 'first-steps', text: "Look at you planning your whole week in advance like someone who has their life together. Because you do." },
  { id: 'fs-4', set: 'first-steps', text: "You linked your first ingredient to real nutrition data. Your recipes just got smarter than most restaurant menus." },
  { id: 'fs-5', set: 'first-steps', text: "Goal set. Plan made. Fridge stocked. You're not just meal prepping — you're building a system." },

  // ── Prep Day (20) ────────────────────────────────────────────
  { id: 'pd-1',  set: 'prep-day', text: "Sunday you > Monday you. Monday you is going to be so relieved." },
  { id: 'pd-2',  set: 'prep-day', text: "The containers are full. The week is set. The fridge closes with the satisfying click of a life well-organized." },
  { id: 'pd-3',  set: 'prep-day', text: "Every meal you just prepped is one less 'I don't know what to eat' standing between you and a great day." },
  { id: 'pd-4',  set: 'prep-day', text: "Future you just received a care package. From you. With food. This is what love looks like." },
  { id: 'pd-5',  set: 'prep-day', text: "That's a whole lot of meals that aren't going to be sad desk lunches. Nice work." },
  { id: 'pd-6',  set: 'prep-day', text: "Chopped, cooked, stored, done. You basically have a personal chef — and it's you." },
  { id: 'pd-7',  set: 'prep-day', text: "Your meal prep game is so strong it's basically intimidating at this point." },
  { id: 'pd-8',  set: 'prep-day', text: "Somewhere a vending machine is getting very nervous right now." },
  { id: 'pd-9',  set: 'prep-day', text: "This is what 'having your life together' tastes like. It tastes like something you actually planned." },
  { id: 'pd-10', set: 'prep-day', text: "If meal prep were an Olympic sport, you'd at least make it to regionals. Probably finals." },
  { id: 'pd-11', set: 'prep-day', text: "Less stress, more protein. You just engineered a better week. Simple as that." },
  { id: 'pd-12', set: 'prep-day', text: "Another batch down. The routine is becoming the ritual. The ritual is becoming you." },
  { id: 'pd-13', set: 'prep-day', text: "While others scroll delivery apps at 7pm, you'll be eating something you actually planned. Quietly superior." },
  { id: 'pd-14', set: 'prep-day', text: "The freezer is stocked. The vibes are immaculate. You're basically unstoppable this week." },
  { id: 'pd-15', set: 'prep-day', text: "Meal prepped. Mood: chef's kiss. Season: you." },
  { id: 'pd-16', set: 'prep-day', text: "Hot take: this is the most underrated form of self-care there is. No face mask required." },
  { id: 'pd-17', set: 'prep-day', text: "You cooked more in one session than some people cook all month. Respect, honestly." },
  { id: 'pd-18', set: 'prep-day', text: "You made food, stored food, and now the week has exactly zero power over you." },
  { id: 'pd-19', set: 'prep-day', text: "A little prep effort buys a whole week of peace. That math hits different every time." },
  { id: 'pd-20', set: 'prep-day', text: "The containers are packed. The week is already winning. All because you showed up." },

  // ── Clean Plate Club (15) ────────────────────────────────────
  { id: 'cp-1',  set: 'clean-plate', text: "Full day of prepped meals eaten. Your past self really came through on this one." },
  { id: 'cp-2',  set: 'clean-plate', text: "Everything you planned, you ate. That's rare. That's discipline wearing comfortable clothes." },
  { id: 'cp-3',  set: 'clean-plate', text: "Not a single unplanned detour today. Your streak of good decisions continues undefeated." },
  { id: 'cp-4',  set: 'clean-plate', text: "The plan worked. Honestly shocking. Except not at all, because you made the plan." },
  { id: 'cp-5',  set: 'clean-plate', text: "You ate exactly what you said you'd eat. No drama, no detours, no regrets. Just done." },
  { id: 'cp-6',  set: 'clean-plate', text: "Perfect execution. Chef's kiss. Both literally and metaphorically. You're the chef." },
  { id: 'cp-7',  set: 'clean-plate', text: "Zero excuses, zero surprises, zero sad vending machine trips. You win. Today: entirely yours." },
  { id: 'cp-8',  set: 'clean-plate', text: "100% of your planned meals: eaten. 0% of your stress: needed. Clean math." },
  { id: 'cp-9',  set: 'clean-plate', text: "Your past self prepped it. Your current self ate it. Your future self benefits. Time is a cycle and yours is delicious." },
  { id: 'cp-10', set: 'clean-plate', text: "All meals, all gone, all on purpose. That's the whole move right there." },
  { id: 'cp-11', set: 'clean-plate', text: "Another clean day. You're building something real here, one meal at a time." },
  { id: 'cp-12', set: 'clean-plate', text: "The fridge is lighter. Your week is lighter. That was a very good trade." },
  { id: 'cp-13', set: 'clean-plate', text: "You actually ate what you actually made. The circle of meal prep: fulfilled. Deeply satisfying." },
  { id: 'cp-14', set: 'clean-plate', text: "No panic eating, no skipping, no mystery takeout. Just the plan. Just you. Just right." },
  { id: 'cp-15', set: 'clean-plate', text: "Every prepped meal gets eaten, every eaten meal is a win. Today's final score: all wins." },

  // ── Week Champion (10) ───────────────────────────────────────
  { id: 'wc-1',  set: 'week-champion', text: "Entire week of planned meals: consumed. You went 7 for 7. That's not just meal prep — that's a lifestyle." },
  { id: 'wc-2',  set: 'week-champion', text: "A full week of showing up for yourself. Some weeks are just built different. This was one of them." },
  { id: 'wc-3',  set: 'week-champion', text: "From Sunday prep to the final meal: untouchable. That's a whole week you handled." },
  { id: 'wc-4',  set: 'week-champion', text: "Every meal this week had your name on it. Literally. You labeled the containers. Legend move." },
  { id: 'wc-5',  set: 'week-champion', text: "Full week unlocked. Bonus: your next grocery run is going to feel way less chaotic. You already know why." },
  { id: 'wc-6',  set: 'week-champion', text: "Seven days, every meal planned, every meal eaten. You are a meal prep legend. The legend grows weekly." },
  { id: 'wc-7',  set: 'week-champion', text: "You finished the week the same way you started it — with a plan that actually worked." },
  { id: 'wc-8',  set: 'week-champion', text: "This is what sustainable looks like. Not perfect, not extreme. Just consistent. Just you. Just this." },
  { id: 'wc-9',  set: 'week-champion', text: "Week complete. Nutrition intentional. Future self: thriving. You: solely responsible for all of it." },
  { id: 'wc-10', set: 'week-champion', text: "The whole week. Done. On purpose. This is the kind of boring that actually changes your life." },

  // ── Streak Builder (10) ──────────────────────────────────────
  { id: 'sb-2',  set: 'streak', text: "Two weeks of consistent prep. The habit is forming. You can almost feel it click into place." },
  { id: 'sb-3',  set: 'streak', text: "Three weeks straight. You've officially outlasted most New Year's resolutions. Quietly iconic." },
  { id: 'sb-4',  set: 'streak', text: "A month of showing up. At some point this stopped being effort and started being just... you." },
  { id: 'sb-5',  set: 'streak', text: "Five weeks. You built a routine, kept it, and didn't need a wellness podcast to tell you to." },
  { id: 'sb-6',  set: 'streak', text: "Six weeks and counting. The fridge is never empty, the week is never chaotic. You did that." },
  { id: 'sb-8',  set: 'streak', text: "Eight weeks. 'Prep day' isn't even a chore anymore. It's just Sunday. It's just you." },
  { id: 'sb-10', set: 'streak', text: "Ten weeks. Double digits. The kind of consistency that doesn't need to be loud about itself." },
  { id: 'sb-12', set: 'streak', text: "Twelve weeks. Three months. This stopped being a habit and became a fact about who you are." },
  { id: 'sb-16', set: 'streak', text: "Four months of intentional eating. Your future self isn't waiting for you to change. They're eating the evidence that you already did." },
  { id: 'sb-20', set: 'streak', text: "Twenty weeks. Nearly half a year. Some people don't do this once. You've done it twenty times. Respect." },
];
