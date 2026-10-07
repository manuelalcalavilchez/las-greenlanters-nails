import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 3003);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// SQLite Database
const dbPath = path.join(__dirname, 'data', 'greenlanters.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else console.log(`S& SQLite conectado: ${dbPath}`);
});

// ==================== EMAIL (nodemailer) ====================
const TEMPLATES_DIR = path.join(__dirname, 'templates');

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('S& SMTP configurado:', process.env.SMTP_HOST || 'smtp.gmail.com');
} else {
  console.warn('a?  SMTP no configurado en .env (SMTP_USER/SMTP_PASS). Los emails solo se mostrarn en consola.');
}

// Sustituye {{variable}} en la plantilla HTML por su valor
const renderTemplate = (templateName, vars = {}) => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value === undefined || value === null ? '' : String(value));
  }
  return html;
};

// Enva un email; nunca lanza (se registra el error y se sigue)
const sendEmail = async ({ to, subject, templateName, vars }) => {
  if (!to) return { success: false, error: 'Sin destinatario' };
  try {
    const html = renderTemplate(templateName, vars);
    if (!transporter) {
      console.log(`x [DEV - sin SMTP] Para: ${to} | Asunto: ${subject}`);
      return { success: true, dev: true };
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Las Greenlanters Nails" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`S& Email enviado a ${to}: ${subject}`);
    return { success: true };
  } catch (err) {
    console.error(`R Error enviando email a ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// Promisify db methods
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows || []);
  });
});

const ensureColumn = async (table, column, definition) => {
  const columns = await dbAll(`PRAGMA table_info(${table})`);
  if (!columns.some(c => c.name === column)) {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

// ==================== SEGURIDAD STAFF ====================
// Autenticacion de la Cabina Staff validada en servidor. El PIN nunca viaja al bundle del frontend.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

const STAFF_PIN = process.env.STAFF_PIN || '';
const STAFF_SESSION_SECRET = process.env.STAFF_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const STAFF_SESSION_MS = (Number(process.env.STAFF_SESSION_HOURS) || 12) * 60 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

if (!STAFF_PIN) console.warn('[staff] STAFF_PIN no configurado: el acceso Staff queda deshabilitado.');
if (!process.env.STAFF_SESSION_SECRET) console.warn('[staff] STAFF_SESSION_SECRET no configurado: las sesiones se invalidan al reiniciar.');

const revokedStaffTokens = new Map(); // jti -> exp
const staffLoginAttempts = new Map(); // ip -> { count, firstAt, lockedUntil }

const hmac = (value) => crypto.createHmac('sha256', STAFF_SESSION_SECRET).update(String(value)).digest('base64url');
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const createStaffToken = () => {
  const payload = Buffer.from(JSON.stringify({
    jti: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + STAFF_SESSION_MS
  })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
};

const verifyStaffToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, hmac(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data?.jti || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (revokedStaffTokens.has(data.jti)) return null;
    return data;
  } catch {
    return null;
  }
};

const requireStaff = (req, res, next) => {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = verifyStaffToken(token);
  if (!session) return res.status(401).json({ error: 'No autorizado' });
  req.staffSession = session;
  next();
};

// Limpieza periodica de intentos y tokens revocados caducados
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedStaffTokens) if (exp < now) revokedStaffTokens.delete(jti);
  for (const [ip, a] of staffLoginAttempts) {
    if ((a.lockedUntil || 0) < now && now - a.firstAt > LOGIN_WINDOW_MS) staffLoginAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

app.post('/api/staff/login', async (req, res) => {
  if (!STAFF_PIN) return res.status(503).json({ error: 'Acceso Staff no configurado en el servidor' });
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let attempt = staffLoginAttempts.get(ip);
  if (!attempt || now - attempt.firstAt > LOGIN_WINDOW_MS) {
    attempt = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  if (attempt.lockedUntil > now) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.', retryAfter });
  }

  const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
  if (pin && safeEqual(hmac(`pin:${pin}`), hmac(`pin:${STAFF_PIN}`))) {
    staffLoginAttempts.delete(ip);
    return res.json({ success: true, token: createStaffToken(), expiresIn: STAFF_SESSION_MS });
  }

  attempt.count += 1;
  if (attempt.count >= LOGIN_MAX_ATTEMPTS) attempt.lockedUntil = now + LOGIN_WINDOW_MS;
  staffLoginAttempts.set(ip, attempt);
  await new Promise(r => setTimeout(r, 400));
  return res.status(401).json({ error: 'PIN incorrecto', remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - attempt.count) });
});

app.get('/api/staff/session', requireStaff, (req, res) => {
  res.json({ authenticated: true, expiresAt: req.staffSession.exp });
});

app.post('/api/staff/logout', requireStaff, (req, res) => {
  revokedStaffTokens.set(req.staffSession.jti, req.staffSession.exp);
  res.json({ success: true });
});

// ==================== CONTENIDOS DE LA WEB ====================
// Textos editables desde Staff > Contenidos. Los valores por defecto reproducen la portada actual.
const SITE_CONTENT_DEFAULTS = {
  hero_kicker: 'Las Greenlanters Nails · Almería',
  hero_title: 'Tus manos hablan por ti.',
  hero_title_highlight: 'Haz que destaquen.',
  hero_subtitle: 'Manicurista · Técnica en uñas gel y poligel · Dibujos a mano · Decoración.',
  hero_cta_booking: 'Solicitar cita',
  hero_cta_instagram: 'Instagram',
  services_kicker: 'Servicios',
  services_title: 'Técnicas y decoración',
  services_intro: 'La información se mantiene desde Staff y se refleja aquí automáticamente.',
  services_empty: 'No hay servicios activos publicados.',
  gallery_kicker: 'Galería',
  gallery_title: 'Trabajos reales',
  gallery_cta: 'Diseñar',
  gallery_empty_title: 'La galería está pendiente de fotografías.',
  gallery_empty_text: 'Añade las imágenes reales desde Staff y aparecerán aquí.',
  closing_title: 'Nail art con personalidad.',
  closing_subtitle: 'Almería · @greenlanters.nails',
  closing_cta_booking: 'Solicitar cita',
  instagram_handle: '@greenlanters.nails',
  instagram_url: 'https://www.instagram.com/greenlanters.nails/'
};
const SITE_CONTENT_MAX_LENGTH = 1000;

const loadSiteContent = async () => {
  const rows = await dbAll('SELECT key, value, updatedAt FROM site_content');
  const content = { ...SITE_CONTENT_DEFAULTS };
  let updatedAt = null;
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(SITE_CONTENT_DEFAULTS, row.key) && typeof row.value === 'string') {
      content[row.key] = row.value;
      if (!updatedAt || row.updatedAt > updatedAt) updatedAt = row.updatedAt;
    }
  }
  return { content, defaults: SITE_CONTENT_DEFAULTS, updatedAt };
};

app.get('/api/content', async (req, res) => {
  try {
    res.json(await loadSiteContent());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/content', requireStaff, async (req, res) => {
  try {
    const incoming = req.body?.content;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Formato no válido' });
    }
    const updates = [];
    for (const [key, raw] of Object.entries(incoming)) {
      if (!Object.prototype.hasOwnProperty.call(SITE_CONTENT_DEFAULTS, key)) continue;
      if (typeof raw !== 'string') return res.status(400).json({ error: `El campo ${key} debe ser texto` });
      const value = raw.trim();
      if (value.length > SITE_CONTENT_MAX_LENGTH) return res.status(400).json({ error: `El campo ${key} supera ${SITE_CONTENT_MAX_LENGTH} caracteres` });
      if (key === 'instagram_url' && value && !/^https:\/\/[^\s]+$/i.test(value)) {
        return res.status(400).json({ error: 'La URL de Instagram debe empezar por https://' });
      }
      updates.push([key, value]);
    }
    const now = new Date().toISOString();
    for (const [key, value] of updates) {
      // Vacio o igual al valor por defecto => se elimina y se usa el texto por defecto
      if (!value || value === SITE_CONTENT_DEFAULTS[key]) {
        await dbRun('DELETE FROM site_content WHERE key = ?', [key]);
      } else {
        await dbRun(
          'INSERT INTO site_content (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt',
          [key, value, now]
        );
      }
    }
    res.json({ success: true, ...(await loadSiteContent()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear tablas al iniciar
const initDatabase = async () => {
  try {
    // Tabla de citas
    await dbRun(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        locator TEXT UNIQUE,
        serviceIds TEXT,
        addonIds TEXT,
        specialistId TEXT,
        date TEXT,
        time TEXT,
        totalPrice REAL,
        totalDuration INTEGER,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        status TEXT,
        notes TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // Tabla de diseños personalizados
    await dbRun(`
      CREATE TABLE IF NOT EXISTS custom_designs (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        shape TEXT,
        notes TEXT,
        imageBase64 TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // Tabla de configuracin del saln
    await dbRun(`
      CREATE TABLE IF NOT EXISTS salón_config (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        hours TEXT,
        logo TEXT,
        coverPhoto TEXT,
        primaryColor TEXT,
        accentColor TEXT,
        backgroundColor TEXT,
        whatsapp TEXT,
        calendarPublic INTEGER DEFAULT 1,
        workingHours TEXT,
        blockedSlots TEXT,
        vacations TEXT,
        nailShapes TEXT,
        nailLengths TEXT,
        nailStyles TEXT,
        products TEXT,
        updatedAt TEXT
      )
    `);

    // Migracin segura para instalaciones existentes
    await ensureColumn('salón_config', 'whatsapp', 'TEXT');
    await ensureColumn('salón_config', 'calendarPublic', 'INTEGER DEFAULT 1');
    await ensureColumn('salón_config', 'workingHours', 'TEXT');
    await ensureColumn('salón_config', 'blockedSlots', 'TEXT');
    await ensureColumn('salón_config', 'vacations', 'TEXT');
    await ensureColumn('salón_config', 'nailShapes', 'TEXT');
    await ensureColumn('salón_config', 'nailLengths', 'TEXT');
    await ensureColumn('salón_config', 'nailStyles', 'TEXT');
    await ensureColumn('salón_config', 'products', 'TEXT');

    // Tabla de servicios
    await dbRun(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT,
        duration INTEGER,
        price REAL,
        description TEXT,
        active INTEGER
      )
    `);

    // Campos editoriales del catlogo pblico (migracin segura)
    await ensureColumn('services', 'category', 'TEXT');
    await ensureColumn('services', 'shortDescription', 'TEXT');
    await ensureColumn('services', 'longDescription', 'TEXT');
    await ensureColumn('services', 'featured', 'INTEGER DEFAULT 0');
    await ensureColumn('services', 'sortOrder', 'INTEGER DEFAULT 0');
    await ensureColumn('services', 'instagramSource', 'TEXT');
    await ensureColumn('services', 'updatedAt', 'TEXT');

    // Tabla de especialistas
    await dbRun(`
      CREATE TABLE IF NOT EXISTS specialists (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        photo TEXT,
        description TEXT,
        active INTEGER
      )
    `);

    // Tabla de solicitudes de cita
    await dbRun(`
      CREATE TABLE IF NOT EXISTS booking_requests (
        id TEXT PRIMARY KEY,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        serviceType TEXT,
        preferredDate TEXT,
        preferredTime TEXT,
        notes TEXT,
        status TEXT,
        createdAt TEXT,
        respondedAt TEXT
      )
    `);

    // Tabla de galera
    await dbRun(`
      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY,
        photoBase64 TEXT,
        title TEXT,
        caption TEXT,
        uploadedAt TEXT,
        displayOrder INTEGER
      )
    `);

    // Tabla de contenidos editables de la web (Staff > Contenidos)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      )
    `);

    // Semilla inicial: una sola cabina/especialista y catlogo real del proyecto.
    const serviceCount = await dbGet('SELECT COUNT(*) AS c FROM services');
    if (Number(serviceCount?.c || 0) === 0) {
      const seedServices = [
        ['unas-gel', 'Uñas en gel', 'gel', 'Manicura y diseños realizados con tcnica de gel.', 1],
        ['unas-poligel', 'Uñas en poligel', 'poligel', 'Diseos y trabajos realizados con tcnica de poligel.', 2],
        ['dibujos-a-mano', 'Dibujos a mano', 'decoración', 'Diseos personalizados y detalles realizados a mano.', 3],
        ['decoración-personalizada', 'Decoracin personalizada', 'diseno_personalizado', 'Decoracin y nail art adaptados al estilo de cada clienta.', 4]
      ];
      for (const [id, name, category, description, sortOrder] of seedServices) {
        await dbRun(
          'INSERT INTO services (id, name, duration, price, description, shortDescription, category, featured, sortOrder, instagramSource, updatedAt, active) VALUES (?, ?, NULL, NULL, ?, ?, ?, 1, ?, ?, ?, 1)',
          [id, name, description, description, category, sortOrder, '@greenlanters.nails', new Date().toISOString()]
        );
      }
    }

    const specialistCount = await dbGet('SELECT COUNT(*) AS c FROM specialists');
    if (Number(specialistCount?.c || 0) === 0) {
      await dbRun(
        'INSERT INTO specialists (id, name, role, photo, description, active) VALUES (?, ?, ?, ?, ?, 1)',
        ['any', 'Cualquiera Disponible', 'Equipo Greenlanters', '', 'Asignacin automtica a la cabina disponible.']
      );
    }

    const configCount = await dbGet('SELECT COUNT(*) AS c FROM salón_config');
    if (Number(configCount?.c || 0) === 0) {
      const defaultHours = [
        { day: 'Lunes', open: '10:00', close: '20:00', enabled: true },
        { day: 'Martes', open: '10:00', close: '20:00', enabled: true },
        { day: 'Mircoles', open: '10:00', close: '20:00', enabled: true },
        { day: 'Jueves', open: '10:00', close: '20:00', enabled: true },
        { day: 'Viernes', open: '10:00', close: '20:00', enabled: true },
        { day: 'Sbado', open: '10:00', close: '14:00', enabled: true },
        { day: 'Domingo', open: '10:00', close: '14:00', enabled: false }
      ];
      await dbRun(
        `INSERT INTO salón_config
         (id, name, description, phone, email, address, hours, logo, coverPhoto,
          primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'main', 'Las Greenlanters Nails',
          'Manicurista  Tcnica en uñas gel y poligel  Dibujos a mano, decoracin  Almera  Tus manos hablan por ti, haz que destaquen',
          '', '', 'Almera',
          '',
          '/assets/logo-greenlanters.webp', '', '#082D05', '#8CFF00', '#F7F8EF', '',
          0, JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]), new Date().toISOString()
        ]
      );
    }

    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando BD:', err);
  }
};

// ==================== RUTAS API ====================

// CITAS
app.get('/api/appointments', requireStaff, async (req, res) => {
  try {
    const appointments = await dbAll('SELECT * FROM appointments ORDER BY date DESC, time DESC');
    res.json(appointments.map(a => ({
      ...a,
      serviceIds: JSON.parse(a.serviceIds || '[]'),
      addonIds: JSON.parse(a.addonIds || '[]')
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', requireStaff, async (req, res) => {
  try {
    const { id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, notes } = req.body;
    
    await dbRun(
      `INSERT INTO appointments 
       (id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, status, notes, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, locator, JSON.stringify(serviceIds), JSON.stringify(addonIds), specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, 'Confirmada', notes || '', new Date().toISOString(), new Date().toISOString()]
    );

    sendEmail({
      to: clientEmail,
      subject: `Tu cita est confirmada  PIN ${locator}  Las Greenlanters Nails`,
      templateName: 'booking-confirmed.html',
      vars: { clientName, locator, date, time, totalPrice: totalPrice ?? 0 }
    });

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', requireStaff, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    await dbRun(
      'UPDATE appointments SET status = ?, notes = ?, updatedAt = ? WHERE id = ?',
      [status, notes || '', new Date().toISOString(), req.params.id]
    );

    if (status === 'Cancelada') {
      const appt = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
      if (appt?.clientEmail) {
        sendEmail({
          to: appt.clientEmail,
          subject: `Tu cita ${appt.locator} ha sido cancelada  Las Greenlanters Nails`,
          templateName: 'booking-cancelled.html',
          vars: { clientName: appt.clientName, locator: appt.locator, date: appt.date, time: appt.time }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DISEOS
app.get('/api/designs', requireStaff, async (req, res) => {
  try {
    const designs = await dbAll('SELECT * FROM custom_designs ORDER BY createdAt DESC');
    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/designs', async (req, res) => {
  try {
    const { id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64 } = req.body;
    
    await dbRun(
      `INSERT INTO custom_designs 
       (id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64, status, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64, 'Pendiente', new Date().toISOString(), new Date().toISOString()]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/designs/:id', requireStaff, async (req, res) => {
  try {
    const { status } = req.body;
    
    await dbRun(
      'UPDATE custom_designs SET status = ?, updatedAt = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/designs/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM custom_designs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONFIGURACIN
app.get('/api/config', async (req, res) => {
  try {
    const config = await dbGet('SELECT * FROM salón_config WHERE id = ?', ['main']);
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', requireStaff, async (req, res) => {
  try {
    const {
      name, description, phone, email, address, hours, logo, coverPhoto,
      primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
      workingHours, blockedSlots, vacations, nailShapes, nailLengths,
      nailStyles, products
    } = req.body;

    const existing = await dbGet('SELECT id FROM salón_config WHERE id = ?', ['main']);
    const values = [
      name, description, phone, email, address, hours, logo, coverPhoto,
      primaryColor, accentColor, backgroundColor, whatsapp,
      calendarPublic === undefined ? 1 : (calendarPublic ? 1 : 0),
      JSON.stringify(workingHours ?? []),
      JSON.stringify(blockedSlots ?? []),
      JSON.stringify(vacations ?? []),
      JSON.stringify(nailShapes ?? []),
      JSON.stringify(nailLengths ?? []),
      JSON.stringify(nailStyles ?? []),
      JSON.stringify(products ?? []),
      new Date().toISOString()
    ];

    if (existing) {
      await dbRun(
        `UPDATE salón_config
         SET name = ?, description = ?, phone = ?, email = ?, address = ?, hours = ?,
             logo = ?, coverPhoto = ?, primaryColor = ?, accentColor = ?, backgroundColor = ?,
             whatsapp = ?, calendarPublic = ?, workingHours = ?, blockedSlots = ?, vacations = ?,
             nailShapes = ?, nailLengths = ?, nailStyles = ?, products = ?, updatedAt = ?
         WHERE id = ?`,
        [...values, 'main']
      );
    } else {
      await dbRun(
        `INSERT INTO salón_config
         (id, name, description, phone, email, address, hours, logo, coverPhoto,
          primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['main', ...values]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error guardando configuracin:', err);
    res.status(500).json({ error: err.message });
  }
});

// SERVICIOS
app.get('/api/services', async (req, res) => {
  try {
    const services = await dbAll('SELECT * FROM services WHERE active = 1 ORDER BY sortOrder ASC, name ASC');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', requireStaff, async (req, res) => {
  try {
    const { id, name, duration, price, description, shortDescription, longDescription, category, featured, sortOrder, instagramSource } = req.body;
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO services (id, name, duration, price, description, shortDescription, longDescription, category, featured, sortOrder, instagramSource, updatedAt, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [id, name, duration ?? null, price ?? null, description || shortDescription || '', shortDescription || description || '', longDescription || '', category || 'diseno_personalizado', featured ? 1 : 0, Number(sortOrder) || 0, instagramSource || '@greenlanters.nails', now]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', requireStaff, async (req, res) => {
  try {
    const { name, duration, price, description, shortDescription, longDescription, category, featured, sortOrder, instagramSource } = req.body;
    await dbRun(
      'UPDATE services SET name = ?, duration = ?, price = ?, description = ?, shortDescription = ?, longDescription = ?, category = ?, featured = ?, sortOrder = ?, instagramSource = ?, updatedAt = ? WHERE id = ?',
      [name, duration ?? null, price ?? null, description || shortDescription || '', shortDescription || description || '', longDescription || '', category || 'diseno_personalizado', featured ? 1 : 0, Number(sortOrder) || 0, instagramSource || '@greenlanters.nails', new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('UPDATE services SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ESPECIALISTAS
app.get('/api/specialists', async (req, res) => {
  try {
    const specialists = await dbAll('SELECT * FROM specialists WHERE active = 1');
    res.json(specialists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/specialists', requireStaff, async (req, res) => {
  try {
    const { id, name, role, photo, description } = req.body;
    
    await dbRun(
      'INSERT INTO specialists (id, name, role, photo, description, active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name, role, photo, description || '']
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/specialists/:id', requireStaff, async (req, res) => {
  try {
    const { name, role, photo, description } = req.body;
    
    await dbRun(
      'UPDATE specialists SET name = ?, role = ?, photo = ?, description = ? WHERE id = ?',
      [name, role, photo, description || '', req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/specialists/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('UPDATE specialists SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FEED PaBLICO (para instagram-autopilot / servicios externos) ====================
// Ver I:\instagram-autopilot\INTEGRATION.md para el contrato de este endpoint.
app.get('/api/public/content-feed', async (req, res) => {
  try {
    const providedKey = req.header('x-api-key');
    if (process.env.CONTENT_FEED_API_KEY && providedKey !== process.env.CONTENT_FEED_API_KEY) {
      return res.status(401).json({ error: 'API key invlida' });
    }
    const photos = await dbAll('SELECT * FROM gallery ORDER BY displayOrder ASC, uploadedAt DESC');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const feed = photos.map((p) => ({
      id: `gallery_${p.id}`,
      type: 'gallery_photo',
      imageUrl: `${baseUrl}/api/gallery/${p.id}/image`,
      title: p.title || '',
      context: p.caption || 'Foto de la galera del saln',
      createdAt: p.uploadedAt,
      consent: true
    }));
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sirve la foto de galera como imagen real (necesario para que Instagram/el
// servicio externo puedan descargarla por URL pblica, no vale el base64)
app.get('/api/gallery/:id/image', async (req, res) => {
  try {
    const photo = await dbGet('SELECT photoBase64 FROM gallery WHERE id = ?', [req.params.id]);
    if (!photo?.photoBase64) return res.status(404).send('Foto no encontrada');
    const match = photo.photoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(500).send('Formato de imagen no reconocido');
    const [, mime, base64Data] = match;
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(base64Data, 'base64'));
  } catch (err) {
    res.status(500).send('Error interno');
  }
});

// GALERA
app.get('/api/gallery', async (req, res) => {
  try {
    const photos = await dbAll('SELECT * FROM gallery ORDER BY displayOrder ASC');
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gallery', requireStaff, async (req, res) => {
  try {
    const { id, photoBase64, title, caption } = req.body;
    const order = await dbGet('SELECT MAX(displayOrder) as max FROM gallery');
    const displayOrder = (order?.max || 0) + 1;
    
    await dbRun(
      'INSERT INTO gallery (id, photoBase64, title, caption, uploadedAt, displayOrder) VALUES (?, ?, ?, ?, ?, ?)',
      [id, photoBase64, title || '', caption || '', new Date().toISOString(), displayOrder]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOLICITUDES DE CITA
app.post('/api/booking-request', async (req, res) => {
  try {
    const { clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, createdAt } = req.body;
    const id = Date.now().toString();
    
    await dbRun(
      `INSERT INTO booking_requests 
       (id, clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, 'Pendiente', createdAt]
    );

    sendEmail({
      to: clientEmail,
      subject: 'Hemos recibido tu solicitud de cita  Las Greenlanters Nails',
      templateName: 'booking-confirmation.html',
      vars: {
        clientName,
        serviceType: serviceType || 'tu servicio',
        preferredDate: preferredDate || 'a confirmar',
        preferredTime: preferredTime || 'a confirmar'
      }
    });

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking-requests', requireStaff, async (req, res) => {
  try {
    const requests = await dbAll('SELECT * FROM booking_requests ORDER BY createdAt DESC');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/booking-requests/:id', requireStaff, async (req, res) => {
  try {
    const { status } = req.body;
    
    await dbRun(
      'UPDATE booking_requests SET status = ?, respondedAt = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/booking-requests/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM booking_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SALUD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Frontend de produccin: mismo origen que la API, compatible con Cloudflare/EasyPanel.
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Ruta API no encontrada' });
    }
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicializar y escuchar
initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`xa Servidor Express en puerto ${PORT}`);
    console.log(`x API Base: http://localhost:${PORT}/api`);
    console.log(`x Base de datos: ${dbPath}`);
  });
});


