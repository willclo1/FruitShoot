const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const authProvider = {
  login: async ({ password }) => {
    const res = await fetch(`${API_BASE}/admin-auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      let message = "Invalid admin password";
      try {
        const body = await res.json();
        message = body.detail || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return Promise.resolve();
  },

  logout: async () => {
    await fetch(`${API_BASE}/admin-auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    return Promise.resolve();
  },

  checkAuth: async () => {
    const res = await fetch(`${API_BASE}/admin-auth/check`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      return Promise.reject();
    }

    return Promise.resolve();
  },

  checkError: async (error) => {
    const status = error?.status || error?.response?.status;
    if (status === 401 || status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getPermissions: async () => Promise.resolve(),
};