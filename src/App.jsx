// src/App.jsx

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRouter from "./routes/AppRouter";
import SessionExpiredModal from "./components/common/SessionExpiredModal";

import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <SessionExpiredModal />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;