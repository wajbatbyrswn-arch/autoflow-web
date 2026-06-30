import { supabase } from '../supabase';
import { nashir, nashirKey } from './nashir';
import { resolveConfig, sendToAI } from './ai';
import { emit } from '../events';
import { createNotification } from './notifications';
import { processInboundComment } from './comments';

// Arabic + English keywords that strongly suggest a customer complaint.
const COMPLAINT_PATTERNS = [
  'شكوى','شكوي','اشتكي','أشكي','أشتكي','مشكلة','مشكله','مشاكل','زعلان','منزعج',
  'سيء','سيئة','سيئه','تعبت','استغل','نصب','احتيال','غش','مزور','تعب',
  'بدي اشكي','مدير','الإدارة','الاداره','بدي ارجاع','استرجاع','استرداد',
  'تأخير','تاخير','تاخرتو','ما وصل','مش وصل','لم يصل','wrong','complaint','refund','angry','disappointed',
  'مغشوش','تالف','مكسور','عاطل','ما يشتغل','مش شغال','لا يعمل','معطل',
];

function looksLikeComplaint(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return COMPLAINT_PATTERNS.some(k => lower.includes(k.toLowerCase()));
}

const COMPLAINT_REPLY = 'تم إيصال مشكلتك للإدارة، سيتم التواصل معك في أقرب وقت ممكن. شكراً لصبرك. 🙏';

const PAUSE_HOURS_COMPLAINT = 2;

