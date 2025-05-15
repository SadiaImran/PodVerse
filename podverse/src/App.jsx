import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUpScreen from "./screens/screen-signup";
import SignUpScreenEmail from "./screens/screen-signup-email";
import SignInScreen from "./screens/screen-signin";
import SignInScreenEmail from "./screens/screen-signin-email";
import CreatePodcastPage from './screens/screen-create-podcast';
import ActivityFeedPage from './screens/screen-activity-feed';
import AgentSetupFlow from './screens/screen-agent-setup';
import ScreenRecording from './screens/screen-recording'

function App() {
  return (
    //<ScreenRecording/>
    //<AgentSetupFlow></AgentSetupFlow>
    //<ActivityFeedPage></ActivityFeedPage>
    //<CreatePodcastPage></CreatePodcastPage>
    // <div className="bg-light-cream h-screen w-screen">
      <Router>
      <Routes>
        <Route path="/" element={<SignInScreen />} />
        <Route path="/signin-email" element={<SignInScreenEmail />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/signup-email" element={<SignUpScreenEmail />} />
        <Route path="/home" element={<ActivityFeedPage/>}></Route>
        <Route path="/create-podcast" element={<CreatePodcastPage/>}></Route>
        <Route path="/agent-setup" element={<AgentSetupFlow/>}></Route>
        <Route path="/start-recording" element={<ScreenRecording/>}></Route>        
      </Routes>
      </Router>
    // </div>
  );
}
export default App;