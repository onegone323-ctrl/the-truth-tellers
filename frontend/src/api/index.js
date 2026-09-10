/**
 * API Client Index
 * Exports all API clients and utilities
 */

export { base44 } from './base44Client';
export { copilotClient, CopilotClient } from './copilotClient';

/**
 * Backend API helper
 */
export const apiCall = async (endpoint, options = {}) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const url = `${baseUrl}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  return response.json();
};