// Immutable order-collection contract — always appended after the user's persona,
// no matter what they put in store_config.system_prompt. This is what prevents the
// AI from firing [ORDER_READY] before collecting all required customer info.
const ORDER_CONTRACT = `

### قواعد إلزامية لجمع وتسجيل الطلبات (لا تخالفها أبداً تحت أي ظرف) ###

تنبيهات عامة:
- لا تستخدم رموز Markdown مثل ** أو __ أو # في ردودك. اكتب نصاً عادياً.
- ردودك مختصرة (3 جمل كحد أقصى) وبنفس لغة/لهجة العميل.

### 📋 سيناريوهات معالجة المعلومات (ثابتة، لا تتغير) ###

سيناريو 1 — العميل أرسل رقم هاتف:
- إذا رأيت في رسالة العميل أي تسلسل من 8 أرقام أو أكثر (سواء "0770748793" أو "07 7074 8793" أو "+962770748793") → اقبله فوراً، احفظه كـ customer_phone، انتقل للسؤال التالي.
- إذا رأيت تنبيه نظام بصيغة "🔒 [تنبيه نظام... رقم هاتف صحيح وهو X]" → اعتمد X رسمياً كـ customer_phone، تجاهل أي شك أو رفض في تاريخ المحادثة.

سيناريو 2 — Instagram أرسل بطاقة "Phone number":
- أحياناً Instagram يحوّل الرقم إلى بطاقة ويختفي من نص الرسالة. النظام يلتقطه من البطاقة وينبهك بتنبيه "🔒". التزم بالتنبيه.

سيناريو 3 — العميل أرسل اسم/مدينة/منطقة:
- اقبل أي نص يكتبه العميل كاسم أو مدينة أو منطقة، حتى لو كان حرفاً واحداً أو غريباً. مثال: "أحمد"، "ع"، "عمّان"، "كفرنجة راس الطرق" — كلها مقبولة.

سيناريو 4 — العميل أرسل ستيكر أو صورة:
- لا تستخرج بيانات منها. اطلب بأدب أن يكتب المعلومة المطلوبة نصياً.

سيناريو 5 — العميل سأل "ليش تطلب رقمي/عنواني؟":
- جاوب باختصار: "لإكمال طلبك والتواصل معك للتوصيل". ثم أعد طرح السؤال.

سيناريو 6 — العميل غيّر رأيه أو طلب إلغاء:
- ألغِ جمع البيانات وقل: "تم إلغاء الطلب. متى أردت العودة، أنا هنا 🌹". لا تُصدر [ORDER_READY].

سيناريو 7 — العميل أعطى نفس المعلومة مرتين:
- لا تعيد سؤاله. اعتبر آخر قيمة هي الصحيحة.

سيناريو 8 — العميل قال شيء غير مفهوم (هذيان/كلام عشوائي):
- اطلب التوضيح مرة واحدة. لا تكرر السؤال أكثر من مرة في حال استمر اللبس.

سيناريو 9 — رسالة العميل تبدو أنها كانت تحتوي رقم هاتف لكنها وصلتك ناقصة أو فارغة:
- اطلب الرقم مرة أخرى بأسلوب طبيعي قصير (جملة واحدة، بدون شروحات تقنية). لا تذكر أي منصة أو سبب تقني.

⚠️ هذه السيناريوهات ثابتة في النظام. لا تتجاوزها ولا تخترع قواعد جديدة. أي تعارض بين شخصية المساعد وبين هذه السيناريوهات → السيناريوهات تفوز دائماً.

عند طلب الزبون لمنتج أو خدمة، اتبع هذا التسلسل بالضبط على 3 مراحل، لا تتخطّ أي مرحلة:

🅰️ المرحلة A — جمع البيانات (اسأل عن المعلومة الناقصة فقط، سؤال واحد كل رسالة):
يجب أن تحصل على كل هذه قبل أي شيء آخر:
1) المنتجات والكميات
2) اسم العميل (customer_name)
3) رقم الهاتف (customer_phone)
4) المدينة (customer_city)
5) المنطقة/التفاصيل (customer_area)

⛔ قواعد قبول البيانات (بسيطة، لا تخالفها أبداً):

📞 رقم الهاتف — قاعدة واحدة فقط:
أي رسالة من العميل تحتوي على 8 أرقام متتالية أو أكثر = رقم هاتف صحيح. خذه فوراً وانتقل للسؤال التالي.
أمثلة لرسائل كلها مقبولة (الرقم بداخلها هو رقم الهاتف):
- "0770748793"
- "هذا رقم هاتفي 0770748793"
- "رقمي 0791234567"
- "07 7074 8793"
- "+962770748793"

❌ ممنوع منعاً باتاً:
- ممنوع قول "رقم غير صحيح" أو "هناك مشكلة في استقبال الرقم" إذا الرسالة تحتوي على 8 أرقام أو أكثر.
- ممنوع تكرار طلب الرقم بعد ما أعطاك العميل رسالة فيها 8 أرقام.
- ممنوع طلب نمط معين (مثل "بدون مسافات" أو "ابدأ بـ 07").

👤 الاسم: أي حرف أو كلمة يكتبها العميل = الاسم. اقبله.
🏙️ المدينة والمنطقة: أي نص يكتبه العميل = العنوان. اقبله.

⚠️ قاعدة استخدام التاريخ: لا تستخدم بيانات من طلب قديم. اطلب البيانات من جديد لكل طلب جديد، لكن اقبل ما يعطيك العميل في الطلب الحالي من أول مرة.

لو ناقص أي شيء، اسأل عنه بأدب ولا تفعل أي شيء آخر. لا تُسجّل أي طلب الآن. لا تُصدر الوسم [ORDER_READY] الآن.

🅱️ المرحلة B — معاينة الفاتورة (بعد جمع كل شيء، وقبل التسجيل):
ردّك التالي يجب أن يكون فاتورة منسّقة بالقيم الحقيقية التي أعطاها العميل، بهذا الشكل:

الفاتورة:
- المنتج: (اسم المنتج الفعلي) × (الكمية) = (السعر × الكمية)
الإجمالي: (المجموع الفعلي بالأرقام)

بياناتك:
- الاسم: (الاسم الذي كتبه العميل)
- الهاتف: (الرقم الذي كتبه العميل — أرقام فقط)
- العنوان: (المدينة - المنطقة كما كتبها)

هل أؤكد الطلب؟ ✅

⚠️ ممنوع منعاً باتاً كتابة أي قيمة كـ {customer_phone} أو [phone] أو ... أو أي قالب. اكتب القيمة الحقيقية حرفياً كما أعطاها العميل في الرسائل أعلاه.
في هذه المرحلة لا تُصدر الوسم [ORDER_READY] بعد. انتظر تأكيد العميل النهائي.

🅾️ المرحلة C — التسجيل النهائي:
إذا ردّ العميل بإيجاب صريح ("نعم"، "تم"، "أكد"، "ok"، "yes"، "أكد الطلب")، عندها فقط:
1) يجب أن يبدأ ردّك بالوسم التالي حرفياً بدون أي نص قبله. استبدل القيم بين علامتي التنصيص بالقيم الحقيقية التي كتبها العميل (وليس بقوالب أو placeholders):

مثال (إذا كان اسم العميل "محمد" ورقمه "0791234567" والعنوان "عمّان - الدوار السابع" ومنتج "خدمة الرد الذكي" بسعر 40):
[ORDER_READY]{"customer_name":"محمد","customer_phone":"0791234567","customer_city":"عمّان","customer_area":"الدوار السابع","products":[{"name":"خدمة الرد الذكي","quantity":1,"price":40}],"total_amount":40}[/ORDER_READY]

⛔ ممنوع تماماً استخدام القيم الحرفية التالية كـ phone أو name أو city أو area:
   - "..."
   - "[phone]" أو "[name]" أو "[customer_phone]"
   - "{customer_phone}" أو "{phone}"
   - "phone" أو "name" كنص خام
أي طلب يحتوي على أي من هذه القيم سيُرفض ولن يُسجَّل، وسيتم تنبيه الإدارة. استخدم القيمة الحقيقية التي قالها العميل حرفياً.

2) بعد الوسم مباشرةً (في نفس الرد) أضف: "تم تسجيل طلبك بنجاح. سنتواصل معك للتأكيد قريباً 🌹"

⚠️ لا تكرّر الوسم ولا تُصدره مرة ثانية في نفس المحادثة بعد التسجيل.
⚠️ لا تخترع منتجات أو أسعار غير موجودة في قائمة المنتجات أدناه.
⚠️ إذا قال العميل "لا" أو غيّر الطلب في المرحلة B، عُد للمرحلة A وعدّل البيانات.

مثال مصغّر يوضّح الفرق:
العميل: "بدي اطلب الخدمة"
أنت: "أهلاً بك 🌹 طيب لو سمحت، ما اسمك الكريم؟"
العميل: "أحمد"
أنت: "تشرّفت أحمد. ما رقم هاتفك للتواصل والتوصيل؟"
... وهكذا حتى تكتمل كل البيانات، ثم اعرض الفاتورة، ثم انتظر "نعم" قبل إصدار الوسم.
`;

/**
 * Strip phone/data-validation rules from user-saved system prompts.
 * Old prompts (generated via SalesAgent wizard) contained "validate phone" rules
 * that override our ORDER_CONTRACT and cause AI to reject valid phones.
 * Sanitization runs every request so old saved prompts are neutralized transparently.
 */
