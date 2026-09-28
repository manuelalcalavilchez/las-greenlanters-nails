# 🚀 INSTRUCCIONES PARA ACTIVAR LA BASE DE DATOS

## 📋 Resumen de lo que se ha hecho

✅ **Servidor Express con SQLite** creado en `server.js`  
✅ **Servicio API** creado en `src/data/api.ts`  
✅ **Dependencias** agregadas (sqlite3, cors, concurrently)  
✅ **Base de datos** lista para usarse  
✅ **Panel Admin** actualizado con muchas más funciones  

---

## ⚠️ ANTES DE COMENZAR

Asegúrate que tienes instaladas las siguientes dependencias:

```bash
npm install
```

Esto instala:
- `sqlite3` - Base de datos
- `cors` - Para comunicación API
- `concurrently` - Para ejecutar dos procesos a la vez
- `body-parser` - Para parsear JSON en Express

---

## 🎯 OPCIÓN 1: Ejecutar TODO de una vez (RECOMENDADO)

Abre una terminal en `I:\las-greenlanters-nails` y ejecuta:

```bash
npm run dev:full
```

Esto inicia:
- ✅ Servidor Express en **http://localhost:3001**
- ✅ Frontend Vite en **http://localhost:3000**

**Espera 10 segundos a que ambos se levanten**, luego accede a:
```
http://192.168.1.134:3000
```

---

## 🎯 OPCIÓN 2: Ejecutar por separado (Si la opción 1 falla)

**Terminal 1 - Servidor Express:**
```bash
npm run server
```

Verás:
```
✅ SQLite conectado: I:\las-greenlanters-nails\data\greenlanters.db
✅ Tablas de base de datos creadas
🚀 Servidor Express en puerto 3001
📍 API Base: http://localhost:3001/api
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## 📊 Verificar que todo funciona

1. **Panel Admin:**
   - URL: `http://192.168.1.134:3000`
   - Pestaña: **Panel de Administración**
   - PIN: `2026`

2. **Base de datos creada:**
   - Ubicación: `I:\las-greenlanters-nails\data\greenlanters.db`
   - Si no existe, se crea automáticamente

3. **API funcionando:**
   - URL: `http://localhost:3001/api/health`
   - Deberías ver: `{"status":"OK","timestamp":"2024-..."}`

---

## 🎨 Panel Admin - Nuevas Pestañas

1. **⚙️ Configuración** - Datos del salón (nombre, teléfono, colores)
2. **📄 Contenidos** - Para textos (próximamente)
3. **🖼️ Galería** - Subir fotos del salón
4. **💅 Servicios** - CRUD de servicios (crear, editar, eliminar)
5. **👩‍💼 Especialistas** - CRUD de especialistas
6. **📅 Citas** - Agenda (antes: solo cancelar, ahora: **ELIMINAR**)
7. **🎨 Diseños** - Gestionar diseños del atelier

**TODO SE GUARDA EN LA BASE DE DATOS - NO EN NAVEGADOR**

---

## 💾 Datos de Prueba

La BD comienza **VACÍA**. Necesitas:
1. Crear servicios en el Admin
2. Crear especialistas en el Admin
3. Las citas se crearán desde el sistema de reservas

**O** Importar los datos de prueba que había antes:

```javascript
// En consola del navegador (F12):
const appointments = JSON.parse(localStorage.getItem('greenlanters_appointments') || '[]');
appointments.forEach(async (appt) => {
  await fetch('http://localhost:3001/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appt)
  });
});
alert('Migración completada');
```

---

## 🔴 PROBLEMAS COMUNES

### ❌ "Cannot find module 'sqlite3'"
```bash
npm install sqlite3
```

### ❌ "EADDRINUSE: address already in use :::3001"
**El puerto 3001 está ocupado.** Soluciones:

**Opción A:** Encontrar qué proceso usa el puerto
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Opción B:** Cambiar puerto en `.env`
```
API_PORT=3002
```

### ❌ "API no responde"
- ¿El servidor está corriendo? (Verifica la primera terminal)
- ¿Ves el mensaje "🚀 Servidor Express"?
- Si no, presiona Ctrl+C y ejecuta `npm run server` de nuevo

### ❌ "No veo los datos guardados"
- ¿Estás usando la API? (Backend) No localStorage
- Revisa consola del navegador (F12) para errores
- ¿El servidor responde a http://localhost:3001/api/health?

---

## 🎓 Flujo de Datos Ahora

```
┌──────────────────────────────────────────┐
│     Frontend React (Port 3000)           │
│  - AdminPanel.tsx (Panel Admin)          │
│  - BookingWizard.tsx (Reservas)          │
│  - NailStudioEditor.tsx (Diseños)        │
└──────────┬──────────────────────────────┘
           │ Llamadas API (fetch)
           ▼
┌──────────────────────────────────────────┐
│   Backend Express API (Port 3001)        │
│  - GET /api/appointments                 │
│  - POST /api/appointments                │
│  - DELETE /api/appointments/:id ← NUEVO  │
│  - PUT /api/config                       │
│  - etc...                                │
└──────────┬──────────────────────────────┘
           │ Consultas SQL
           ▼
┌──────────────────────────────────────────┐
│   SQLite Database                        │
│   data/greenlanters.db                   │
│  - Tabla: appointments                   │
│  - Tabla: custom_designs                 │
│  - Tabla: services                       │
│  - Tabla: specialists                    │
│  - Tabla: salon_config                   │
│  - Tabla: gallery                        │
└──────────────────────────────────────────┘
```

---

## 📞 ¿Qué necesitas hacer ahora?

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Ejecutar todo
```bash
npm run dev:full
```

### Paso 3: Abrir en navegador
```
http://192.168.1.134:3000
```

### Paso 4: Ir a Panel Admin
- Haz clic en el icono de engranaje
- PIN: `2026`
- Empieza a crear servicios y especialistas

---

## ✅ Verificación Final

Deberías ver:

1. **Terminal 1 (Servidor):**
   ```
   ✅ SQLite conectado
   ✅ Tablas de base de datos creadas
   🚀 Servidor Express en puerto 3001
   ```

2. **Terminal 2 (Frontend):**
   ```
   ✅ Local: http://localhost:3000
   ```

3. **Navegador:**
   - Página carga sin errores
   - Puedes acceder al Admin Panel
   - Las citas se guardan en BD (no en navegador)

---

**¿Listo para empezar?** 🚀

Si tienes problemas, revisa:
- `server.js` - Código del servidor
- `src/data/api.ts` - Servicio API
- `SETUP_DATABASE.md` - Documentación completa
- Consola del navegador (F12) para errores
- Terminal del servidor para logs

**¡Que disfrutes la nueva base de datos!** 💾✨
