export async function analyzeProductImage(base64Image) {
  const prompt = `
انظر لهذه الصورة واستخرج:
1. اسم المنتج المحتمل
2. وصف مختصر جذاب (جملتين)
3. ثلاث نقاط مميزة للمنتج

أجب بـ JSON فقط بالصيغة التالية تماماً بدون أي إضافات:
{
  "name": "اسم المنتج",
  "description": "وصف قصير جذاب",
  "features": ["ميزة 1", "ميزة 2", "ميزة 3"]
}
  `;

  try {
    const response = await window.api?.ai.analyzeImage(prompt, base64Image);
    
    if (response?.success && response.reply) {
      let jsonStr = response.reply;
      // Clean markdown formatting if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      return JSON.parse(jsonStr);
    } else {
      throw new Error(response?.error || 'Failed to analyze image');
    }
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback if API fails
    return {
      name: 'منتج جديد',
      description: 'منتج رائع وعالي الجودة، يضيف لمسة مميزة لأسلوب حياتك.',
      features: ['جودة عالية', 'تصميم عصري', 'سعر تنافسي']
    };
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
