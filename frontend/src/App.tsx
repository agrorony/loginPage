import React, { useState } from 'react';
import Login from './components/Login';
import UserDashboard from './components/userDashboard';

// Updated User interface (removed `id`)
interface User {
  username: string;
  created_at: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (userData: User) => {
    console.log('handleLoginSuccess called with userData:', userData);
    setUser(userData);
  };

  console.log('Current user state:', user);

  return (
    <div>
      {user ? (
        <UserDashboard user={user} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;