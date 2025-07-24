import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpScreen from './screens/screen-signup';
import SignUpScreenEmail from './screens/screen-signup-email';
import SignInScreenEmail from './screens/screen-signin-email';
import CreatePodcastPage from './screens/screen-create-podcast';
import ActivityFeedPage from './screens/screen-activity-feed';
import AgentSetupFlow from './screens/screen-agent-setup';
import ScreenRecording from './screens/screen-recording';
import ForgotPassword from './components/comp-signin/ForgotPassword';
import ResetPassword from './components/comp-signin/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute'; 

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SignInScreenEmail />} />
          <Route path="/signin-email" element={<SignInScreenEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/signup" element={<SignUpScreen />} />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
