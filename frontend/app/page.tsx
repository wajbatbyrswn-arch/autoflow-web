import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col" dir="rtl">
      <header className="flex justify-between items-center px-8 py-5">
        <h1 className="text-2xl font-bold text-blue-600">AutoFlow</h1>
        <Link href="/login"
          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          تسجيل الدخول
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 gap-6">
        <h2 className="text-5xl font-bold text-gray-900 leading-tight">
          ردّ ذكي على زبائنك<br />
          <span className="text-blue-600">بالذكاء الاصطناعي</span>
        </h2>
        <p className="text-xl text-gray-500 max-w-lg">
          ربط متجرك بـ Instagram وFacebook وردّ تلقائياً على الرسائل والتعليقات بناءً على منتجاتك.
        </p>
        <Link href="/login"
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg">
          ابدأ الآن
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-6 px-12 pb-16">
        {[
          { icon: '🤖', title: 'Auto-Pilot', desc: 'يرد تلقائياً على رسائل زبائنك 24/7' },
          { icon: '💡', title: 'Copilot', desc: 'يقترح الرد لك وتعدّل عليه بنقرة واحدة' },
          { icon: '📦', title: 'قاعدة المنتجات', desc: 'أضف منتجاتك ليعرفها الذكاء الاصطناعي ويروّج لها' },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
