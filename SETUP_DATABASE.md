# 🗄️ SETUP: Base de Datos SQLite con Express API

## ¿Qué se ha hecho?

Se ha migrado de **localStorage** (datos perdidos si limpias navegador) a una **base de datos SQLite real** con API Express.

### ✅ Archivos Creados:

1. **`server.js`** - Servidor Express con todas las rutas API
2. **`src/data/api.ts`** - Servicio para llamar a la API desde React
3. **`.env`** - Configuración del puerto y base de datos
4. **`data/greenlanters.db`** - Base de datos SQLite (se crea automáticamente)

### ✅ Dependencias Agregadas:

- `sqlite3` - Base de datos
- `cors` - Para CORS (comunicación frontend-backend)
- `body-parser` - Para parsear JSON

---

## 🚀 PASOS PARA ACTIVAR LA BASE DE DATOS

### 1️⃣ Instalar dependencias nuevas

```bash
npm install
```

O si usas bun:
```bash
bun install
```

### 2️⃣ Inicia el servidor en una terminal

**Opción A: Con Node.js directo**
```bash
node server.js
```

**Opción B: Con tsx (TypeScript)**
```bash
npx tsx server.js
```

**Opción C: Script automático en package.json** (próxima mejora)

### 3️⃣ En otra terminal, inicia Vite

```bash
npm run dev
```

Ahora tienes:
- ✅ Frontend en **http://localhost:3000**
- ✅ API Backend en **http://localhost:3001/api**
- ✅ Base de datos en **`./data/greenlanters.db`**

---

## 📊 API Endpoints Disponibles

### CITAS
- `GET /api/appointments` - Obtener todas las citas
- `POST /api/appointments` - Crear cita
- `PUT /api/appointments/:id` - Actualizar cita
- `DELETE /api/appointments/:id` - **Eliminar cita permanentemente**

### DISEÑOS
- `GET /api/designs` - Obtener diseños
- `POST /api/designs` - Crear diseño
- `PUT /api/designs/:id` - Actualizar diseño
- `DELETE /api/designs/:id` - **Eliminar diseño**

### CONFIGURACIÓN
- `GET /api/config` - Obtener datos del salón
- `PUT /api/config` - Actualizar datos del salón

### SERVICIOS
- `GET /api/services` - Obtener servicios
- `POST /api/services` - Crear servicio
- `PUT /api/services/:id` - Actualizar servicio
- `DELETE /api/services/:id` - Eliminar servicio (desactiva)

### ESPECIALISTAS
- `GET /api/specialists` - Obtener especialistas
- `POST /api/specialists` - Crear especialista
- `PUT /api/specialists/:id` - Actualizar especialista
- `DELETE /api/specialists/:id` - Eliminar especialista

### GALERÍA
- `GET /api/gallery` - Obtener fotos
- `POST /api/gallery` - Subir foto
- `DELETE /api/gallery/:id` - Eliminar foto

### SALUD
- `GET /api/health` - Verificar que el servidor está activo

---

## 🔄 Migración de Datos (Si necesitas)

Los datos actuales en localStorage no se migran automáticamente.

Si tienes citas guardadas en localStorage que quieres transferir:

1. Abre el navegador en http://localhost:3000
2. Abre la consola (F12)
3. Ejecuta:
```javascript
// Copiar citas de localStorage a API
const appointments = JSON.parse(localStorage.getItem('greenlanters_appointments') || '[]');
appointments.forEach(async (appt) => {
  await fetch('http://localhost:3001/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appt)
  });
});
console.log('✅ Citas migradas');
```

---

## 💾 Backups de Base de Datos

La base de datos se guarda en:
```
I:\las-greenlanters-nails\data\greenlanters.db
```

Para hacer backup:
1. Cierra el servidor (Ctrl+C)
2. Copia el archivo `data/greenlanters.db` a una ubicación segura
3. Vuelve a iniciar el servidor

---

## 🛠️ Solucionar Problemas

### ❌ "Cannot find module 'sqlite3'"
```bash
npm install sqlite3
```

### ❌ "EADDRINUSE: address already in use :::3001"
El puerto 3001 está ocupado. Cambia en `.env`:
```
API_PORT=3002
```

### ❌ "API respondiendo pero sin datos"
Los datos antiguos están en localStorage. La BD está vacía.
El panel admin permite crear nuevos datos.

### ❌ "Cannot POST /api/appointments"
Asegúrate que el servidor Express está corriendo en otra terminal.

---

## 📝 Próximos Pasos

1. **Actualizar AdminPanel.tsx** para usar la API (en lugar de localStorage)
2. **Actualizar App.tsx** para sincronizar con la API
3. **Scripts automáticos** para iniciar servidor + Vite juntos
4. **Dashboard** para ver estadísticas en tiempo real
5. **Backups automáticos** de la base de datos

---

## 🎯 Resumen

| Antes (localStorage) | Ahora (SQLite + API) |
|---|---|
| ❌ Datos perdidos al limpiar caché | ✅ Datos permanentes |
| ❌ Solo en un navegador | ✅ Accesible desde cualquier dispositivo en la LAN |
| ❌ Sin sincronización | ✅ API centralizada |
| ❌ No se pueden eliminar citas | ✅ DELETE completo en BD |
| ❌ Sin respaldo | ✅ Base de datos en archivo |

---

**¿Preguntas?** Revisa `server.js` para ver todas las rutas API disponibles.
