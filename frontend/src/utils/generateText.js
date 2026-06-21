export async function generatePostText(productData, brandTheme, postSettings) {
  const dialectMap = {
    formal:    'اللغة العربية الفصحى البسيطة',
    jordanian: 'اللهجة الأردنية',
    saudi:     'اللهجة السعودية',
    egyptian:  'اللهجة المصرية',
    gulf:      'اللهجة الخليجية'
  };

  const toneMap = {
    exciting: 'حماسي ومقنع يدفع للشراء الفوري',
    elegant:  'راقٍ وفخم يعكس جودة المنتج',
    friendly: 'ودي وقريب كأنك تنصح صديقاً',
    urgent:   'عاجل يخلق إحساساً بضرورة الشراء الآن'
  };

  const prompt = `
أنت خبير تسويق رقمي. اكتب بوست ${postSettings.platform} باللغة التالية: ${dialectMap[brandTheme.dialect || 'formal']}.

المتجر: ${brandTheme.name || 'متجرنا'}
${brandTheme.brand_description ? `وصف المتجر: ${brandTheme.brand_description}` : ''}

المنتج:
- الاسم: ${productData.name}
- السعر: ${productData.price}${productData.originalPrice ? ` (السعر القديم: ${productData.originalPrice})` : ''}
- الوصف: ${productData.description}
${productData.features?.length ? `- مميزات: ${productData.features.join('، ')}` : ''}

النبرة المطلوبة: ${toneMap[postSettings.tone || 'exciting']}

اكتب البوست بهذه العناصر فقط:
${postSettings.includeHook ? '✓ جملة hook جاذبة تشد الانتباه في السطر الأول' : ''}
${postSettings.includeDescription ? '✓ وصف مقنع للمنتج يبرز الفوائد' : ''}
${postSettings.includePrice ? '✓ ذكر السعر بشكل واضح وجذاب' : ''}
${postSettings.includeScarcity ? '✓ عبارة توحي بمحدودية العرض أو الكمية' : ''}
${postSettings.includeSocialProof ? '✓ إضافة عبارة تدل على ثقة العملاء (مثال: الأكثر مبيعاً)' : ''}
${postSettings.includeQuestion ? '✓ سؤال تفاعلي في النهاية لزيادة التعليقات' : ''}
${postSettings.includeCTA ? `✓ CTA واضح يوجه للتواصل: ${brandTheme.contact_link || 'تواصل معنا الآن'}` : ''}
${postSettings.includeEmoji ? '✓ استخدم إيموجي مناسبة بشكل معتدل' : ''}

ثم اكتب ${postSettings.hashtagCount || 5} هاشتاقات مناسبة لـ${postSettings.platform}.

أجب بـ JSON فقط بدون أي نص إضافي بالصيغة التالية:
{
  "postText": "نص البوست الكامل هنا مع الإيموجي والتنسيق المناسب، اجعله في فقرات مريحة للعين",
  "hashtags": ["هاشتاق1", "هاشتاق2"]
}
  `;

  try {
    const response = await window.api?.ai.sendMessage({ messages: [{ role: 'user', content: prompt }] });
    
    if (response?.success && response.reply) {
      let jsonStr = response.reply;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      return JSON.parse(jsonStr);
    } else {
      throw new Error(response?.error || 'Failed to generate text');
    }
  } catch (error) {
    console.error("AI Text Generation failed:", error);
    return {
      postText: `هل تبحث عن ${productData.name}؟\n\nنقدم لك أفضل جودة بسعر ${productData.price} فقط!\n\n✨ مميزات المنتج:\n${productData.features?.map(f => `- ${f}`).join('\n')}\n\nاطلبه الآن ولا تفوت الفرصة! 👇\n${brandTheme.contact_link || ''}`,
      hashtags: ['منتج_جديد', 'تسوق_الآن', 'عروض']
    };
  }
}
