import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import UploadPage from './pages/UploadPage';
import FilesPage from './pages/FilesPage';
import EmailPage from './pages/EmailPage';
import EmailLogs from './pages/EmailLogs';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="email" element={<EmailPage />} />
          <Route path="logs" element={<EmailLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
