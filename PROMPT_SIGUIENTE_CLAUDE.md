🎯 PROMPT PARA SIGUIENTE CLAUDE - Las Greenlanters Nails

📌 ACTUALIZADO: 26 septiembre 2026 (sesión con Desktop Commander)

Este documento sustituye a la versión anterior. Los puntos 1, 2 y 3 de la
prioridad original YA ESTÁN HECHOS. Empieza leyendo "✅ HECHO EN ESTA SESIÓN"
y luego ve directo a "⚠️ SIGUIENTE PASO: CÁMARA AR".

🆕 NUEVO PROYECTO HERMANO: I:\instagram-autopilot\
Se ha añadido un endpoint GET /api/public/content-feed (+ GET
/api/gallery/:id/image) a este proyecto para conectarlo con un servicio
central nuevo que genera publicaciones de Instagram (caption + hashtags
con IA) automáticamente. Todo el detalle está en
I:\instagram-autopilot\PROMPT_SIGUIENTE_CLAUDE.md — léelo si el usuario
pregunta por Instagram, redes sociales, o marketing automático. Este
proyecto (las-greenlanters-nails) ya está registrado ahí como tenant
(id 21148b85-e406-4617-9b83-d0fc3a3c348e). Variable nueva en .env de
este proyecto: CONTENT_FEED_API_KEY.

📌 CONTEXTO DEL PROYECTO

Proyecto: Las Greenlanters Nails - Sistema web para salón de uñas boutique
Ubicación: I:\las-greenlanters-nails\
Tech Stack: React 19 + TypeScript + Vite + Express.js + SQLite3
Base de datos: SQLite en data/greenlanters.db
API: Express en puerto 3001
Frontend: Vite en puerto 3002 (o 3000, revisar vite.config.ts)
Acceso remoto: http://192.168.1.134:3002

IMPORTANTE: Este Claude trabajó con la herramienta "Desktop Commander" (MCP),
que da acceso directo al sistema de archivos y terminal de Windows del
usuario. Si tienes esa herramienta disponible, úsala (list_directory,
read_file, edit_block, write_file, start_process). Si no la tienes, pide al
usuario que la habilite o que suba los archivos manualmente.


✅ HECHO EN ESTA SESIÓN

1. API conectada al frontend (CRÍTICO - ya no usa localStorage para esto)
   - src/App.tsx: `appointments` y `customDesigns` se cargan con
     apiService.getAppointments() / getDesigns() al montar, y se guardan
     con apiService.createAppointment() / createDesign().
   - `catalogStyles` y `giftCards` SIGUEN en localStorage (no hay tabla en
     server.js para ellos todavía; no era prioridad alta).

2. Pestaña "Solicitudes" en AdminPanel.tsx
   - Tabla con clientName/Phone/Email, serviceType, fecha/hora preferida,
     notas, estado.
   - Botón "Confirmar" → crea una cita (genera PIN/localizador tipo
     LGN-XXXX) vía apiService.createAppointment() y marca la solicitud
     como Confirmada. La cita se crea con serviceIds=[] y precio 0: el
     admin debe editarla luego en la pestaña "Citas" (servicios,
     especialista, precio reales).
   - Botones "Completar" y "Eliminar" llaman a la API.
   - updateAppointmentStatus/updateDesignStatus ahora persisten en BD
     (antes solo tocaban el estado de React).

3. Emails con nodemailer (YA FUNCIONA, falta solo configurar credenciales)
   - Paquete `nodemailer` instalado (ver package.json).
   - server.js ahora carga `dotenv/config` al inicio (antes NO cargaba
     el .env, ¡ojo con esto si algo no coge una variable de entorno!).
   - Carpeta templates/ con 3 plantillas HTML (booking-confirmation.html,
     booking-confirmed.html, booking-cancelled.html), con placeholders
     tipo {{clientName}} sustituidos por server.js (función
     renderTemplate).
   - Disparadores ya conectados:
     - POST /api/booking-request → envía booking-confirmation.html
     - POST /api/appointments → envía booking-confirmed.html (con PIN)
     - PUT /api/appointments/:id con status='Cancelada' → envía
       booking-cancelled.html
   - Si SMTP_USER/SMTP_PASS están vacíos en .env, NO falla: los emails
     se imprimen por consola con el prefijo "📧 [DEV - sin SMTP]". Esto
     ya se probó y funciona.
   - PENDIENTE DEL USUARIO: rellenar SMTP_USER y SMTP_PASS en el archivo
     .env (no en .env.example) con credenciales reales. Con Gmail hace
     falta una "contraseña de aplicación":
     https://myaccount.google.com/apppasswords
   - Verificado con `npx tsc --noEmit` (0 errores) y arrancando el
     servidor real + una petición de prueba a /api/booking-request.

