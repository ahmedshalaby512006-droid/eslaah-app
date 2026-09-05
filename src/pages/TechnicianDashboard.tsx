import React, { useEffect, useState } from 'react';
import { MapPin, Car, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { ServiceRequest } from './CustomerDashboard';
import { ChatBox } from '../components/ChatBox';
import { useAuth } from '../context/AuthContext';

export const TechnicianDashboard: React.FC = () => {
  const [queuedRequests, setQueuedRequests] = useState<ServiceRequest[]>([]);
 const [acceptedJob, setAcceptedJob] = useState<ServiceRequest | null>(() => {
  const saved = localStorage.getItem('active_tech_job');
  return saved ? JSON.parse(saved) : null;
});
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const fetchQueuedJobs = async (): Promise<void> => {
    try {
      const response = await api.get<ServiceRequest[]>('/requests/queued');
      setQueuedRequests(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQueuedJobs();
  }, []);

  const handleAccept = async (id: string): Promise<void> => {
    try {
      const response = await api.patch<ServiceRequest>(`/requests/${id}/accept`);
      setAcceptedJob(response.data);
      localStorage.setItem('active_tech_job', JSON.stringify(response.data));
      setQueuedRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Job is already taken or unavailable');
      void fetchQueuedJobs();
    }
  };

  const handleUpdateStatus = async (status: ServiceRequest['status']): Promise<void> => {
    if (!acceptedJob) return;
    try {
      const response = await api.patch<ServiceRequest>(`/requests/${acceptedJob.id}/status`, { status });
      if (status === 'COMPLETED') {
        localStorage.removeItem('active_tech_job');
        setAcceptedJob(null);
        void fetchQueuedJobs();
      } else {
        localStorage.setItem('active_tech_job', JSON.stringify(response.data));
        setAcceptedJob(response.data);
      }
    } catch {
      alert('Status update failed');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Technician Command Center</h1>
        <button
          onClick={() => { void fetchQueuedJobs(); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Refresh Feeds
        </button>
      </div>

      {acceptedJob && (
        <div className="mb-6 rounded-xl sm:rounded-2xl border-2 border-blue-500 bg-blue-50/50 p-3.5 sm:p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600">Currently Servicing</span>
              <h3 className="text-base font-bold text-slate-900">{acceptedJob.malfunctionCategory}</h3>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
              {acceptedJob.status}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-700">
            <span className="flex items-center gap-1"><Car className="h-4 w-4" /> {acceptedJob.vehicleType}</span>
            <span className="flex items-center gap-1 whitespace-pre-line"><MapPin className="h-4 w-4 shrink-0" /> {acceptedJob.addressDescription}</span>
          </div>

        {acceptedJob.addressDescription && (() => {
  // استخراج رابط الخريطة لوحده من النص المدمج
  const lines = acceptedJob.addressDescription.split('\n');
  const mapUrl = lines.find((l: string) => l.trim().startsWith('http'))?.trim();
  const notes = lines.filter((l: string) => !l.trim().startsWith('http')).join(' ');

  const finalHref = mapUrl 
    ? mapUrl 
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acceptedJob.addressDescription)}`;

  return (
    <div className="mb-4 w-full">
      <a
        href={finalHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">Open Customer Location on Google Maps</span>
        </div>
        <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg">Start Route</span>
      </a>

      {notes && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="font-semibold text-slate-800"> </span>
          {notes.replace('تفاصيل المشكلة:', '').trim()}
        </div>
      )}
    </div>
  );
})()}

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {acceptedJob.status === 'ACCEPTED' && (
              <button
                onClick={() => { void handleUpdateStatus('ARRIVED'); }}
                className="w-full sm:w-auto text-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
              >
                Mark as Arrived
              </button>
            )}
            {acceptedJob.status === 'ARRIVED' && (
              <button
                onClick={() => { void handleUpdateStatus('IN_PROGRESS'); }}
               className="w-full sm:w-auto text-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
              >
                Start Repair
              </button>
            )}
            {acceptedJob.status === 'IN_PROGRESS' && (
              <button
                onClick={() => { void handleUpdateStatus('COMPLETED'); }}
                className="w-full sm:w-auto text-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
              >
                Complete Job
              </button>
            )}
          </div>
          {acceptedJob && acceptedJob.status === 'ACCEPTED' && (
          <ChatBox
            requestId={acceptedJob.id}
            currentUserId={user?.id || (acceptedJob as any).technicianId}
            currentUserRole="TECHNICIAN"
          />
        )}
        </div>
      )}

      <h2 className="mb-4 text-sm font-bold tracking-tight text-slate-700">Incoming Roadside Requests</h2>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : queuedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">No active queued jobs in your area.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {queuedRequests.map((req) => (
            <div
              key={req.id}
             className="flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm"
            >
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                    {req.vehicleType}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{req.malfunctionCategory}</h3>
                <p className="mt-2 line-clamp-3 flex items-start gap-1 text-xs text-slate-500 whitespace-pre-line break-words">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {req.addressDescription || 'Address details unlisted'}
                </p>
              </div>

              <button
                disabled={!!acceptedJob}
                onClick={() => { void handleAccept(req.id); }}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-600 disabled:opacity-40"
              >
                {acceptedJob ? 'Complete Active Job First' : 'Accept Request'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};