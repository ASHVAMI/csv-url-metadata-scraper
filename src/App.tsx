import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { FileUpload } from './components/FileUpload';
import { ResultsList } from './components/ResultsList';
import { Auth } from './components/Auth';
import { Stats } from './components/Stats';
import { supabase } from './lib/supabase';
import { User } from './types';
import { LogOut, Database, BarChart2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Toaster position="top-right" />
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">URL Metadata Scraper</h1>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Stats</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <div className="space-y-8">
            {showStats ? (
              <Stats />
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Upload URLs</h2>
                  <FileUpload />
                </div>
                <ResultsList />
              </>
            )}
          </div>
        ) : (
          <Auth />
        )}
      </main>
    </div>
  );
}

export default App;