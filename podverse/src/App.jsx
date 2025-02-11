import AuthButton from "./components/comp-signin/AuthButton";

function App() {
  return (
    <>
      <AuthButton 
        bgColor="bg-primary-500" 
        textColor="text-white" 
        borderColor="border-primary-500"
        text="Log in with Email" 
        icon="&#128386;"
      />
    </>
  );
}

export default App;
