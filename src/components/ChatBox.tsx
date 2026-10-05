import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
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
      alert(t('geoNotSupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        try {
          await api.post(`/requests/${requestId}/messages`, { text: `📍 Location: ${mapsLink}` });
          await fetchMessages();
        } catch (err) {
          console.error('Failed to send location', err);
        }
      },
      () => alert(t('geoError'))
    );
  };

  return (
    <div className="flex flex-col h-80 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs mt-4">
      <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
        <span className="font-black text-xs text-slate-800">{t('liveChat')}</span>
        {currentUserRole === 'TECHNICIAN' && (
          <button
            type="button"
            onClick={handleShareLocation}
            className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl hover:bg-amber-200 transition font-bold"
          >
            {t('sendMyLocation')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400 mt-10 font-medium">{t('noMessages')}</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isMapLink = msg.text.includes('https://www.google.com/maps');

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed font-medium ${
                    isMe
                      ? 'bg-amber-500 text-slate-950 font-bold rounded-br-none shadow-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {isMapLink ? (
                    <div>
                      <span>{t('locationSent')}</span>
                      <a
                        href={msg.text.match(/https:\/\/www\.google\.com\/maps[^\s]*/)?.[0] || msg.text}
                        target="_blank"
                        rel="noreferrer"
                        className="underline block mt-1 font-bold text-slate-900 hover:text-black"
                      >
                        {t('openInGoogleMaps')}
                      </a>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 px-1 font-mono">
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
          placeholder={t('typeMessage')}
          className="flex-1 text-xs border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500 transition"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl hover:from-amber-600 hover:to-amber-700 hover:text-white disabled:opacity-50 transition shadow-xs"
        >
          {t('send')}
        </button>
      </form>
    </div>
  );
};