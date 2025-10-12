import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpScreenEmail from './assets/screens/screen-signup-email';
import SignInScreenEmail from './assets/screens/screen-signin-email';
import CreatePodcastPage from './assets/screens/screen-create-podcast';
import ActivityFeedPage from './assets/screens/screen-activity-feed';
import AgentSetupFlow from './assets/screens/screen-agent-setup';
import ScreenRecording from './assets/screens/screen-recording';
import ForgotPassword from './assets/components/comp-signin/ForgotPassword';
import ResetPassword from './assets/components/comp-signin/ResetPassword';
import { AuthProvider } from './assets/context/AuthContext';
import PrivateRoute from './assets/components/PrivateRoute'; 
import AudioEditor from './assets/screens/screen-audio-edit';
import ScreenFAQ from './assets/screens/screen-faq-chatbot';

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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
