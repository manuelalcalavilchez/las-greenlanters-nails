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
        content TEXT,
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
    await ensureColumn('salón_config', 'content', 'TEXT');

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

    // Tabla de facturación
    await dbRun(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, appointmentId TEXT, number TEXT UNIQUE, status TEXT, issueDate TEXT, dueDate TEXT, clientName TEXT, clientTaxId TEXT, clientEmail TEXT, clientPhone TEXT, clientAddress TEXT, lines TEXT, subtotal REAL, vatRate REAL, vatAmount REAL, total REAL, paymentMethod TEXT, notes TEXT, previousHash TEXT, recordHash TEXT, qrPayload TEXT, createdAt TEXT, updatedAt TEXT)`);
    await ensureColumn('salón_config', 'legalName', 'TEXT');
    await ensureColumn('salón_config', 'taxId', 'TEXT');
    await ensureColumn('salón_config', 'invoicePrefix', "TEXT DEFAULT 'F'");
    await ensureColumn('salón_config', 'invoiceNextNumber', 'INTEGER DEFAULT 1');
    await ensureColumn('salón_config', 'defaultVat', 'REAL DEFAULT 21');
    await ensureColumn('salón_config', 'pricesIncludeVat', 'INTEGER DEFAULT 1');

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
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, content, legalName, taxId, invoicePrefix, invoiceNextNumber, defaultVat, pricesIncludeVat, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    await dbRun(`UPDATE salón_config SET content = ? WHERE id = 'main' AND (content IS NULL OR content = '')`, [JSON.stringify({
      heroEyebrow: 'Las Greenlanters Nails · Almería', heroTitle: 'Tus manos hablan por ti.', heroHighlight: 'Haz que destaquen.',
      heroText: 'Manicurista · Técnica en uñas gel y poligel · Dibujos a mano · Decoración.',
      servicesEyebrow: 'Servicios', servicesTitle: 'Técnicas y decoración', servicesIntro: 'Trabajos personalizados pensados para ti.',
      galleryEyebrow: 'Galería', galleryTitle: 'Trabajos reales', galleryIntro: 'Una selección de nuestros trabajos.',
      ctaTitle: 'Nail art con personalidad.', ctaText: 'Almería · @greenlanters.nails', instagramHandle: '@greenlanters.nails'
    })]);
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando BD:', err);
  }
};

// ==================== RUTAS API ====================

// CITAS
app.get('/api/appointments', async (req, res) => {
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

app.post('/api/appointments', async (req, res) => {
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

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { status, notes, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration } = req.body;
    const current = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Cita no encontrada' });
    const nextStatus = status ?? current.status;
    const nextNotes = notes ?? current.notes ?? '';
    const nextServiceIds = Array.isArray(serviceIds) ? JSON.stringify(serviceIds) : current.serviceIds;
    const nextAddonIds = Array.isArray(addonIds) ? JSON.stringify(addonIds) : current.addonIds;
    await dbRun(
      `UPDATE appointments SET status = ?, notes = ?, serviceIds = ?, addonIds = ?, specialistId = ?, date = ?, time = ?, totalPrice = ?, totalDuration = ?, updatedAt = ? WHERE id = ?`,
      [nextStatus, nextNotes, nextServiceIds, nextAddonIds, specialistId ?? current.specialistId, date ?? current.date, time ?? current.time,
       totalPrice === undefined ? current.totalPrice : Number(totalPrice) || 0,
       totalDuration === undefined ? current.totalDuration : Number(totalDuration) || 0,
       new Date().toISOString(), req.params.id]
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

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DISEOS
app.get('/api/designs', async (req, res) => {
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

app.put('/api/designs/:id', async (req, res) => {
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

app.delete('/api/designs/:id', async (req, res) => {
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

app.put('/api/config', async (req, res) => {
  try {
    const {
      name, description, phone, email, address, hours, logo, coverPhoto,
      primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
      workingHours, blockedSlots, vacations, nailShapes, nailLengths,
      nailStyles, products, content, legalName, taxId, invoicePrefix, invoiceNextNumber, defaultVat, pricesIncludeVat
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
      typeof content === 'string' ? content : JSON.stringify(content ?? {}),
      legalName || name, taxId || '', invoicePrefix || 'F', Number(invoiceNextNumber) || 1, Number(defaultVat ?? 21), pricesIncludeVat === undefined ? 1 : (pricesIncludeVat ? 1 : 0),
      new Date().toISOString()
    ];

    if (existing) {
      await dbRun(
        `UPDATE salón_config
         SET name = ?, description = ?, phone = ?, email = ?, address = ?, hours = ?,
             logo = ?, coverPhoto = ?, primaryColor = ?, accentColor = ?, backgroundColor = ?,
             whatsapp = ?, calendarPublic = ?, workingHours = ?, blockedSlots = ?, vacations = ?,
             nailShapes = ?, nailLengths = ?, nailStyles = ?, products = ?, content = ?, legalName = ?, taxId = ?, invoicePrefix = ?, invoiceNextNumber = ?, defaultVat = ?, pricesIncludeVat = ?, updatedAt = ?
         WHERE id = ?`,
        [...values, 'main']
      );
    } else {
      await dbRun(
        `INSERT INTO salón_config
         (id, name, description, phone, email, address, hours, logo, coverPhoto,
          primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, content, legalName, taxId, invoicePrefix, invoiceNextNumber, defaultVat, pricesIncludeVat, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['main', ...values]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error guardando configuracin:', err);
    res.status(500).json({ error: err.message });
  }
});

