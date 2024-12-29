import SettingsForm from './components/SettingsForm';
import RightColumnTabs from './components/RightColumnTabs';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="main-layout">
        <div className="left-column">
          <SettingsForm />
        </div>
        <div className="right-column">
          <RightColumnTabs />
        </div>
      </div>
    </div>
  );
}

export default App;
