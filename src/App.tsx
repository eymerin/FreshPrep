import { useState } from 'react';
import { useAppStore } from './store';
import { useWidgetSync } from './hooks/useWidgetSync';
import { useNotificationCheck } from './hooks/useNotificationCheck';
import Layout from './components/Layout';
import PlanScreen from './components/PlanScreen';
import PrepScreen from './components/PrepScreen';
import MealsScreen from './components/MealsScreen';
import ScheduleScreen from './components/ScheduleScreen';
import RecipesScreen from './components/RecipesScreen';
import ProfileScreen from './components/ProfileScreen';
import OnboardingScreen from './components/OnboardingScreen';
import CelebrationOverlay from './components/CelebrationOverlay';

type Tab = 'plan' | 'prep' | 'schedule' | 'meals' | 'recipes' | 'profile';

export default function App() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  useWidgetSync();
  useNotificationCheck();

  if (!onboardingComplete) {
    return (
      <>
        <OnboardingScreen />
        <CelebrationOverlay />
      </>
    );
  }

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'plan'     && <PlanScreen onNavigate={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === 'prep'     && <PrepScreen />}
        {activeTab === 'schedule' && <ScheduleScreen onNavigate={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === 'meals'    && <MealsScreen />}
        {activeTab === 'recipes'  && <RecipesScreen />}
        {activeTab === 'profile'  && (
          <ProfileScreen onClose={() => setActiveTab('schedule')} pageMode />
        )}
      </Layout>
      <CelebrationOverlay />
    </>
  );
}
