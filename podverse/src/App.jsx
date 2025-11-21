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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
