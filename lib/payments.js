const crypto=require('crypto');
const {z}=require('zod');
function now(){return new Date().toISOString()}
function token(){return crypto.randomBytes(32).toString('base64url')}
function hashToken(t){return crypto.createHash('sha256').update(t).digest('hex')}
function hashIp(ip){return crypto.createHash('sha256').update(String(ip||'')).digest('hex')}
function centsFromDollars(v){if(!/^\d{1,6}(\.\d{1,2})?$/.test(String(v))) throw new Error('Invalid amount'); const [d,c='']=String(v).split('.'); return Number(d)*100+Number((c+'00').slice(0,2));}
function dollars(c){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100)}
const createSchema=z.object({clientName:z.string().trim().min(1).max(120),clientEmail:z.string().email().max(180),clientPhone:z.string().trim().max(40).optional().or(z.literal('')),amountDollars:z.string(),reference:z.string().trim().min(1).max(80),internalNote:z.string().trim().max(1000).optional().or(z.literal('')),clientDescription:z.string().trim().min(1).max(180),paymentCategory:z.enum(['earned_fee','advanced_fee_retainer','cost_reimbursement','other']),allowedPaymentMethods:z.enum(['both','ach','card']),expiresAt:z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),cardPaymentMaxCents:z.string().optional().or(z.literal('')),dueAt:z.string().optional().or(z.literal('')),confirmHighValue:z.string().optional(),cardOverride:z.string().optional()});
function allowedList(v){return v==='both'?['ach','card']:[v]}
function isActive(r){return r&&!r.revokedAt&&r.status!=='paid'&&new Date(r.expiresAt)>new Date()}
module.exports={now,token,hashToken,hashIp,centsFromDollars,dollars,createSchema,allowedList,isActive};
