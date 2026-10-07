const getStaffToken = () => sessionStorage.getItem('greenlanters_staff_token') || '';

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getStaffToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return globalThis['fetch'](input, { ...init, headers });
};

// Servicio API para comunicarse con el servidor Express
const API_BASE = '/api';

export const apiService = {
  async loginStaff(pin: string) {
    try {
      const res = await globalThis['fetch'](`${API_BASE}/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data?.token) {
        sessionStorage.setItem('greenlanters_staff_token', data.token);
        return { success: true, ...data };
      }
      return { success: false, error: data?.error || 'No se pudo iniciar sesión' };
    } catch (err) {
      return { success: false, error: 'No se pudo conectar con el servidor' };
    }
  },

  logoutStaff() {
    sessionStorage.removeItem('greenlanters_staff_token');
    sessionStorage.removeItem('greenlanters_staff_auth');
  },

  hasStaffSession() {
    return Boolean(sessionStorage.getItem('greenlanters_staff_token'));
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

  // FACTURACIÓN
  async getInvoices() { try { const res = await apiFetch(API_BASE + '/invoices'); return res.json(); } catch (err) { return []; } },
  async createInvoiceDraftFromAppointment(appointmentId: string) { try { const res = await apiFetch(API_BASE + '/invoices/draft-from-appointment/' + appointmentId, { method: 'POST' }); return res.json(); } catch (err) { return { error: err }; } },
  async updateInvoice(id: string, data: any) { try { const res = await apiFetch(API_BASE + '/invoices/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return res.json(); } catch (err) { return { error: err }; } },
  async issueInvoice(id: string) { try { const res = await apiFetch(API_BASE + '/invoices/' + id + '/issue', { method: 'POST' }); return res.json(); } catch (err) { return { error: err }; } },
  async cancelInvoice(id: string) { try { const res = await apiFetch(API_BASE + '/invoices/' + id + '/cancel', { method: 'POST' }); return res.json(); } catch (err) { return { error: err }; } },

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
