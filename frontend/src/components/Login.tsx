import React, { useState } from 'react';
import axios from 'axios';

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    username: string;
    created_at: string;
  };
}

interface LoginProps {
  onLoginSuccess: (userData: { username: string; created_at: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages

    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      console.log('Attempting', isRegistering ? 'registration' : 'login', 'with:', username, password);

      const response = await axios.post<LoginResponse>(endpoint, { username, password });
      console.log('Server response received:', response.data);

      if (response.data.success && response.data.user) {
        console.log('Login successful, user data:', response.data.user);
        setMessage(response.data.message);
        onLoginSuccess(response.data.user);
      } else {
        console.log('Login failed, server message:', response.data.message);
        setMessage(response.data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error during login/register:', error);
      setMessage('Internal server error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>

          {message && (
            <div className={`text-sm ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
};

export default Login;