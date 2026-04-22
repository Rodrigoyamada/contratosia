import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Processes from './pages/Processes';
import ProcessDetails from './pages/ProcessDetails';
import Users from './pages/Users';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

function App() {
  console.log('Rendering App component...');
  // Check for environment variables
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Configuração Necessária</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            As variáveis de ambiente do Supabase não foram encontradas.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crie um arquivo <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.env.local</code> na raiz do projeto com:
          </p>
          <pre className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">
            VITE_SUPABASE_URL=sua_url<br />
            VITE_SUPABASE_ANON_KEY=sua_chave
          </pre>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/processes"
            element={
              <ProtectedRoute>
                <Processes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/processes/:id"
            element={
              <ProtectedRoute>
                <ProcessDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <Users />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
