const Database = require('better-sqlite3');
const path = require('path');
let db;
function getDb(){ if(!db){ const p=process.env.DATABASE_PATH||path.join(process.cwd(),'data/app.sqlite'); db=new Database(p); db.pragma('journal_mode = WAL'); } return db; }
function migrate(database=getDb()){
 database.exec(`CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, adminId INTEGER NOT NULL, csrfToken TEXT NOT NULL, expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payment_requests(id INTEGER PRIMARY KEY, publicTokenHash TEXT UNIQUE NOT NULL, clientName TEXT NOT NULL, clientEmail TEXT NOT NULL, clientPhone TEXT, amountCents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'usd', reference TEXT NOT NULL, clientDescription TEXT NOT NULL, internalNote TEXT, paymentCategory TEXT NOT NULL, allowedPaymentMethods TEXT NOT NULL, cardPaymentMaxCents INTEGER, cardOverride INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, expiresAt TEXT NOT NULL, dueAt TEXT, revokedAt TEXT, paidAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, createdByAdminId INTEGER, stripeCustomerId TEXT, stripeCheckoutSessionId TEXT, stripePaymentIntentId TEXT, selectedPaymentMethod TEXT, lastWebhookAt TEXT, receiptNumber TEXT);
CREATE TABLE IF NOT EXISTS payment_attempts(id TEXT PRIMARY KEY, paymentRequestId INTEGER NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, stripeCheckoutSessionId TEXT, stripePaymentIntentId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(paymentRequestId, method, status));
CREATE TABLE IF NOT EXISTS stripe_webhook_events(id INTEGER PRIMARY KEY, stripeEventId TEXT UNIQUE NOT NULL, eventType TEXT NOT NULL, paymentRequestId INTEGER, processedAt TEXT NOT NULL, processingResult TEXT NOT NULL, checkoutSessionId TEXT, paymentIntentId TEXT, method TEXT, amountReceived INTEGER, currency TEXT, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY, administratorId INTEGER, action TEXT NOT NULL, paymentRequestId INTEGER, safeMetadata TEXT, ipAddressHash TEXT, createdAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);`);
}
module.exports={getDb,migrate};
