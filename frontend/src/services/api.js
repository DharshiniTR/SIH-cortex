// API Service layer for DigiMocker backend

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  // If running on port 5000 (served directly by express), use relative path
  if (window.location.port === '5000' || window.location.hostname === 'digimocker.herokuapp.com') {
    return '/api';
  }
  // If running on Vite dev server (e.g. 5173 / 3000), target backend port 5000
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

export const getAuthToken = () => localStorage.getItem('digimocker_token');
export const getUser = () => {
  const user = localStorage.getItem('digimocker_user');
  return user ? JSON.parse(user) : null;
};

export const setAuthSession = (token, user) => {
  if (token) localStorage.setItem('digimocker_token', token);
  if (user) localStorage.setItem('digimocker_user', JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem('digimocker_token');
  localStorage.removeItem('digimocker_user');
};

const handleFetch = async (url, options) => {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error('Cannot connect to server at http://localhost:5000. Please check if "npm start" is running.');
  }

  const text = await res.text();

  if (res.status === 500) {
    throw new Error(text || 'Database connection error. Ensure MongoDB is running locally or set MONGO_URL in .env');
  }

  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return { res, text };
};

export const registerUser = async (name, email, password, mobile) => {
  const { text } = await handleFetch(`${API_BASE}/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, mobile })
  });

  if (text.includes('Email already exists')) {
    throw new Error('Email already exists in system');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

export const loginUser = async (email, password) => {
  const { res, text } = await handleFetch(`${API_BASE}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (text.includes('Email not found')) {
    throw new Error('Email not found');
  }

  const tokenHeader = res.headers.get('auth-token');
  const token = tokenHeader || text.trim();

  if (!token || token.includes('Error')) {
    throw new Error('Failed to obtain authentication token');
  }

  const userData = { email, name: email.split('@')[0] };
  setAuthSession(token, userData);

  return { token, user: userData };
};

export const fetchDocuments = async (email) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const { text } = await handleFetch(`${API_BASE}/docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': token
    },
    body: JSON.stringify({ email })
  });

  try {
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
};

export const fetchDocumentByName = async (email, name) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const { text } = await handleFetch(`${API_BASE}/docs/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': token
    },
    body: JSON.stringify({ email })
  });

  try {
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
};

export const addDocument = async ({ name, email, identifier, url }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const { text } = await handleFetch(`${API_BASE}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': token
    },
    body: JSON.stringify({ name, email, identifier, url })
  });

  if (text.includes('Document already exists')) {
    throw new Error('A document with this name already exists in your vault');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

export const deleteDocument = async ({ email, id, name, identifier }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const { text } = await handleFetch(`${API_BASE}/docs/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': token
    },
    body: JSON.stringify({ email, id, name, identifier })
  });

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};
