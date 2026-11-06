import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { TeamProvider } from '../context/TeamContext';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <TeamProvider>
          <RouterProvider router={router} />
        </TeamProvider>
      </AuthProvider>
    </ToastProvider>
  );
};
