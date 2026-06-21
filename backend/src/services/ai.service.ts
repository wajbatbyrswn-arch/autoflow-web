import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type AITag = 'price_inquiry' | 'order_request' | 'shipping_issue' | 'angry_customer' | 'other';

export interface AIResult {
  tag: AITag;
  reply: string;
}

export async function processMessage(
  customerMessage: string,
  storeName: string,
  storeDescription: string,
  products: Array<{ name: string; price: number | null; currency: string; stock_status: string; description: string | null }>,
  aiModel: string,
  customSystemPrompt?: string
): Promise<AIResult> {
  const productsList = products.map(p =>
    `- ${p.name}: ${p.price ? `${p.price} ${p.currency}` : 'السعر عند الطلب'} | ${p.stock_status === 'available' ? 'متوفر' : 'غير متوفر'}${p.description ? ` | ${p.description}` : ''}`
  ).join('\n');

  const systemPrompt = customSystemPrompt || `أنت وكيل خدمة عملاء لمتجر "${storeName}".
معلومات المتجر: ${storeDescription || 'لا توجد معلومات إضافية'}
المنتجات المتاحة:
${productsList || 'لا توجد منتجات مضافة حتى الآن'}

القواعد:
- رد بنفس لغة العميل (عربي أو إنجليزي)
- كن مختصراً (3 جمل كحد أقصى)
- إذا أراد العميل الشراء، أكد الطلب واطلب تفاصيل التوصيل
- صنّف الرسالة بدقة

أعد JSON فقط بالشكل: { "tag": "price_inquiry|order_request|shipping_issue|angry_customer|other", "reply": "الرد هنا" }`;

  const response = await anthropic.messages.create({
    model: aiModel || 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: customerMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]) as AIResult;
    return parsed;
  } catch {
    return { tag: 'other', reply: text };
  }
}