// FACTURACIÓN
app.get('/api/invoices', async (req,res)=>{try{const rows=await dbAll('SELECT * FROM invoices ORDER BY createdAt DESC');res.json(rows.map(i=>({...i,lines:JSON.parse(i.lines||'[]')})));}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/invoices/draft-from-appointment/:appointmentId',async(req,res)=>{try{const a=await dbGet('SELECT * FROM appointments WHERE id=?',[req.params.appointmentId]);if(!a)return res.status(404).json({error:'Cita no encontrada'});if(a.status==='Cancelada')return res.status(400).json({error:'No se puede facturar una cita cancelada'});const ex=await dbGet('SELECT id FROM invoices WHERE appointmentId=? AND status!=?',[a.id,'Anulada']);if(ex)return res.status(409).json({error:'Esta cita ya tiene una factura o borrador',invoiceId:ex.id});const cfg=await dbGet('SELECT * FROM salón_config WHERE id=?',['main']);const ss=await dbAll('SELECT * FROM services WHERE active=1');const ids=JSON.parse(a.serviceIds||'[]');const lines=ids.map(id=>ss.find(s=>s.id===id)).filter(Boolean).map(s=>({description:s.name,quantity:1,unitPrice:Number(s.price)||0}));if(!lines.length)lines.push({description:'Servicio de manicura',quantity:1,unitPrice:Number(a.totalPrice)||0});const total=Number(a.totalPrice)||lines.reduce((x,l)=>x+l.unitPrice*l.quantity,0);const rate=Number(cfg?.defaultVat??21);const incl=Number(cfg?.pricesIncludeVat??1)===1;const subtotal=incl?total/(1+rate/100):total;const vat=incl?total-subtotal:total*rate/100;const now=new Date().toISOString();const inv={id:'inv_'+Date.now(),appointmentId:a.id,number:null,status:'Borrador',issueDate:now.slice(0,10),dueDate:now.slice(0,10),clientName:a.clientName||'',clientTaxId:'',clientEmail:a.clientEmail||'',clientPhone:a.clientPhone||'',clientAddress:'',lines,subtotal:+subtotal.toFixed(2),vatRate:rate,vatAmount:+vat.toFixed(2),total:+total.toFixed(2),paymentMethod:'Efectivo',notes:'',previousHash:null,recordHash:null,qrPayload:null,createdAt:now,updatedAt:now};await dbRun('INSERT INTO invoices (id,appointmentId,number,status,issueDate,dueDate,clientName,clientTaxId,clientEmail,clientPhone,clientAddress,lines,subtotal,vatRate,vatAmount,total,paymentMethod,notes,previousHash,recordHash,qrPayload,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[inv.id,inv.appointmentId,null,inv.status,inv.issueDate,inv.dueDate,inv.clientName,inv.clientTaxId,inv.clientEmail,inv.clientPhone,inv.clientAddress,JSON.stringify(lines),inv.subtotal,inv.vatRate,inv.vatAmount,inv.total,inv.paymentMethod,inv.notes,null,null,null,now,now]);res.json({success:true,invoice:inv});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/invoices/:id',async(req,res)=>{try{const cur=await dbGet('SELECT * FROM invoices WHERE id=?',[req.params.id]);if(!cur)return res.status(404).json({error:'Factura no encontrada'});if(cur.status==='Emitida')return res.status(409).json({error:'Una factura emitida no se edita; debe rectificarse'});const {clientName,clientTaxId,clientEmail,clientPhone,clientAddress,lines,vatRate,paymentMethod,notes,issueDate,dueDate}=req.body;const safe=Array.isArray(lines)?lines:JSON.parse(cur.lines||'[]');const gross=safe.reduce((x,l)=>x+(Number(l.quantity)||0)*(Number(l.unitPrice)||0),0);const cfg=await dbGet('SELECT * FROM salón_config WHERE id=?',['main']);const incl=Number(cfg?.pricesIncludeVat??1)===1;const rate=Number(vatRate??cur.vatRate??21);const subtotal=incl?gross/(1+rate/100):gross;const vat=incl?gross-subtotal:gross*rate/100;const total=incl?gross:gross+vat;await dbRun('UPDATE invoices SET clientName=?,clientTaxId=?,clientEmail=?,clientPhone=?,clientAddress=?,lines=?,subtotal=?,vatRate=?,vatAmount=?,total=?,paymentMethod=?,notes=?,issueDate=?,dueDate=?,updatedAt=? WHERE id=?',[clientName??cur.clientName,clientTaxId??cur.clientTaxId,clientEmail??cur.clientEmail,clientPhone??cur.clientPhone,clientAddress??cur.clientAddress,JSON.stringify(safe),+subtotal.toFixed(2),rate,+vat.toFixed(2),+total.toFixed(2),paymentMethod??cur.paymentMethod,notes??cur.notes,issueDate??cur.issueDate,dueDate??cur.dueDate,new Date().toISOString(),cur.id]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/invoices/:id/issue',async(req,res)=>{try{const inv=await dbGet('SELECT * FROM invoices WHERE id=?',[req.params.id]);if(!inv)return res.status(404).json({error:'Factura no encontrada'});if(inv.status==='Emitida')return res.status(409).json({error:'La factura ya está emitida'});const cfg=await dbGet('SELECT * FROM salón_config WHERE id=?',['main']);if(!cfg?.taxId)return res.status(400).json({error:'Configura primero el NIF/CIF del emisor en Configuración > Facturación'});const seq=Number(cfg.invoiceNextNumber||1);const number=(cfg.invoicePrefix||'F')+String(seq).padStart(4,'0');const prev=await dbGet("SELECT recordHash FROM invoices WHERE status='Emitida' ORDER BY createdAt DESC LIMIT 1");const previousHash=prev?.recordHash||'';const record={...inv,number,previousHash,lines:JSON.parse(inv.lines||'[]')};const recordHash=crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');const qrPayload='FACTURA|'+number+'|'+cfg.taxId+'|'+Number(inv.total).toFixed(2)+'|'+inv.issueDate+'|'+recordHash;await dbRun("UPDATE invoices SET number=?,status='Emitida',previousHash=?,recordHash=?,qrPayload=?,updatedAt=? WHERE id=?",[number,previousHash,recordHash,qrPayload,new Date().toISOString(),inv.id]);await dbRun('UPDATE salón_config SET invoiceNextNumber=? WHERE id=?',[seq+1,'main']);res.json({success:true,number,recordHash,qrPayload});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/invoices/:id/print',async(req,res)=>{try{const i=await dbGet('SELECT * FROM invoices WHERE id=?',[req.params.id]);if(!i)return res.status(404).send('Factura no encontrada');const cfg=await dbGet('SELECT * FROM salón_config WHERE id=?',['main']);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const lines=JSON.parse(i.lines||'[]').map(l=>'<tr><td>'+esc(l.description)+'</td><td>'+Number(l.quantity||0)+'</td><td>'+Number(l.unitPrice||0).toFixed(2)+' €</td><td>'+((Number(l.quantity)||0)*(Number(l.unitPrice)||0)).toFixed(2)+' €</td></tr>').join('');res.type('html').send('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(i.number||'Borrador')+'</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#222;max-width:900px;margin-left:auto;margin-right:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #082D05;padding-bottom:20px}h1{color:#082D05}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.totals{margin-left:auto;width:320px;margin-top:25px}.r{display:flex;justify-content:space-between;padding:6px}.total{font-weight:bold;font-size:18px;border-top:2px solid #082D05;padding-top:10px}.print{margin-top:30px;padding:12px 18px;background:#082D05;color:white;border:0;border-radius:8px}@media print{.print{display:none}}</style></head><body><header><div><h1>'+esc(cfg?.legalName||cfg?.name||'Las Greenlanters Nails')+'</h1><div>'+esc(cfg?.taxId?'NIF/CIF: '+cfg.taxId:'')+'<br>'+esc(cfg?.address||'')+'<br>'+esc(cfg?.email||'')+'<br>'+esc(cfg?.phone||'')+'</div></div><div><h2>FACTURA '+esc(i.number||'BORRADOR')+'</h2><div>Fecha: '+esc(i.issueDate)+'</div></div></header><section style="margin-top:30px"><strong>Cliente</strong><p>'+esc(i.clientName)+'<br>'+esc(i.clientTaxId?'NIF/CIF: '+i.clientTaxId:'')+'<br>'+esc(i.clientAddress||'')+'<br>'+esc(i.clientEmail||'')+'<br>'+esc(i.clientPhone||'')+'</p></section><table><thead><tr><th>Concepto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>'+lines+'</tbody></table><div class="totals"><div class="r"><span>Base imponible</span><span>'+Number(i.subtotal||0).toFixed(2)+' €</span></div><div class="r"><span>IVA '+Number(i.vatRate||0)+'%</span><span>'+Number(i.vatAmount||0).toFixed(2)+' €</span></div><div class="r total"><span>TOTAL</span><span>'+Number(i.total||0).toFixed(2)+' €</span></div></div><p>Forma de pago: '+esc(i.paymentMethod||'')+'</p><p>'+esc(i.notes||'')+'</p><button class="print" onclick="window.print()">Imprimir / Guardar PDF</button></body></html>');}catch(e){res.status(500).send('Error generando factura');}});

app.post('/api/invoices/:id/cancel',async(req,res)=>{try{const inv=await dbGet('SELECT * FROM invoices WHERE id=?',[req.params.id]);if(!inv)return res.status(404).json({error:'Factura no encontrada'});await dbRun("UPDATE invoices SET status='Anulada',updatedAt=? WHERE id=?",[new Date().toISOString(),inv.id]);res.json({success:true,warning:inv.status==='Emitida'?'La anulación queda registrada; para una rectificación fiscal completa debe emitirse la factura rectificativa correspondiente.':null});}catch(e){res.status(500).json({error:e.message});}});
// SERVICIOS
app.get('/api/services', async (req, res) => {
  try {
    const services = await dbAll('SELECT * FROM services WHERE active = 1 ORDER BY sortOrder ASC, name ASC');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', async (req, res) => {
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

app.put('/api/services/:id', async (req, res) => {
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

app.delete('/api/services/:id', async (req, res) => {
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

app.post('/api/specialists', async (req, res) => {
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

app.put('/api/specialists/:id', async (req, res) => {
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

app.delete('/api/specialists/:id', async (req, res) => {
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

app.post('/api/gallery', async (req, res) => {
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

app.delete('/api/gallery/:id', async (req, res) => {
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

app.get('/api/booking-requests', async (req, res) => {
  try {
    const requests = await dbAll('SELECT * FROM booking_requests ORDER BY createdAt DESC');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/booking-requests/:id', async (req, res) => {
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

app.delete('/api/booking-requests/:id', async (req, res) => {
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


