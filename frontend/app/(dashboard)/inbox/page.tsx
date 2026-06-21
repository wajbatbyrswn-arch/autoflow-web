'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type Conversation = {
  id: string; platform: string; customer_name: string; customer_platform_id: string;
  last_message_at: string; status: string; ai_tag: string;
};
type Message = {
  id: string; content: string; is_from_customer: boolean; ai_suggestion: string | null;
  sent_at: string; nashir_message_id: string;
};

const TAG_LABELS: Record<string, string> = {
  price_inquiry: 'استفسار سعر', order_request: 'طلب شراء',
  shipping_issue: 'مشكلة شحن', angry_customer: 'عميل غاضب', other: 'عام',
};
const TAG_COLORS: Record<string, string> = {
  price_inquiry: 'bg-blue-100 text-blue-700', order_request: 'bg-green-100 text-green-700',
  shipping_issue: 'bg-orange-100 text-orange-700', angry_customer: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
};
const PLATFORM_ICONS: Record<string, string> = {
  facebook_dm: '📘', instagram_dm: '📸', facebook_comment: '💬', instagram_comment: '🖼️',
};

export default function InboxPage() {
  const [userId, setUserId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        api.getConversations(user.id).then(setConversations).catch(console.error);
      }
    });
  }, []);

  async function openConversation(conv: Conversation) {
    setSelected(conv);
    const msgs = await api.getMessages(conv.id);
    setMessages(msgs);
    const lastMsg = msgs.find((m: Message) => m.is_from_customer && m.ai_suggestion);
    if (lastMsg?.ai_suggestion) setReplyText(lastMsg.ai_suggestion);
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const lastCustomerMsg = [...messages].reverse().find(m => m.is_from_customer);
    if (!lastCustomerMsg) { setSending(false); return; }

    const isComment = selected.platform.includes('comment');
    const newMsg = await api.sendReply({
      user_id: userId,
      conversation_id: selected.id,
      nashir_message_id: lastCustomerMsg.nashir_message_id,
      message: replyText,
      is_comment: isComment,
    });

    setMessages(prev => [...prev, newMsg]);
    setReplyText('');

    if (selected.ai_tag === 'order_request') {
      await api.createOrder({
        user_id: userId,
        conversation_id: selected.id,
        customer_name: selected.customer_name,
        status: 'pending',
      }).catch(console.error);
    }
    setSending(false);
  }

  return (
    <div className="flex h-full gap-4" dir="rtl">
      {/* Conversations */}
      <div className="w-72 bg-white rounded-2xl shadow-sm overflow-y-auto">
        <div className="p-4 border-b font-semibold text-gray-700">الرسائل ({conversations.length})</div>
        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => openConversation(conv)}
            className={`w-full text-right p-4 border-b hover:bg-gray-50 transition ${selected?.id === conv.id ? 'bg-blue-50' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{PLATFORM_ICONS[conv.platform] || '💬'}</span>
              <span className="font-medium text-sm text-gray-800 truncate">{conv.customer_name}</span>
            </div>
            {conv.ai_tag && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${TAG_COLORS[conv.ai_tag] || TAG_COLORS.other}`}>
                {TAG_LABELS[conv.ai_tag] || conv.ai_tag}
              </span>
            )}
          </button>
        ))}
        {conversations.length === 0 && (
          <div className="p-6 text-gray-400 text-sm text-center">لا توجد محادثات بعد</div>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col">
        {selected ? (
          <>
            <div className="p-4 border-b font-semibold text-gray-700">
              {PLATFORM_ICONS[selected.platform]} {selected.customer_name}
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_from_customer ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                    msg.is_from_customer ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            {/* Copilot suggestion + reply box */}
            <div className="p-4 border-t flex flex-col gap-2">
              {messages.some(m => m.is_from_customer && m.ai_suggestion) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-gray-700">
                  <span className="font-medium text-yellow-700 text-xs block mb-1">🤖 اقتراح الذكاء الاصطناعي</span>
                  {messages.filter(m => m.is_from_customer && m.ai_suggestion).at(-1)?.ai_suggestion}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="اكتب ردك..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {sending ? '...' : 'إرسال'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            اختر محادثة لعرضها
          </div>
        )}
      </div>
    </div>
  );
}
