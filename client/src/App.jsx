import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ReleaseDetail from './pages/ReleaseDetail';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/release/:id" element={<ReleaseDetail />} />
      </Routes>
    </div>
  );
}

export default App;
