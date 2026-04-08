const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const json = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: "include", // ✅ THIS IS THE FIX
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
};
const dataProvider = {
  async getList(resource, params) {
    if (resource === "users") {
      const result = await json(`${API_BASE}/admin/users`);
      const users = Array.isArray(result.users) ? result.users : [];
      return {
        data: users,
        total: users.length,
      };
    }

    if (resource === "userImages") {
      const userId = params?.filter?.user_id;
      if (!userId) {
        return { data: [], total: 0 };
      }

      const images = await json(`${API_BASE}/admin/user/${userId}/images`);
      return {
        data: Array.isArray(images) ? images : [],
        total: Array.isArray(images) ? images.length : 0,
      };
    }

    if (resource === "userRecipes") {
      const userId = params?.filter?.user_id;
      if (!userId) {
        return { data: [], total: 0 };
      }

      const recipes = await json(`${API_BASE}/admin/user/${userId}/recipes`);
      return {
        data: Array.isArray(recipes) ? recipes : [],
        total: Array.isArray(recipes) ? recipes.length : 0,
      };
    }

    throw new Error(`getList not implemented for resource: ${resource}`);
  },

  async getOne(resource, params) {
    if (resource === "users") {
      const result = await json(`${API_BASE}/admin/users`);
      const users = Array.isArray(result.users) ? result.users : [];
      const user = users.find((u) => String(u.id) === String(params.id));
      if (!user) throw new Error("User not found");
      return { data: user };
    }

    throw new Error(`getOne not implemented for resource: ${resource}`);
  },

  async delete(resource, params) {
    if (resource === "users") {
      await json(`${API_BASE}/admin/delete/${params.id}`, {
        method: "DELETE",
      });
      return { data: { id: params.id } };
    }

    if (resource === "userImages") {
      await json(`${API_BASE}/admin/delete/image/${params.id}`, {
        method: "DELETE",
      });
      return { data: { id: params.id } };
    }

    if (resource === "userRecipes") {
      await json(`${API_BASE}/admin/delete/recipe/${params.id}`, {
        method: "DELETE",
      });
      return { data: { id: params.id } };
    }

    throw new Error(`delete not implemented for resource: ${resource}`);
  },

  async getMany() {
    return { data: [] };
  },

  async getManyReference() {
    return { data: [], total: 0 };
  },

  async update() {
    throw new Error("update not implemented");
  },

  async updateMany() {
    throw new Error("updateMany not implemented");
  },

  async create() {
    throw new Error("create not implemented");
  },

  async deleteMany() {
    throw new Error("deleteMany not implemented");
  },
};

export default dataProvider;