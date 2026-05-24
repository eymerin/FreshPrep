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

type Tab = 'plan' | 'prep' | 'schedule' | 'meals' | 'recipes' | 'profile';

export default function App() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  useWidgetSync();
  useNotificationCheck();

  if (!onboardingComplete) {
    return <OnboardingScreen />;
  }

  const navigate = (tab: string) => setActiveTab(tab as Tab);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'plan'     && <PlanScreen onNavigate={navigate} />}
      {activeTab === 'prep'     && <PrepScreen onNavigate={navigate} />}
      {activeTab === 'schedule' && <ScheduleScreen onNavigate={navigate} />}
      {activeTab === 'meals'    && <MealsScreen onNavigate={navigate} />}
      {activeTab === 'recipes'  && <RecipesScreen />}
      {activeTab === 'profile'  && (
        <ProfileScreen onClose={() => setActiveTab('schedule')} pageMode />
      )}
    </Layout>
  );
}
