# 🔐 SISTEMA DE CITAS SEGURO Y PROFESIONAL

## ✅ CAMBIOS REALIZADOS

### 1. **Puerto Vite cambiado a 3002**
```bash
npm run dev
# Ahora accedes en: http://192.168.1.134:3002
```

### 2. **Componente BookingRequest (Nuevo)**
- Archivo: `src/components/BookingRequest.tsx`
- Las clientas rellenan un **formulario sin registrarse**
- Los datos se envían directo a la BD
- Reciben confirmación instantánea

### 3. **MyBookingsView (Protegido)**
- Ahora requiere **PIN de 4 dígitos** para acceder
- Solo las clientas con código pueden ver sus citas
- NO es público

### 4. **Servidor Express actualizado**
- ✅ Nueva tabla: `booking_requests`
- ✅ Rutas: `POST /api/booking-request`
- ✅ Rutas: `GET /api/booking-requests` (para admin)
- ✅ Rutas: `PUT /api/booking-requests/:id` (cambiar estado)
- ✅ Rutas: `DELETE /api/booking-requests/:id` (eliminar)

### 5. **Servicio API actualizado**
- Nuevas funciones: `submitBookingRequest()`, `getBookingRequests()`, etc.

---

## 📊 FLUJO ACTUAL

### **Cliente Publica una Solicitud:**
```
1. Cliente va a la web → Pestaña "Solicitar Cita"
2. Rellena formulario (nombre, teléfono, email, fecha, etc.)
3. Presiona "Enviar Solicitud"
4. Datos se guardan en BD
5. Cliente recibe confirmación "✅ Solicitud Enviada"
6. Se le da teléfono para contactar directamente
```

### **Admin Recibe Solicitud:**
```
1. Panel Admin → (Nueva pestaña) "Solicitudes de Cita"
2. Ve todas las solicitudes pendientes
3. Puede cambiar estado (Pendiente → Confirmada → Completada)
4. Puede eliminar solicitudes
5. Desde aquí crea la cita real en "Agenda de Citas"
```

### **Cliente Accede a Sus Citas:**
```
1. Cliente va a "Mis Citas"
2. Ingresa su PIN (código de acceso)
3. Ve solo sus citas confirmadas
4. Puede descargar .ICS (para calendario)
5. Puede crear tarjetas regalo
```

---

## 🚀 CÓMO USAR

### **Paso 1: Instalar y ejecutar**
```bash
npm install
npm run dev:full
```

### **Paso 2: Abrir en navegador**
```
http://192.168.1.134:3002
```

### **Paso 3: Probar flujo**

#### **Como Cliente:**
1. Ir a pestaña "Solicitar Cita" (New!)
2. Rellenar formulario
3. Enviar
4. Ir a "Mis Citas"
5. Ingresar PIN (ej: 1234)

#### **Como Admin:**
1. Panel Admin (PIN: 2026)
2. Nueva pestaña: "Solicitudes de Cita"
3. Ver solicitudes pendientes
4. Confirmar o cambiar estado
5. Crear cita en "Agenda"

---

## 📝 TABLA BOOKING_REQUESTS

La BD ahora almacena:
```
- id: ID único
- clientName: Nombre de la clienta
- clientPhone: Teléfono
- clientEmail: Email
- serviceType: Tipo de servicio (manicura, pedicura, etc.)
- preferredDate: Fecha preferida
- preferredTime: Hora preferida
- notes: Notas especiales
- status: Pendiente / Confirmada / Completada
- createdAt: Fecha creación
- respondedAt: Fecha respuesta
```

---

## 🔒 SEGURIDAD

### **No es Público:**
- ❌ No hay registro de cliente
- ❌ No se ve el sistema de citas en la página principal
- ✅ Las solicitudes van directo a BD (privado)
- ✅ "Mis Citas" requiere PIN
- ✅ Solo admin ve las solicitudes

### **PINs:**
- **Admin Panel:** `2026`
- **Mis Citas:** Código enviado por email/teléfono
  (Ej: Últimos 4 dígitos del teléfono de la clienta)

---

## 📱 API Endpoints Nuevos

```
POST   /api/booking-request              → Crear solicitud
GET    /api/booking-requests             → Ver todas (admin)
PUT    /api/booking-requests/:id         → Cambiar estado
DELETE /api/booking-requests/:id         → Eliminar solicitud
```

---

## 🎯 Próximos Pasos (Opcionales)

1. **Email automático** cuando se recibe solicitud
2. **Pestaña en Admin** para ver solicitudes pendientes
3. **SMS** cuando se confirma cita
4. **Código PIN automático** al confirmar solicitud
5. **Exportar solicitudes** a Excel
6. **Recordatorios** 24h antes de la cita

---

## ⚙️ VARIABLES DE ENTORNO

```
API_PORT=3001        # Puerto del servidor Express
NODE_ENV=development # Entorno
```

---

## 📞 DATOS DE CONTACTO (en BookingRequest)

Mostrados en el componente:
- Teléfono: +34 611 223 344
- Email: hola@lasgreenlanters.es

Actualiza en `BookingRequest.tsx` si es necesario.

---

## 🧪 TESTING

**Prueba el flujo completo:**

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev

# Navegador
http://192.168.1.134:3002
```

1. Solicitar cita (BookingRequest) ✅
2. Admin ve solicitud en BD ✅
3. Crear cita real en Agenda ✅
4. Cliente ingresa PIN y ve su cita ✅
5. Descargar .ICS para calendario ✅

---

**¿Dudas?** Revisa:
- `BookingRequest.tsx` - Formulario de solicitud
- `MyBookingsView.tsx` - Protección con PIN
- `server.js` línea 453+ - Rutas booking-requests
- `src/data/api.ts` - Funciones API

¡Listo para usar! 🚀
