import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

interface ChatBoxProps {
  requestId: string;
  currentUserId?: string;
  currentUserRole: 'CUSTOMER' | 'TECHNICIAN' | 'ENGINEER';
}

export const ChatBox: React.FC<ChatBoxProps> = ({ requestId, currentUserId, currentUserRole }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/requests/${requestId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    if (bottomRef.current?.parentElement) {
      bottomRef.current.parentElement.scrollTop = bottomRef.current.parentElement.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      await api.post(`/requests/${requestId}/messages`, { text });
      setText('');
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        try {
          await api.post(`/requests/${requestId}/messages`, { text: `📍 Send My Location ${mapsLink}` });
          await fetchMessages();
        } catch (err) {
          console.error('Failed to send location', err);
        }
      },
      () => alert('تعذر جلب إحداثيات الموقع')
    );
  };

  return (
    <div className="flex flex-col h-80 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm mt-4">
      <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
        <span className="font-bold text-xs text-slate-700">🔴  Live Chat</span>
        {currentUserRole === 'TECHNICIAN' && (
          <button
            type="button"
            onClick={handleShareLocation}
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition font-medium"
          >
            📍 Send My Location
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400 mt-10">No messages yet</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isMapLink = msg.text.includes('https://www.google.com/maps');

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {isMapLink ? (
                    <div>
                      <span>Location Sent 📍:</span>
                      <a
                        href={msg.text.split('📍 Send My Location ')[1] || msg.text}
                        target="_blank"
                        rel="noreferrer"
                        className="underline block mt-1 font-semibold"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="bg-blue-600 text-white text-xs px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};
