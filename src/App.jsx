import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import LeadForm from './pages/LeadForm';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import EventsManager from './pages/EventsManager';
import RepresentativesManager from './pages/RepresentativesManager';
import MyLeads from './pages/MyLeads';
import CampaignsManager from './pages/CampaignsManager';

const AuthenticatedApp = () => {
  const { isLoadingAuth } = useAuth();

  // ממתינים לשחזור הסשן לפני הרינדור, כדי שמסכים מוגנים לא יהבהבו בין מצבים
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LeadForm />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/events" element={<EventsManager />} />
      <Route path="/representatives" element={<RepresentativesManager />} />
      <Route path="/my-leads" element={<MyLeads />} />
      <Route path="/campaigns" element={<CampaignsManager />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App