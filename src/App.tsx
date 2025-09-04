import { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Groups from './components/Groups';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'groups':
        return <Groups />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-grow">
        {renderPage()}
      </main>
      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-3 text-sm">
        © {new Date().getFullYear()} Developed by Mehdi Glida @ GSA
      </footer>
      <Toaster />
    </div>
  );
}

export default App;