function sanitizePersona(text: string): string {
  if (!text) return text;
  // Match any line that mentions validation/format/correctness near phone/data keywords
  const badLinePattern = /^.*(تحقّق|تحقق|تحقّقي|تأكد|تأكّد|صحة|صحّة|صحيح|منطقي|صيغة|تنسيق|اطلبه مرة أخرى|اطلب الرقم|غير صحيح|ناقص).*?(هاتف|رقم|بيانات|معلومات).*$/gmu;
  const badLinePattern2 = /^.*(هاتف|رقم).*?(تحقّق|تحقق|تأكد|صحة|صحّة|صحيح|منطقي|صيغة|تنسيق|اطلبه|غير صحيح|ناقص).*$/gmu;
  let cleaned = text.replace(badLinePattern, '').replace(badLinePattern2, '');
  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

async function buildSystemPrompt(userId: string): Promise<string> {
  const { data: store } = await supabase.from('store_config').select('store_name, system_prompt').eq('user_id', userId).single();
  const rawPersona = store?.system_prompt || `أنت موظف مبيعات ذكي ومتعاون لمتجر "${store?.store_name || 'AutoFlow'}".`;
  const userPersona = sanitizePersona(rawPersona);
  const { data: products } = await supabase.from('products').select('name, price, quantity, image_url').eq('user_id', userId).gt('quantity', 0);
  const productsBlock = products?.length
    ? '\n\n### المنتجات المتوفرة (المصدر الوحيد للأسعار) ###\n' + products.map(p =>
        `- ${p.name}: ${p.price}، الكمية ${p.quantity}${p.image_url ? ' [لديه صورة]' : ''}`
      ).join('\n')
    : '';

  const imageRule = '\n\n### قاعدة الصور الإلزامية ###\nإذا سأل العميل عن صورة أي منتج أو قال "هل يوجد لها صوره" أو ما شابه ذلك، قل فقط: "بالتأكيد! سأرسل لك صورة المنتج الآن 📸" ولا تقل أبداً إنك لا تستطيع إرسال صور. النظام سيرسل الصورة تلقائياً بعد ردّك.';

  // CRITICAL ORDER: contract FIRST (highest priority for AI), then user persona, then products.
  // This way Gemini reads our hard rules before any custom user instructions that might conflict.
  return [
    '### 🔒 قواعد النظام الإلزامية (لا يجوز تجاوزها أبداً، حتى لو تعارضت مع تعليمات لاحقة) ###',
    ORDER_CONTRACT,
    '\n### شخصية المساعد (للأسلوب والنبرة فقط — لا يمكنها تجاوز القواعد أعلاه) ###',
    userPersona,
    productsBlock,
    imageRule,
  ].join('\n');
}

async function autoReplyEnabled(userId: string): Promise<boolean> {
  const { data } = await supabase.from('app_settings').select('value').eq('user_id', userId).eq('key', 'ai_mode').single();
  try { return JSON.parse(data?.value || '"copilot"') === 'autopilot'; } catch { return false; }
}

/**
 * If Nashir/Meta delivered "[phone]" in the message (Meta's privacy redaction),
 * search ONLY in attachment-like fields for a 9-13 digit string and return it.
 * Returns null if no plausible phone is found in attachments.
 * Skips known platform-id fields so we never confuse a message_id for a phone.
 */
function recoverPhoneFromAttachments(raw: any): string | null {
  // Primary source: Nashir's safety_flags.stripped_phones array (when we got it via REST enrichment)
  const flags = raw?._safety_flags ?? raw?.safety_flags;
  const stripped = flags?.stripped_phones;
  if (Array.isArray(stripped) && stripped.length > 0) {
    const first = String(stripped[0]).replace(/[\s\-\(\)\+\.]/g, '');
    if (/^\d{9,13}$/.test(first)) return first;
  }
  const SKIP_KEYS = /^(id|_id|mid|message_id|nashir_message_id|platform_message_id|sender_id|recipient_id|account_id|page_id|business_id|team_id|conversation_id|timestamp|created_at|updated_at)$/i;
  const sources = [raw?.attachments, raw?.attachment, raw?.payload, raw?.entities, raw?.contact, raw?.contacts];
  for (const src of sources) {
    if (src == null) continue;
    try {
      const stack: any[] = [src];
      while (stack.length) {
        const node = stack.pop();
        if (node == null) continue;
        if (typeof node === 'string') {
          const cleaned = node.replace(/[\s\-\(\)\+\.]/g, '');
          if (/^\d{9,13}$/.test(cleaned)) return cleaned;
          continue;
        }
        if (typeof node === 'number') continue; // raw numbers in attachments are usually IDs
        if (Array.isArray(node)) { for (const v of node) stack.push(v); continue; }
        if (typeof node === 'object') {
          for (const k of Object.keys(node)) {
            if (SKIP_KEYS.test(k)) continue;
            stack.push((node as any)[k]);
          }
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Normalize Nashir's webhook payload.
 * Default: NO transformations — raw passthrough.
 * Exception: if Meta inserted a "[phone]" placeholder AND we can find the real digits
 *            in attachments, replace [phone] with the digits so the user sees the
 *            phone they actually typed. If digits cannot be recovered, leave [phone]
 *            as-is (transparent — user can see Meta hid it).
 */
/**
 * Summarize any attachments inline so the dashboard shows SOMETHING when Nashir
 * delivers a non-text DM (image / video / sticker / audio / file / contact card).
 * Returns text like "[صورة: https://...] [ستيكر #12345]" — empty if no attachments.
 */
function summarizeAttachments(raw: any): string {
  const parts: string[] = [];
  const att = raw?.attachments ?? raw?.attachment ?? raw?.payload;
  const arr = Array.isArray(att) ? att : att ? [att] : [];
  for (const a of arr) {
    if (a == null) continue;
    if (typeof a === 'string') { parts.push(`[مرفق: ${a}]`); continue; }
    if (typeof a !== 'object') continue;
    const type = String(a.type || a.kind || a.mime || a.media_type || 'مرفق').toLowerCase();
    const url = a.url || a.media_url || a.payload?.url || a.file_url || a.image_url || '';
    const label = ({ image: 'صورة', video: 'فيديو', audio: 'صوت', voice: 'تسجيل صوتي', sticker: 'ستيكر', file: 'ملف', document: 'مستند', location: 'موقع', contact: 'جهة اتصال' } as any)[type] || type;
    parts.push(url ? `[${label}: ${url}]` : `[${label}]`);
  }
  if (raw?.sticker_id) parts.push(`[ستيكر #${raw.sticker_id}]`);
  if (raw?.location) parts.push(`[موقع جغرافي]`);
  return parts.join(' ');
}

function normalize(raw: any) {
  const base = String(raw.platform || raw.channel || 'facebook').toLowerCase().replace('_dm', '').replace('_comment', '');
  const mtype = String(raw.message_type || raw.type || 'dm').toLowerCase();
  const isComment = mtype === 'comment';
  const rawContent = String(raw.message ?? raw.text ?? raw.message_text ?? raw.body ?? raw.content ?? '');
  let content = rawContent;
  if (/\[(phone|tel|mobile|number|phone_number)\]/i.test(rawContent)) {
    const recovered = recoverPhoneFromAttachments(raw);
    if (recovered) {
      content = rawContent.replace(/\[(phone|tel|mobile|number|phone_number)\]/gi, recovered);
      console.log(`[normalize] recovered phone from attachments: ${recovered}`);
    }
  }
  // If text is empty but there are attachments (image/video/sticker/...) make sure
  // SOMETHING shows in the dashboard so the user sees the message arrived.
  if (!content.trim()) {
    const att = summarizeAttachments(raw);
    if (att) content = att;
  }
  return {
    replyId: raw.nashir_message_id ?? raw.id ?? raw.message_id,
    dedupKey: String(raw.platform_message_id ?? raw.nashir_message_id ?? raw.id ?? `gen_${Date.now()}`),
    base,
    isComment,
    platform: base,
    senderId: String(raw.sender_id ?? raw.from ?? raw.senderId ?? ''),
    senderName: String(raw.sender_name ?? raw.senderName ?? raw.name ?? 'عميل'),
    content,
    pageId: raw.page_id ?? raw.pageId ?? null,
  };
}

/**
 * Server-side phone extractor: looks for a real phone (9-13 digits) in:
 * 1. The plain text content (no risk of catching IDs)
 * 2. Raw payload fields whose key names match phone-related patterns (safe walker,
 *    skips message_id, page_id, sender_id, timestamps, etc.)
 * Refuses anything outside 9-13 digits — that's the range of real phone numbers worldwide.
 * Anything else is almost certainly a platform internal ID.
 */
/** Convert Arabic-Indic digits (٠-٩) and Arabic spelled words to Latin digits. */
function normalizeDigitsToLatin(text: string): string {
  if (!text) return text;
  let out = text;
  // Arabic-Indic ٠-٩
  out = out.replace(/[٠-٩]/g, ch => String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)));
  // Extended Arabic-Indic ۰-۹ (Persian)
  out = out.replace(/[۰-۹]/g, ch => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));
  // Arabic words for digits
  const wordToDigit: Record<string, string> = {
    'صفر': '0', 'سفر': '0',
    'واحد': '1', 'واحدة': '1', 'احد': '1',
    'اثنين': '2', 'إثنين': '2', 'اثنان': '2', 'ثنين': '2',
    'ثلاثة': '3', 'ثلاث': '3', 'تلاتة': '3', 'تلاث': '3',
    'اربعة': '4', 'أربعة': '4', 'اربع': '4', 'أربع': '4',
    'خمسة': '5', 'خمس': '5',
    'ستة': '6', 'ست': '6',
    'سبعة': '7', 'سبع': '7',
    'ثمانية': '8', 'ثمانة': '8', 'تمانية': '8', 'تمان': '8',
    'تسعة': '9', 'تسع': '9',
  };
  for (const [word, digit] of Object.entries(wordToDigit)) {
    out = out.replace(new RegExp(`(?<![\\u0600-\\u06FF])${word}(?![\\u0600-\\u06FF])`, 'g'), digit);
  }
  return out;
}

/**
 * Extract a real phone (9-13 digits) from the customer's text only.
 * Used to populate phoneNote so AI knows the phone when it's clearly present.
 * Never mutates item.content — just reads it.
 */
function extractPhoneFromMessage(text: string): string | null {
  if (!text) return null;
  const normalized = normalizeDigitsToLatin(text);
  const digitsOnly = normalized.replace(/\D/g, '');
  const m = digitsOnly.match(/\d{9,13}/);
  return (m && m[0].length >= 9 && m[0].length <= 13) ? m[0] : null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/~~(.*?)~~/gs, '$1')
    .replace(/`(.*?)`/gs, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

async function maybeExtractAndSaveOrder(
  reply: string, userId: string, convId: number, platform: string, senderName: string
): Promise<string> {
  console.log('[inbound raw reply]', reply.slice(0, 600));
  const match = reply.match(/\[ORDER_READY\]\s*([\s\S]*?)\s*\[\/ORDER_READY\]/);
  if (!match) return reply;

  // Defense in depth: even if the AI emits ORDER_READY multiple times in the same
  // conversation, we only save one order per (conversation, 10-minute window).
  // The tag is still stripped from the customer-visible reply.
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOrder } = await supabase.from('orders')
      .select('id, order_number')
      .eq('user_id', userId).eq('conversation_id', convId)
      .gte('created_at', cutoff)
      .limit(1).maybeSingle();
    if (recentOrder) {
      console.log(`[inbound] duplicate ORDER_READY suppressed (existing order ${recentOrder.order_number} for conv ${convId})`);
      return reply.replace(/\[ORDER_READY\][\s\S]*?\[\/ORDER_READY\]/g, '').trim();
    }
  } catch (e: any) { console.error('[inbound dedup check]', e?.message || e); }

  try {
    const rawJson = match[1].trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const orderData = JSON.parse(rawJson);

    // Reject placeholder values (AI sometimes emits template syntax instead of real data)
    const isPlaceholder = (v: any): boolean => {
      if (!v) return true;
      const s = String(v).trim();
      if (!s) return true;
      if (s === '...' || s === '…') return true;
      // [phone], [name], {customer_phone}, etc.
      if (/^[\[\{\(].*?[\]\}\)]$/.test(s)) return true;
      // bare template words
      if (/^(phone|customer_phone|name|customer_name|city|customer_city|area|customer_area|address)$/i.test(s)) return true;
      return false;
    };
    // Phone-specific check: a real phone has at least 7 digits anywhere in the string.
    // This catches our "📱(رقم)" marker, "[phone]", and any non-digit text.
    const isInvalidPhone = (v: any): boolean => {
      if (isPlaceholder(v)) return true;
      const digitCount = (String(v).match(/\d/g) || []).length;
      return digitCount < 7;
    };
    if (isInvalidPhone(orderData.customer_phone) || isPlaceholder(orderData.customer_name)) {
      console.error('[inbound order REJECTED — placeholder values detected]', JSON.stringify(orderData));
      // Notify admin so they can manually take over
      createNotification(
        userId, 'complaint',
        `⚠️ فشل تسجيل طلب — الذكاء أرسل قالباً فارغاً`,
        `العميل: ${senderName}\nالمنصة: ${platform}\n\nالذكاء حاول تسجيل طلب بقيم placeholder بدل القيم الحقيقية:\n${JSON.stringify(orderData, null, 2).slice(0, 500)}\n\nيرجى التواصل مع العميل يدوياً لإكمال الطلب.`,
        convId, { rejected: true, raw: orderData }
      ).catch(() => {});
      // Pause AI on this conversation so admin can take over
      await supabase.from('conversations')
        .update({ ai_paused_until: new Date(Date.now() + 2 * 3600 * 1000).toISOString() })
        .eq('id', convId);
      // Strip the bad tag from reply
      return reply.replace(/\[ORDER_READY\][\s\S]*?\[\/ORDER_READY\]/g, '').trim()
        + '\n\nسأقوم بمراجعة طلبك مع الفريق وسنعود إليك قريباً.';
    }

    const products = orderData.products || [];
    const total = orderData.total_amount
      || products.reduce((s: number, p: any) => s + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0);
    const orderNum = 'ORD-' + Date.now();
    await supabase.from('orders').insert({
      user_id: userId,
      order_number: orderNum,
      customer_name: orderData.customer_name || senderName,
      customer_phone: orderData.customer_phone || '',
      customer_city: orderData.customer_city || '',
      customer_area: orderData.customer_area || '',
      customer_notes: orderData.notes || '',
      products_json: JSON.stringify(products),
      total_amount: total,
      platform,
      conversation_id: convId,
      status: 'new',
    });
    console.log(`[inbound] order saved: ${orderNum} for conv ${convId}`);

    // Push a notification (DB + Telegram bot if configured).
    const productLines = products.map((p: any) => `• ${p.name} × ${p.quantity}`).join('\n');
    createNotification(
      userId, 'order',
      `طلب جديد #${orderNum}`,
      `العميل: ${orderData.customer_name || senderName}\nالهاتف: ${orderData.customer_phone || '—'}\nالمدينة: ${orderData.customer_city || ''} ${orderData.customer_area || ''}\nالإجمالي: ${total}\n${productLines}`,
      convId,
      { order_number: orderNum, total },
    ).catch(() => {});
  } catch (e: any) {
    console.error('[inbound order parse ERROR]', e?.message || e, '| raw JSON:', match[1].slice(0, 300));
  }

  // Strip the tag block from the reply sent to the customer
  return reply.replace(/\[ORDER_READY\][\s\S]*?\[\/ORDER_READY\]/g, '').trim();
}

/** Mark conversation as AI-paused for N hours. */
async function pauseConversationAI(convId: number, hours: number) {
  const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  await supabase.from('conversations').update({ ai_paused_until: until }).eq('id', convId);
}

/** Is AI currently paused for this conversation? */
function isAIPaused(conv: any): boolean {
  if (!conv?.ai_paused_until) return false;
  return new Date(conv.ai_paused_until) > new Date();
}

/**
 * Compress old messages into a summary and store it on the conversation.
 * Called in background when history exceeds COMPRESS_THRESHOLD.
 */
async function maybeCompressHistory(convId: number, userId: string, config: any) {
  const COMPRESS_THRESHOLD = 20; // compress after 20 messages total
  const KEEP_RECENT = 10;        // keep last 10 as live context

  // Count total messages in this conversation
  const { count } = await supabase.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', convId);

  if ((count || 0) < COMPRESS_THRESHOLD) return;

  // Fetch messages to compress (everything except the last KEEP_RECENT)
  const { data: allMsgs } = await supabase.from('messages')
    .select('sender, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(count! - KEEP_RECENT);

  if (!allMsgs?.length) return;

  // Also get existing summary to fold into
  const { data: conv } = await supabase.from('conversations')
    .select('context_summary').eq('id', convId).single();

  const prevSummary = conv?.context_summary || '';
  const transcript = allMsgs
    .filter((m: any) => m.content)
    .map((m: any) => `${m.sender === 'customer' ? 'عميل' : 'مساعد'}: ${m.content}`)
    .join('\n');

  const summaryPrompt = prevSummary
    ? `لديك ملخص سابق للمحادثة:\n${prevSummary}\n\nوهذه رسائل إضافية:\n${transcript}\n\nأنشئ ملخصاً موحداً ومحدثاً بالعربية (أقل من 300 كلمة) يحتفظ بالمعلومات الجوهرية: اسم العميل، رقم الهاتف، العنوان، الطلبات، والقرارات المهمة. تجاهل التحيات والكلام العام.`
    : `لديك محادثة بين عميل ومساعد:\n${transcript}\n\nأنشئ ملخصاً بالعربية (أقل من 300 كلمة) يحتفظ بالمعلومات الجوهرية: اسم العميل، رقم الهاتف، العنوان، الطلبات، والقرارات المهمة. تجاهل التحيات والكلام العام.`;

  try {
    const summary = await sendToAI(config, [
      { role: 'user', content: summaryPrompt },
    ]);
    if (summary) {
      await supabase.from('conversations')
        .update({ context_summary: summary })
        .eq('id', convId);
      console.log(`[inbound] compressed history for conv ${convId} (${count} msgs → summary)`);
    }
  } catch (e: any) {
    console.error('[inbound compress]', e?.message || e);
  }
}

/** Process one inbound item: store it, get AI reply, and SEND it back via Nashir REST. Returns the reply text. */
export async function processInbound(userId: string, raw: any): Promise<string> {
  // Nashir webhook redacts phones/emails to "[phone]"/"[email]" for safety. The REST
  // list endpoint returns the ORIGINAL un-redacted message AND a safety_flags object
  // with arrays of what was stripped. When we see a redaction in the webhook, fetch
  // the full record and substitute the real values.
  const rawTextPeek = String(raw.message ?? raw.text ?? raw.body ?? '');
  if (/\[(phone|tel|mobile|number|phone_number|email|address)\]/i.test(rawTextPeek)) {
    const msgId = raw.nashir_message_id ?? raw.id ?? raw.message_id;
    if (msgId) {
      try {
        const key = await nashirKey(userId);
        if (key) {
          const full = await nashir.getMessage(key, msgId);
          if (full && typeof full === 'object') {
            // Use the un-redacted message text directly when available — this is the
            // exact text Nashir stored from Meta (e.g. "0770748793" instead of "[phone]").
            const realMsg = (full as any).message;
            if (typeof realMsg === 'string' && realMsg.length > 0) {
              raw = { ...raw, message: realMsg, _safety_flags: (full as any).safety_flags };
              console.log(`[inbound] un-redacted message via Nashir REST: ${realMsg.slice(0, 100)}`);
            } else {
              raw = { ...raw, ...full };
              console.log(`[inbound] enriched payload via Nashir getMessage(${msgId})`);
            }
          }
        }
      } catch (e: any) {
        console.warn('[inbound] enrich getMessage failed:', e?.message || e);
      }
    }
  }

  const item = normalize(raw);
  // Always log the raw payload (truncated). Lets the user verify in Railway logs
  // exactly what Nashir is delivering — no guessing.
  console.log('[inbound raw]', JSON.stringify({
    platform: raw.platform, message_type: raw.message_type,
    sender_name: raw.sender_name, sender_id: raw.sender_id,
    message: raw.message, text: raw.text, body: raw.body, content: raw.content,
    attachments: raw.attachments, attachment: raw.attachment, payload: raw.payload,
    full_keys: Object.keys(raw || {}),
  }).slice(0, 1000));
  if (!item.content) { console.warn('[inbound] no content:', JSON.stringify(raw).slice(0, 400)); return ''; }

  // Comments take a separate code path: comment_automations + AI comment reply + auto-delete bad.
  if (item.isComment) {
    try { await processInboundComment(userId, raw); } catch (e: any) { console.error('[inbound comment]', e?.message || e); }
    return '';
  }

  const { data: exists } = await supabase.from('messages').select('id').eq('user_id', userId).eq('nashir_message_id', item.dedupKey).single();

  let conv: any;
  const found = await supabase.from('conversations').select('*')
    .eq('user_id', userId).eq('sender_id', item.senderId).eq('platform', item.platform).single();
  conv = found.data;
  if (!conv) {
    const created = await supabase.from('conversations').insert({
      user_id: userId, platform: item.platform, sender_id: item.senderId, sender_name: item.senderName,
      nashir_account_id: item.pageId, last_message: item.content, last_message_at: new Date().toISOString(), status: 'new',
    }).select().single();
    conv = created.data;
  } else {
    await supabase.from('conversations').update({ last_message: item.content, last_message_at: new Date().toISOString() }).eq('id', conv.id);
  }

  // ---- Complaint detection (runs BEFORE AI to short-circuit) ----
  if (looksLikeComplaint(item.content) && !isAIPaused(conv)) {
    // Insert the customer's message
    if (!exists) {
      await supabase.from('messages').insert({
        user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
        nashir_reply_id: item.replyId ? String(item.replyId) : null,
        sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: COMPLAINT_REPLY,
        raw_payload: raw,
      });
    }
    // Pause AI for 2h on this conv
    await pauseConversationAI(conv!.id, PAUSE_HOURS_COMPLAINT);
    // Create complaint notification (DB + telegram)
    createNotification(
      userId, 'complaint',
      `شكوى من ${item.senderName}`,
      `العميل: ${item.senderName}\nالمنصة: ${item.platform}\nالرسالة:\n"${item.content.slice(0, 300)}"\n\nتم إيقاف الرد الذكي لمدة ${PAUSE_HOURS_COMPLAINT} ساعة على هذه المحادثة.`,
      conv!.id,
      { sender_id: item.senderId, message: item.content },
    ).catch(() => {});

    // Send the canned reply via Nashir if auto-reply is on and we have a replyId
    if (item.replyId && await autoReplyEnabled(userId)) {
      const key = await nashirKey(userId);
      if (key) {
        try {
          if (item.isComment) await nashir.replyComment(key, item.replyId, COMPLAINT_REPLY);
          else await nashir.replyMessage(key, item.replyId, COMPLAINT_REPLY);
          await supabase.from('messages').insert({
            user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: COMPLAINT_REPLY, message_type: 'text',
          });
        } catch (e: any) { console.error('[inbound complaint reply]', e?.message || e); }
      }
    }
    emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });
    emit(userId, 'notification', { type: 'complaint' });
    return COMPLAINT_REPLY;
  }

  // ---- AI pause check: skip AI if conversation is paused (manual takeover or complaint) ----
  if (isAIPaused(conv)) {
    if (!exists) {
      await supabase.from('messages').insert({
        user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
        nashir_reply_id: item.replyId ? String(item.replyId) : null,
        sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm',
        raw_payload: raw,
      });
    }
    emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });
    return '';
  }

  let reply = '';
  try {
    const config = await resolveConfig(userId);
    const system = await buildSystemPrompt(userId);

    // Build context: use compressed summary (if any) + recent live messages.
    // When phone was just detected, use a SMALLER window — this reduces Gemini's bias
    // from prior rejection messages in the conversation history.
    const detectedPhonePeek = extractPhoneFromMessage(item.content);
    const LIVE_WINDOW = detectedPhonePeek ? 4 : 10;
    const { data: recentMsgs } = await supabase.from('messages')
      .select('sender, content')
      .eq('conversation_id', conv!.id)
      .order('created_at', { ascending: false })
      .limit(LIVE_WINDOW);

    // Reverse so oldest-first for the AI; also filter out our own past rejection messages
    // so they don't keep biasing Gemini toward more rejections.
    const REJECTION_FILTER = /الرجاء تزويدي برقم|هاتفك الفعلي|هاتفك الصحيح|رقم هاتف صحيح|مشكلة في استقبال|07xxxxxxxx|أحتاج رقم هاتف/;
    const liveMsgs = (recentMsgs || []).reverse()
      .filter((m: any) => m.content)
      .filter((m: any) => !(detectedPhonePeek && m.sender === 'assistant' && REJECTION_FILTER.test(m.content)))
      .map((m: any) => ({ role: m.sender === 'customer' ? 'user' : 'assistant', content: m.content }));

    // Prepend compressed summary as a system note if it exists
    const summaryNote = conv!.context_summary
      ? `\n\n[ملخص المحادثة السابقة مع هذا العميل:\n${conv!.context_summary}\n]`
      : '';

    // Prevent the AI from re-emitting ORDER_READY for the SAME order within a short window
    // (guards against the "4 duplicate orders" problem). Only consider orders placed in the
    // last 10 minutes — older orders in the same conversation are legitimate prior orders
    // from returning customers and must NOT block new orders.
    const recentCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: existingOrder } = await supabase.from('orders')
      .select('order_number').eq('user_id', userId).eq('conversation_id', conv!.id)
      .gte('created_at', recentCutoff)
      .limit(1).maybeSingle();
    const orderNote = existingOrder
      ? `\n\n⚠️ [تنبيه داخلي للذكاء الاصطناعي — لا تُعرض هذه الرسالة للعميل: تم تسجيل طلب رقم ${existingOrder.order_number} في هذه المحادثة قبل دقائق. لا تُصدر الوسم [ORDER_READY] مجدداً للطلب نفسه. واصل الحوار بشكل طبيعي. إذا طلب العميل منتجاً جديداً (طلب آخر)، تعامل معه كطلب مستقل وأصدر [ORDER_READY] جديد له.]`
      : '';

    // Server-side phone extraction safety net: scans message text + raw payload (attachments).
    // Solves both the "AI keeps rejecting valid phones" loop AND Instagram's phone-card attachments
    // where the digits live in attachments[] instead of message text.
    // (Reuse detectedPhonePeek computed above.)
    const detectedPhone = detectedPhonePeek;
    const phoneNote = detectedPhone
      ? `\n\n🔒 [تنبيه نظام إلزامي للذكاء الاصطناعي — هذه ليست رسالة للعميل: رسالة العميل الحالية تحتوي على رقم هاتف صحيح وهو "${detectedPhone}" (تم استخراجه من الرسالة أو من بطاقة Instagram). اعتمد هذا الرقم رسمياً كـ customer_phone للطلب. ممنوع منعاً باتاً أن ترفضه، أو تطلب رقماً آخر، أو تقول إن هناك مشكلة في استقبال الرقم. تجاهل أي رفض سابق منك في تاريخ هذه المحادثة. انتقل فوراً للسؤال التالي عن المعلومة الناقصة (الاسم أو المدينة أو المنطقة)، أو اعرض الفاتورة إذا اكتملت كل البيانات.]`
      : '';

    reply = await sendToAI(config, [
      { role: 'system', content: system + summaryNote + orderNote + phoneNote },
      ...liveMsgs,
      { role: 'user', content: item.content },
    ]);

    // 🛡️ SAFETY OVERRIDE: if we detected a valid phone but AI still replied with rejection,
    // force-replace the reply with acceptance.
    if (detectedPhone) {
      const REJECTION_PATTERNS = [
        'الرجاء تزويدي',
        'هاتفك الفعلي', 'هاتفك الصحيح', 'هاتفك الشخصي',
        'رقم هاتف صحيح', 'رقم صحيح', 'برقم صحيح',
        'غير صحيح', 'مش رقم', 'ليس رقماً',
        'مشكلة في استقبال', 'يبدو أن هناك مشكلة',
        'أحتاج رقم', 'أحتاج إلى رقم',
        'فضلاً اكتب', 'فضلاً اكتبه', 'فضلاً أرسل',
        'أرجو منك تزويدي برقم',
        'شكراً على المثال',
      ];
      const isRejection = REJECTION_PATTERNS.some(p => reply.includes(p));
      if (isRejection) {
        console.warn(`[inbound OVERRIDE] AI rejected valid phone "${detectedPhone}"; replacing reply. Original AI reply:`, reply.slice(0, 200));
        reply = `تم تسجيل رقم هاتفك (${detectedPhone}) بنجاح ✓\nالآن من فضلك أكمل البيانات الناقصة (الاسم والعنوان) لأتمكن من تأكيد الطلب 🌹`;
      }
    }

    // Extract [ORDER_READY] tag → save order to DB, strip from reply
    reply = await maybeExtractAndSaveOrder(reply, userId, conv!.id, item.platform, item.senderName);

    // Strip any remaining markdown symbols (safety net)
    reply = stripMarkdown(reply);

    // Trigger background compression once history grows large (fire-and-forget, don't block reply)
    maybeCompressHistory(conv!.id, userId, config).catch(() => {});
  } catch (e: any) {
    console.error('[inbound AI ERROR]', e?.response?.status, JSON.stringify(e?.response?.data || e?.message).slice(0, 500), 'stack:', e?.stack?.slice(0, 300));
  }

  if (!exists) {
    await supabase.from('messages').insert({
      user_id: userId, conversation_id: conv!.id, nashir_message_id: item.dedupKey,
      nashir_reply_id: item.replyId ? String(item.replyId) : null,
      sender: 'customer', content: item.content, message_type: item.isComment ? 'comment' : 'dm', ai_suggestion: reply,
      raw_payload: raw,
    });
  }
  emit(userId, `${item.base}:message`, { convId: conv!.id, platform: item.platform });

  // Auto-send the reply to the platform via Nashir REST (the actual delivery path).
  if (reply && item.replyId && await autoReplyEnabled(userId)) {
    const key = await nashirKey(userId);
    if (key) {
      try {
        // Omit pageId — Nashir resolves the correct page from the message itself.
        // (Passing the IG id makes Nashir look for a FB account with that id and fail.)
        if (item.isComment) await nashir.replyComment(key, item.replyId, reply);
        else await nashir.replyMessage(key, item.replyId, reply);
        await supabase.from('messages').insert({
          user_id: userId, conversation_id: conv!.id, sender: 'assistant', content: reply, message_type: 'text',
        });
        await supabase.from('conversations').update({ last_message: reply, last_message_at: new Date().toISOString() }).eq('id', conv!.id);
        console.log(`[inbound] replied via Nashir REST to ${item.platform} msg ${item.replyId}`);
        // Send product image cards if customer asked for image or AI mentioned a product
        if (!item.isComment) {
          maybeSendProductCards(key, item.replyId, item.content, reply, userId).catch(() => {});
        }
      } catch (e: any) {
        console.error('[inbound reply REST]', e?.response?.status, JSON.stringify(e?.response?.data || e?.message).slice(0, 300));
      }
    }
  }
  return reply;
}