🔧 DOS COSAS QUE ARREGLÉ DE PASO (no estaban en la lista pero rompían todo)

- La carpeta `data/` no existía en este checkout → sqlite3 no la crea
  sola y el server.js petaba con SQLITE_CANTOPEN. La creé manualmente.
  Si vuelves a ver ese error, es por esto: crea la carpeta data/ a mano
  o añade `fs.mkdirSync` antes de abrir la BD.
- `npm install` en este proyecto da un ERESOLVE por conflicto de peer
  deps entre vite@8 y esbuild (algo del template original, no de este
  trabajo). Usa siempre `npm install <paquete> --legacy-peer-deps`.


⚠️ SIGUIENTE PASO (según prioridad original): CÁMARA AR EN VIVO

Archivo: src/components/LiveARCameraCanvas.tsx
Estado: NO REVISADO en esta sesión. Sigue pendiente tal cual estaba.

Qué hacer:
1. Leer src/components/LiveARCameraCanvas.tsx y comprobar:
   - ¿Usa la webcam? (getUserMedia)
   - ¿El canvas renderiza algo?
   - ¿Detecta puntos de referencia de la mano?
2. Si no funciona bien, implementar con MediaPipe:
   npm install @mediapipe/tasks-vision --legacy-peer-deps
   (recuerda el flag --legacy-peer-deps, ver arriba)
3. Flujo ideal: permitir cámara → MediaPipe detecta manos → selector de
   diseños → overlay del diseño sobre las uñas → botón "Capturar" →
   guardar como custom_design (ya usa apiService.createDesign(), ver
   handleSaveDesign en App.tsx, que YA está conectado a la API).
4. Referencia de cómo se dibujan uñas: src/components/NailStudioEditor.tsx
5. Probar en Chrome/Edge en http://localhost:3002 (localhost, no la IP
   192.168.1.134, porque getUserMedia necesita HTTPS o localhost).

DESPUÉS DE LA CÁMARA AR (prioridad media, ver detalle en el historial de
git o pregunta al usuario si quiere recuperar el prompt original):

- Migrar a la API lo que sigue en localStorage dentro de AdminPanel.tsx:
  salonConfig, galleryPhotos, services, specialists (la API en
  src/data/api.ts YA tiene getConfig/updateConfig, getServices/
  createService/updateService/deleteService, getSpecialists/... y
  getGallery/uploadPhoto/deletePhoto listas para usar — solo falta
  cablear los componentes, igual que se hizo con appointments/designs).
- Actualizar Navbar.tsx, HomeView.tsx, Footer.tsx para leer de
  salonConfig/galería/especialistas reales en vez de datos fijos.
- Pestaña "Contenidos" del AdminPanel (dice "próximamente").
- Dashboard de estadísticas, notificaciones recordatorio 24h, WhatsApp,
  búsqueda avanzada/exportar CSV, galería con drag&drop.

📁 ARCHIVOS CLAVE TOCADOS EN ESTA SESIÓN

- src/App.tsx
- src/components/AdminPanel.tsx
- server.js
- .env (variables SMTP añadidas, valores vacíos — el usuario debe rellenarlas)
- .env.example (mismas variables, con placeholders)
- templates/booking-confirmation.html (nuevo)
- templates/booking-confirmed.html (nuevo)
- templates/booking-cancelled.html (nuevo)
- package.json (nodemailer añadido)
- data/ (carpeta creada, antes no existía)

🧪 CÓMO PROBAR RÁPIDO

# Terminal 1
cd I:\las-greenlanters-nails
npm run server

# Terminal 2
cd I:\las-greenlanters-nails
npm run dev

# Prueba manual de un endpoint (PowerShell):
Invoke-RestMethod -Uri "http://localhost:3001/api/booking-request" `
  -Method Post -ContentType "application/json" `
  -Body '{"clientName":"Test","clientPhone":"+34600000000","clientEmail":"test@test.com","serviceType":"manicura","preferredDate":"2026-10-01","preferredTime":"11:00","notes":"","createdAt":"2026-09-25T21:00:00.000Z"}'

Deberías ver en la consola del servidor una línea "📧 [DEV - sin SMTP]"
confirmando que el email se generó correctamente (aunque no se envíe de
verdad sin credenciales SMTP).

💬 NOTA PARA EL SIGUIENTE CLAUDE

El usuario pidió explícitamente que se documente el estado antes de que
se agote la cuota/sesión. Si tú también te estás quedando sin cuota,
actualiza este mismo archivo (no crees uno nuevo) con lo que hayas
avanzado, siguiendo el mismo formato de esta sección.
