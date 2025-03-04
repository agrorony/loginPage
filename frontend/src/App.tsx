import React, { useState } from 'react';
import Login from './components/Login';
import UserDashboard from './components/userDashboard';

/**
 * Interface defining the user data structure used throughout the application
 */
interface User {
  id: number;          // Unique user identifier
  username: string;    // User's login name
  created_at: string;  // Timestamp when user was created
}

/**
 * Main App component that manages application state and routing
 */
function App() {
  // ===== STATE MANAGEMENT =====
  // Track the current logged-in user (null when not logged in)
  const [user, setUser] = useState<User | null>(null);

  /**
   * Handler for successful login - stores user data in state
   * @param userData User data received from server after successful login
   */
  const handleLoginSuccess = (userData: User) => {
    console.log('Login success in App.tsx:', userData);
    setUser(userData); // Store user data in state
  };

  /**
   * Handler for logout - clears user data from state
   */
  const handleLogout = () => {
    setUser(null); // Reset user state to null
  };

  console.log('Current user state:', user);

  // ===== COMPONENT RENDERING =====
  return (
    <div className="App">
      {/* Conditional rendering based on login state */}
      {user ? (
        // User is logged in - show dashboard with logout button
        <div>
          {/* Logout button - positioned in top right corner */}
          <button 
            onClick={handleLogout}
            className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
          
          {/* User dashboard - pass the user data as props */}
          <UserDashboard user={user} />
        </div>
      ) : (
        // User is not logged in - show login component
        // Pass the login success handler as props
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;