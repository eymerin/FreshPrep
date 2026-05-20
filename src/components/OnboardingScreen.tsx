import { useState } from 'react';
import { useAppStore } from '../store';
import { UserPrefs } from '../types';

type PrepFreq = UserPrefs['prepFrequency'];
type MealType = 'breakfast' | 'lunch' | 'dinner';

const MEAL_COUNTS = [3, 5, 7] as const;

const MEAL_TYPE_OPTIONS: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch' },
  { id: 'dinner',    label: 'Dinner' },
];

function formatMealTypes(types: MealType[]): string {
  const ordered = (['breakfast', 'lunch', 'dinner'] as MealType[]).filter((t) => types.includes(t));
  if (ordered.length === 0) return 'meals';
  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return `${ordered[0]} & ${ordered[1]}`;
  return 'breakfast, lunch & dinner';
}

const FREQ_OPTIONS: { id: PrepFreq; label: string; sub: string }[] = [
  { id: '1x',       label: 'Once a week',   sub: 'Sunday or weekend batch prep' },
  { id: '2x',       label: 'Twice a week',  sub: 'Two smaller prep sessions' },
  { id: 'flexible', label: 'Flexible',      sub: 'Whenever it works for me' },
];

function LeafIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21 V13" />
      <path d="M12 16 C10 14 7 14 5 15 C6 18 9 18 12 16Z" />
      <path d="M12 13 C14 11 17 11 19 12 C18 15 15 15 12 13Z" />
      <path d="M12 13 C12 11 13 9 12 7" />
    </svg>
  );
}

function ProgressDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5 mb-10">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all ${
            s <= step ? 'bg-brand-accent flex-1' : 'bg-brand-surface flex-1'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingScreen() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mealsPerWeek, setMealsPerWeek] = useState<number>(5);
  const [useCustom, setUseCustom] = useState(false);
  const [customMeals, setCustomMeals] = useState('');
  const [mealTypes, setMealTypes] = useState<MealType[]>(['lunch', 'dinner']);
  const [prepFrequency, setPrepFrequency] = useState<PrepFreq>('1x');

  const finalMeals = useCustom ? (parseInt(customMeals) || 5) : mealsPerWeek;
  const mealTypeLabel = formatMealTypes(mealTypes);
  const freqLabel = FREQ_OPTIONS.find((f) => f.id === prepFrequency)?.label.toLowerCase() ?? '';

  function toggleMealType(type: MealType) {
    setMealTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleFinish() {
    completeOnboarding({ mealsPerWeek: finalMeals, mealTypes, prepFrequency });
  }

  // ── Step 1: Welcome ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-8 pb-12">
        <div className="flex items-center gap-2 mb-14 text-brand-muted/75">
          <LeafIcon />
          <span className="text-xl font-semibold tracking-tight">FreshPrep</span>
        </div>

        <div className="text-center max-w-xs mb-14">
          <h1 className="text-2xl font-semibold text-brand-muted leading-snug mb-4">
            Meal prep, every week.
          </h1>
          <p className="text-brand-muted/55 text-sm leading-relaxed">
            Stay consistent with meal prep after cooking, not just before.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => setStep(2)}
            className="w-full bg-brand-accent text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-accent/80 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={handleFinish}
            className="w-full text-sm text-brand-muted/35 hover:text-brand-muted/55 transition-colors py-1"
          >
            Skip setup
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Prep style ──────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col px-6 pt-8 pb-10 max-w-md mx-auto">
        <ProgressDots step={2} />

        <h2 className="text-xl font-semibold text-brand-muted mb-1.5">Tell us about your prep style</h2>
        <p className="text-sm text-brand-muted/50 mb-8">Helps FreshPrep give you better guidance each week.</p>

        {/* Meals per week */}
        <div className="mb-7">
          <p className="text-sm font-medium text-brand-muted mb-3">How many meals do you usually prep weekly?</p>
          <div className="flex gap-2">
            {MEAL_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => { setMealsPerWeek(n); setUseCustom(false); }}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  !useCustom && mealsPerWeek === n
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-brand-surface text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                useCustom
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-surface text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
              }`}
            >
              Other
            </button>
          </div>
          {useCustom && (
            <input
              autoFocus
              type="number"
              min="1"
              max="21"
              value={customMeals}
              onChange={(e) => setCustomMeals(e.target.value)}
              placeholder="How many?"
              className="mt-2.5 w-full bg-brand-bg border border-brand-muted/20 rounded-lg px-3 py-2.5 text-sm text-brand-muted placeholder:text-brand-muted/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
            />
          )}
        </div>

        {/* Meal types */}
        <div className="mb-7">
          <p className="text-sm font-medium text-brand-muted mb-1">What meals are these mostly for?</p>
          <p className="text-xs text-brand-muted/40 mb-3">Select all that apply</p>
          <div className="flex gap-2">
            {MEAL_TYPE_OPTIONS.map((opt) => {
              const selected = mealTypes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleMealType(opt.id)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    selected
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-brand-surface text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                  }`}
                >
                  {selected && <span className="text-xs">✓</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prep frequency */}
        <div className="mb-10">
          <p className="text-sm font-medium text-brand-muted mb-3">How often do you typically prep?</p>
          <div className="flex flex-col gap-2">
            {FREQ_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPrepFrequency(opt.id)}
                className={`py-3 px-4 rounded-lg border text-left transition-colors ${
                  prepFrequency === opt.id
                    ? 'bg-brand-accent/15 border-brand-accent text-brand-muted'
                    : 'bg-brand-surface text-brand-muted/60 border-brand-muted/20 hover:border-brand-accent/50'
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className={`text-xs mt-0.5 ${prepFrequency === opt.id ? 'text-brand-muted/60' : 'text-brand-muted/35'}`}>
                  {opt.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep(3)}
          disabled={mealTypes.length === 0}
          className="w-full bg-brand-accent text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Step 3: Confirmation ────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col px-6 pt-8 pb-10 max-w-md mx-auto">
      <ProgressDots step={3} />

      {/* Check */}
      <div className="w-14 h-14 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center mb-6">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-brand-muted mb-1.5">You're all set.</h2>
      <p className="text-sm text-brand-muted/50 mb-7">Here's your prep profile.</p>

      {/* Summary */}
      <div className="bg-brand-surface rounded-xl border border-brand-muted/15 p-5 mb-7 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-brand-accent mt-0.5 text-xs">●</span>
          <p className="text-sm text-brand-muted">
            <span className="font-medium">{finalMeals} meals</span> per week, for {mealTypeLabel}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-brand-accent mt-0.5 text-xs">●</span>
          <p className="text-sm text-brand-muted">
            Prepping <span className="font-medium">{freqLabel}</span>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-brand-accent mt-0.5 text-xs">●</span>
          <p className="text-sm text-brand-muted">
            <span className="font-medium">3 starter recipes</span> ready to use
          </p>
        </div>
      </div>

      {/* First steps */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-brand-muted/40 uppercase tracking-wide mb-3">Your first steps</p>
        <div className="space-y-2">
          {[
            { n: '1', text: 'Add meals to this week\'s plan', where: 'Plan' },
            { n: '2', text: 'Log your prep session', where: 'Prep' },
            { n: '3', text: 'Schedule meals across the week', where: 'Calendar' },
          ].map((item) => (
            <div key={item.n} className="flex items-center gap-3 px-4 py-3 bg-brand-surface rounded-lg border border-brand-muted/15">
              <span className="w-5 h-5 rounded-full border border-brand-accent/50 text-brand-accent text-[11px] flex items-center justify-center font-semibold shrink-0">
                {item.n}
              </span>
              <span className="text-sm text-brand-muted flex-1">{item.text}</span>
              <span className="text-xs text-brand-muted/35 shrink-0">{item.where}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Collectible cards teaser */}
      <div className="mb-8 rounded-xl border border-brand-accent/25 bg-brand-accent/8 p-4 flex gap-3">
        <div className="text-xl mt-0.5 shrink-0">🥘</div>
        <div>
          <p className="text-sm font-semibold text-brand-muted leading-snug">You'll earn collectible cards as you go</p>
          <p className="text-xs text-brand-muted/55 mt-1 leading-relaxed">
            Log a prep session, eat a full planned day, or keep a streak — and you'll unlock one of 60 unique cards. They live in your profile whenever you want to revisit them.
          </p>
        </div>
      </div>

      <button
        onClick={handleFinish}
        className="w-full bg-brand-accent text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-accent/80 transition-colors"
      >
        Start Using FreshPrep
      </button>
    </div>
  );
}
