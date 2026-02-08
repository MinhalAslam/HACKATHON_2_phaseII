/**
 * Centralized API Client with automatic JWT authentication
 *
 * This client handles:
 * - Automatic JWT token attachment to all requests
 * - 401 Unauthorized detection and redirect to login
 * - Error handling and response parsing
 * - Communication with FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get JWT token from localStorage
 * Returns null if no token is found
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('access_token');
}

/**
 * Clear JWT token from localStorage
 */
function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('access_token');
}

/**
 * Build headers with JWT token if available
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Handle API response and errors - DEFENSIVE VERSION
 * Automatically redirects to login on 401
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // Handle 401 Unauthorized - clear token and redirect
  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized - please login again');
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    throw new Error('Forbidden - you do not have permission to access this resource');
  }

  // Handle 404 Not Found
  if (response.status === 404) {
    throw new Error('Resource not found');
  }

  // Handle 422 Validation Error (FastAPI validation)
  if (response.status === 422) {
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((e: any) => e.msg || e.message).join(', ');
        throw new Error(`Validation error: ${messages}`);
      }
      throw new Error(errorData.detail || 'Validation failed');
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Validation failed');
    }
  }

  // Handle 500+ Internal Server Error
  if (response.status >= 500) {
    throw new Error('Server error - please try again later');
  }

  // Handle successful responses (2xx)
  if (response.ok) {
    // 204 No Content (DELETE operations)
    if (response.status === 204) {
      return {} as T;
    }

    // Try to parse JSON response
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      // Handle non-JSON success responses
      const text = await response.text();
      if (!text) {
        return {} as T; // Empty success response
      }
      throw new Error(`Unexpected response format: ${text.substring(0, 100)}`);
    } catch (error) {
      // JSON parsing failed
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from server');
      }
      throw error;
    }
  }

  // Handle other 4xx client errors (400, etc.)
  let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } else {
      // Non-JSON error response (HTML error page, etc.)
      const text = await response.text();
      if (text && (text.includes('<!DOCTYPE') || text.includes('<html>'))) {
        errorMessage = 'Server returned an error page instead of JSON';
      } else if (text) {
        errorMessage = text.substring(0, 200); // Truncate long text
      }
    }
  } catch {
    // Couldn't parse error response - use default message
  }

  throw new Error(errorMessage);
}

/**
 * API Client for FastAPI backend
 */
export const apiClient = {
  /**
   * Get all tasks for the authenticated user
   */
  async getTasks(userId?: string): Promise<any[]> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }
    const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Create a new task
   */
  async createTask(title: string, description?: string, userId?: string): Promise<any> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, description }),
      });
      return handleResponse(response);
    } catch (error) {
      // Catch network errors (CORS, connection refused, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - unable to reach server. Please check your connection.');
      }
      throw error;
    }
  },

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string, userId?: string): Promise<any> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }
    const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks/${taskId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, title: string, description?: string, userId?: string): Promise<any> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }
    const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description }),
    });
    return handleResponse(response);
  },

  /**
   * Toggle task completion status
   */
  async toggleTaskComplete(taskId: string, userId?: string): Promise<any> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }
    const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId?: string): Promise<void> {
    const effectiveUserId = userId || getUserIdFromToken();
    if (!effectiveUserId) {
      throw new Error('User ID not found. Please login again.');
    }
    const response = await fetch(`${API_BASE_URL}/api/${effectiveUserId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    clearAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    // Don't throw error if logout fails - just clear local token
    if (!response.ok) {
      console.warn('Logout request failed, but local token was cleared');
    }
  },

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

/**
 * Extract user ID from JWT token
 * Returns the user_id from the JWT payload
 */
function getUserIdFromToken(): string | null {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (base64url)
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsedPayload = JSON.parse(decodedPayload);

    // The backend stores user_id in the "sub" field
    return parsedPayload.sub || null;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Helper function to check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Helper function to get current user ID from JWT
 */
export function getCurrentUserId(): string | null {
  return getUserIdFromToken();
}

/**
 * Helper function to clear authentication and redirect to login
 */
export function logout(): void {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
