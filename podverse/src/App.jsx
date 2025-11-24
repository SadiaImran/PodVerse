import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpScreenEmail from './assets/screens/screen-signup-email';
import SignInScreenEmail from './assets/screens/screen-signin-email';
import CreatePodcastPage from './assets/screens/screen-create-podcast';
import ActivityFeedPage from './assets/screens/screen-activity-feed';
import AgentSetupFlow from './assets/screens/screen-agent-setup';
import PodcastSetupFlow from './assets/screens/screen-podcast-setup';
import ScreenRecording from './assets/screens/screen-recording';
import ForgotPassword from './assets/components/comp-signin/ForgotPassword';
import ResetPassword from './assets/components/comp-signin/ResetPassword';
import { AuthProvider } from './assets/context/AuthContext';
import PrivateRoute from './assets/components/PrivateRoute';
import AudioEditor from './assets/screens/screen-audio-edit';
import ScreenFAQ from './assets/screens/screen-faq-chatbot';
import VideoGeneratorPage from './assets/screens/screen-video-generation';
import VideoEditorV7Screen from './assets/screens/screen-video-editor-v7';
import ProfilePage from './assets/screens/screen-profile';
import OnboardingScreen from './assets/screens/screen-onboarding';
import SearchPage from './assets/screens/screen-search';
import AdminLayout from './assets/components/layouts/AdminLayout';
import AdminDashboard from './assets/screens/admin/screen-admin-dashboard';
import AdminUsers from './assets/screens/admin/screen-admin-users';
import AdminPosts from './assets/screens/admin/screen-admin-posts';
import AdminAnalytics from './assets/screens/admin/screen-admin-analytics';
import FAQs from './assets/screens/admin/screen-admin-faqs';
import AdminAIAvatars from './assets/screens/admin/screen-admin-ai-avatars';
import AdminSubscriptions from './assets/screens/admin/screen-admin-subscriptions';
import ScreenPodcastFeedback from './assets/screens/screen-podcast-feedback';
import SubscriptionPage from './assets/screens/screen-subscription';
import SubscriptionSuccessPage from './assets/screens/screen-subscription-success';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SignInScreenEmail />} />
          <Route path="/signin-email" element={<SignInScreenEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/signup-email" element={<SignUpScreenEmail />} />

          {/* Protected Routes */}
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <ActivityFeedPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-podcast"
            element={
              <PrivateRoute>
                <CreatePodcastPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/library"
            element={
              <PrivateRoute>
                <CreatePodcastPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/agent-setup"
            element={
              <PrivateRoute>
                <AgentSetupFlow />
              </PrivateRoute>
            }
          />
          <Route
            path="/podcast-setup"
            element={
              <PrivateRoute>
                <PodcastSetupFlow />
              </PrivateRoute>
            }
          />
          <Route
            path="/start-recording"
            element={
              <PrivateRoute>
                <ScreenRecording />
              </PrivateRoute>
            }
          />
          <Route
            path="/audio-edit"
            element={
              <PrivateRoute>
                <AudioEditor />
              </PrivateRoute>
            }
          />
          <Route
            path="/faq-chatbot"
            element={
              <PrivateRoute>
                <ScreenFAQ />
              </PrivateRoute>
            }
          />
          <Route
            path="/video-generation"
            element={
              <PrivateRoute>
                <VideoGeneratorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/video-editor"
            element={
              <PrivateRoute>
                <VideoEditorV7Screen />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <OnboardingScreen />
              </PrivateRoute>
            }
          />
          <Route
            path="/search"
            element={
              <PrivateRoute>
                <SearchPage />
              </PrivateRoute>
            }
          />
          {/* Admin Routes - Protected */}
          <Route
            path="/admin"
            element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/posts"
            element={
              <AdminLayout>
                <AdminPosts />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/faqs"
            element={
              <AdminLayout>
                <FAQs />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/ai/avatars"
            element={
              <AdminLayout>
                <AdminAIAvatars />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <AdminLayout>
                <AdminSubscriptions />
              </AdminLayout>
            }
          />
          <Route
            path="/feedback"
            element={
              <PrivateRoute>
                <ScreenPodcastFeedback />
              </PrivateRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <PrivateRoute>
                <SubscriptionPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/subscription-success"
            element={
              <PrivateRoute>
                <SubscriptionSuccessPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