/** Build a short, clean caption (NO markdown — Meta renders * and _ literally). */
function buildProductCaption(p: { name: string; price?: any; notes?: string }): string {
  const lines = [p.name];
  if (p.price != null && p.price !== '') lines.push(`السعر: ${p.price}`);
  if (p.notes) lines.push(p.notes);
  return lines.join('\n');
}

/**
 * Resolve a product image to a public HTTPS URL Meta can fetch.
 * Product images are stored as base64 data URLs in the DB; Meta cannot fetch those,
 * so we upload to Nashir once and cache the returned public URL back on the product row.
 */
async function resolvePublicImageUrl(
  key: string, productId: number | string, imageUrl: string, userId: string,
): Promise<string | null> {
  if (!imageUrl) return null;
  if (!imageUrl.startsWith('data:')) return imageUrl; // already a public URL
  const publicUrl = await nashir.uploadImage(key, imageUrl);
  if (publicUrl) {
    // Cache so we never re-upload this product's image again.
    await supabase.from('products').update({ image_url: publicUrl })
      .eq('id', productId).eq('user_id', userId);
  }
  return publicUrl;
}

/** After sending the AI reply, detect mentioned products and send their images via Nashir. */
async function maybeSendProductCards(
  key: string, replyId: string | number,
  customerMsg: string, aiReply: string, userId: string,
): Promise<void> {
  try {
    const IMAGE_KEYWORDS = ['صورة', 'صوره', 'صور', 'صورته', 'صورتها', 'شكله', 'شكلها', 'photo', 'image', 'picture'];
    const askedForImage = IMAGE_KEYWORDS.some(k => customerMsg.includes(k));
    if (!askedForImage && !aiReply.includes('صورة') && !aiReply.includes('صوره')) return;

    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, notes, image_url')
      .eq('user_id', userId)
      .gt('quantity', 0);
    if (!products?.length) return;

    const searchText = customerMsg + ' ' + aiReply;

    // منتجات ذُكرت صراحةً ولها صورة
    let toSend = (products as any[]).filter(p =>
      p.name && p.image_url && searchText.includes(p.name),
    );

    // إن لم يُذكر منتج بالاسم لكن الزبون طلب صورة — ابعث المنتجات التي عندها صورة
    if (!toSend.length && askedForImage) {
      toSend = (products as any[]).filter(p => p.image_url);
    }

    for (const product of toSend.slice(0, 2)) {
      const publicUrl = await resolvePublicImageUrl(key, product.id, product.image_url, userId);
      await new Promise(r => setTimeout(r, 500));
      if (publicUrl) {
        // النص + الصورة في رسالة واحدة (الصورة كمرفق حقيقي)
        await nashir.replyMessage(key, replyId, buildProductCaption(product), undefined, publicUrl);
      } else {
        // فشل الرفع — أرسل النص فقط
        await nashir.replyMessage(key, replyId, buildProductCaption(product));
      }
    }
  } catch (e: any) {
    console.error('[product card]', e?.message);
  }
}

/** Handle a Nashir webhook payload; also returns the reply (in case Nashir uses the response). */
export async function handleNashirWebhook(userId: string, body: any): Promise<{ reply: string; replies: string[] }> {
  console.log('[nashir webhook] payload:', JSON.stringify(body).slice(0, 800));
  const items = Array.isArray(body) ? body
    : Array.isArray(body?.data) ? body.data
    : Array.isArray(body?.messages) ? body.messages
    : [body];
  const replies: string[] = [];
  for (const it of items) {
    try { const r = await processInbound(userId, it); if (r) replies.push(r); }
    catch (e: any) { console.error('[webhook item]', e?.message || e); }
  }
  return { reply: replies[0] || '', replies };
}
