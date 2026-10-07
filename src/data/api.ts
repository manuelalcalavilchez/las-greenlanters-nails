// Servicio API para comunicarse con el servidor Express
const API_BASE = '/api';

// ==================== SESIÓN STAFF ====================
// El token lo emite el servidor tras validar el PIN (POST /api/staff/login).
const STAFF_TOKEN_KEY = 'greenlanters_staff_token';
export const STAFF_UNAUTHORIZED_EVENT = 'greenlanters:staff-unauthorized';

export const staffSession = {
  getToken: () => sessionStorage.getItem(STAFF_TOKEN_KEY) || '',
  setToken: (token: string) => sessionStorage.setItem(STAFF_TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(STAFF_TOKEN_KEY)
};

// fetch con el token Staff adjunto (si existe). Un 401 con sesión activa la invalida.
const apiFetch = async (url: string, init: RequestInit = {}) => {
  const token = staffSession.getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && token) {
    staffSession.clear();
    window.dispatchEvent(new Event(STAFF_UNAUTHORIZED_EVENT));
  }
  return res;
};

export interface SiteContentResponse {
  content: Record<string, string>;
  defaults: Record<string, string>;
  updatedAt: string | null;
}

export const apiService = {
  // STAFF
  async staffLogin(pin: string): Promise<{ success?: boolean; token?: string; error?: string; retryAfter?: number; remaining?: number }> {
    try {
      const res = await fetch(`${API_BASE}/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token) {
        staffSession.setToken(data.token);
        return { success: true };
      }
      return { error: data?.error || 'No se pudo iniciar sesión', retryAfter: data?.retryAfter, remaining: data?.remaining };
    } catch (err) {
      console.error('Error en login Staff:', err);
      return { error: 'No se pudo contactar con el servidor' };
    }
  },

  async staffCheckSession(): Promise<boolean> {
    if (!staffSession.getToken()) return false;
    try {
      const res = await apiFetch(`${API_BASE}/staff/session`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async staffLogout() {
    try {
      if (staffSession.getToken()) await apiFetch(`${API_BASE}/staff/logout`, { method: 'POST' });
    } catch { /* la sesión local se elimina igualmente */ }
    staffSession.clear();
  },

  // CONTENIDOS
  async getContent(): Promise<SiteContentResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/content`);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error('Error fetching content:', err);
      return null;
    }
  },

  async updateContent(content: Record<string, string>): Promise<(SiteContentResponse & { success?: boolean; error?: string }) | { error: string }> {
    try {
      const res = await apiFetch(`${API_BASE}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return res.json();
    } catch (err) {
      console.error('Error updating content:', err);
      return { error: 'No se pudo contactar con el servidor' };
    }
  },

  // CITAS
  async getAppointments() {
    try {
      const res = await apiFetch(`${API_BASE}/appointments`);
      return res.json();
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
    }
  },

  async createAppointment(appointment: any) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating appointment:', err);
      return { error: err };
    }
  },

  async updateAppointment(id: string, data: any) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating appointment:', err);
      return { error: err };
    }
  },

  async deleteAppointment(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      return { error: err };
    }
  },

  // DISEÑOS
  async getDesigns() {
    try {
      const res = await apiFetch(`${API_BASE}/designs`);
      return res.json();
    } catch (err) {
      console.error('Error fetching designs:', err);
      return [];
    }
  },

  async createDesign(design: any) {
    try {
      const res = await apiFetch(`${API_BASE}/designs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating design:', err);
      return { error: err };
    }
  },

  async updateDesign(id: string, data: any) {
    try {
      const res = await apiFetch(`${API_BASE}/designs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating design:', err);
      return { error: err };
    }
  },

  async deleteDesign(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/designs/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting design:', err);
      return { error: err };
    }
  },

  // CONFIGURACIÓN
  async getConfig() {
    try {
      const res = await apiFetch(`${API_BASE}/config`);
      return res.json();
    } catch (err) {
      console.error('Error fetching config:', err);
      return {};
    }
  },

  async updateConfig(config: any) {
    try {
      const res = await apiFetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating config:', err);
      return { error: err };
    }
  },

  // SERVICIOS
  async getServices() {
    try {
      const res = await apiFetch(`${API_BASE}/services`);
      return res.json();
    } catch (err) {
      console.error('Error fetching services:', err);
      return [];
    }
  },

  async createService(service: any) {
    try {
      const res = await apiFetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating service:', err);
      return { error: err };
    }
  },

  async updateService(id: string, service: any) {
    try {
      const res = await apiFetch(`${API_BASE}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating service:', err);
      return { error: err };
    }
  },

  async deleteService(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting service:', err);
      return { error: err };
    }
  },

  // ESPECIALISTAS
  async getSpecialists() {
    try {
      const res = await apiFetch(`${API_BASE}/specialists`);
      return res.json();
    } catch (err) {
      console.error('Error fetching specialists:', err);
      return [];
    }
  },

  async createSpecialist(specialist: any) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialist)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating specialist:', err);
      return { error: err };
    }
  },

  async updateSpecialist(id: string, specialist: any) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialist)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating specialist:', err);
      return { error: err };
    }
  },

  async deleteSpecialist(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting specialist:', err);
      return { error: err };
    }
  },

  // GALERÍA
  async getGallery() {
    try {
      const res = await apiFetch(`${API_BASE}/gallery`);
      return res.json();
    } catch (err) {
      console.error('Error fetching gallery:', err);
      return [];
    }
  },

  async uploadPhoto(photo: any) {
    try {
      const res = await apiFetch(`${API_BASE}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photo)
      });
      return res.json();
    } catch (err) {
      console.error('Error uploading photo:', err);
      return { error: err };
    }
  },

  async deletePhoto(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/gallery/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting photo:', err);
      return { error: err };
    }
  },

  // SOLICITUDES DE CITA
  async submitBookingRequest(request: any) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      return res.json();
    } catch (err) {
      console.error('Error submitting booking request:', err);
      return { error: err };
    }
  },

  async getBookingRequests() {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests`);
      return res.json();
    } catch (err) {
      console.error('Error fetching booking requests:', err);
      return [];
    }
  },

  async updateBookingRequest(id: string, status: string) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return res.json();
    } catch (err) {
      console.error('Error updating booking request:', err);
      return { error: err };
    }
  },

  async deleteBookingRequest(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting booking request:', err);
      return { error: err };
    }
  },

  // SALUD
  async checkHealth() {
    try {
      const res = await apiFetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
};
