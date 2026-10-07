# Integracion n8n / WhatsApp - API de citas

Todas las rutas exigen la cabecera `X-API-Key: <N8N_API_KEY>`. El agente de IA nunca accede a SQLite: solo usa estas rutas.

| Metodo | Ruta | Para que |
|---|---|---|
| GET | `/api/integrations/n8n/health` | Estado de la integracion |
| GET | `/api/integrations/n8n/catalog` | Servicios activos (precio, duracion), especialistas y horario |
| GET | `/api/integrations/n8n/availability?date=YYYY-MM-DD&serviceIds=a,b[&specialistId=]` | Huecos libres de un dia |
| POST | `/api/integrations/n8n/appointments` | Crear cita (JSON: clientName, clientPhone, serviceIds[], date, time, clientEmail?, notes?, specialistId?) |
| GET | `/api/integrations/n8n/appointments/by-phone/:phone[?status=]` | Citas de una clienta |
| GET | `/api/integrations/n8n/appointments/:id[?phone=]` | Una cita |
| POST | `/api/integrations/n8n/appointments/:id/confirm[?phone=]` | Confirmar |
| POST | `/api/integrations/n8n/appointments/:id/cancel[?phone=]` | Cancelar (envia email si hay) |
| POST | `/api/integrations/n8n/appointments/:id/complete[?phone=]` | Completar (solo citas ya pasadas; no factura ni VERI*FACTU) |

## Reglas aplicadas en el servidor
- Precio y duracion se calculan en el servidor desde los servicios; se ignora cualquier precio enviado.
- Disponibilidad segun `workingHours`, `blockedSlots` ("YYYY-MM-DD" o "YYYY-MM-DD HH:MM-HH:MM") y `vacations`, en hora de Madrid, con las citas existentes y las especialistas activas.
- Las reservas se serializan: dos peticiones a la vez no pueden coger el mismo hueco (409 `SLOT_UNAVAILABLE` con alternativas).
- Maximo de citas futuras activas por telefono (429 `TOO_MANY_ACTIVE_APPOINTMENTS`).
- Repetir la misma reserva devuelve la existente (`alreadyExists`).
- Si se envia `phone`, debe coincidir con el de la cita; si no, 404. n8n lo envia siempre, tomado del remitente de WhatsApp.
- No se puede completar una cita futura.
