import { socket } from '../socket';
import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export const HistoryDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    api.get('/requests/my-history')
      .then(res => setHistory(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
    socket.on('data_updated', () => {
      void fetchHistory();
    });
    return () => {
      socket.off('data_updated');
    };
  }, []);

  if (user?.isBanned) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600 mb-2">{t('accountBanned')}</h1>
          <p className="text-red-500">{t('accountBannedMsg')}</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">{t('loading')}</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-black mb-6 text-slate-900">{t('myHistoryTitle')}</h1>

      {(user?.role === 'TECHNICIAN' || user?.role === 'CUSTOMER') && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 mb-8">
          <h2 className="text-lg font-black mb-4 text-slate-900">
            {user?.role === 'TECHNICIAN' ? t('performanceChart') : t('requestsActivity')} {t('last30Days')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={
                Array.from({ length: 30 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (29 - i));
                  const dateStr = d.toLocaleDateString();
                  const count = history.filter(r => r.status === 'COMPLETED' && new Date(r.createdAt).toLocaleDateString() === dateStr).length;
                  return { date: dateStr, completed: count };
                })
              }>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(t) => t.split('/')[0] + '/' + t.split('/')[1]} />
                <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#f59e0b" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <h2 className="text-lg font-black mb-4 text-slate-900">{t('pastTransactions')}</h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm font-medium">{t('noPastTransactions')}</p>
          ) : (
            history.map(req => (
              <div key={req.id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:bg-slate-50 hover:border-amber-400 transition">
                <div>
                  <h4 className="font-bold text-slate-900">{t(req.malfunctionCategory)} - {t(req.vehicleType)}</h4>
                  <p className="text-xs text-slate-400 mb-1">{new Date(req.createdAt).toLocaleString()}</p>
                  {user?.role === 'CUSTOMER' && req.technician && (
                    <p className="text-xs text-slate-600">{t('technicianRole')}: <strong>{req.technician.user?.fullName}</strong></p>
                  )}
                  {user?.role === 'TECHNICIAN' && req.customer && (
                    <p className="text-xs text-slate-600">{t('customer')}: <strong>{req.customer.fullName}</strong></p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
                  req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                  'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {t(`status${req.status.charAt(0) + req.status.slice(1).toLowerCase()}`) || req.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
