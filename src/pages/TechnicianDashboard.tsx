import toast from 'react-hot-toast';
import { socket } from '../socket';
import React, { useEffect, useState } from 'react';
import { MapPin, Car, CheckCircle2, Phone, User, Wrench, Clock } from 'lucide-react';
import api from '../api/client';
import { ServiceRequest } from './CustomerDashboard';
import { ChatBox } from '../components/ChatBox';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const VEHICLE_OPTIONS = [
  { value: 'SEDAN' },
  { value: 'SUV' },
  { value: 'MOTORCYCLE' },
  { value: 'HEAVY_TRUCK' },
  { value: 'BUS' },
];

const MALFUNCTION_OPTIONS = [
  { value: 'ELECTRICAL' },
  { value: 'MECHANICAL' },
  { value: 'TIRE_AND_WHEEL' },
  { value: 'BODY_AND_CHASSIS' },
  { value: 'BATTERY_JUMP' },
  { value: 'TOWING' },
];

export const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [queuedRequests, setQueuedRequests] = useState<ServiceRequest[]>([]);
  const [acceptedJob, setAcceptedJob] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [techProfile, setTechProfile] = useState<any>({
    workplace: '',
    careerExperience: '',
    hasTools: true,
    vehicleSpecialties: [],
    malfunctionSpecialties: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingOfferId, setSubmittingOfferId] = useState<string | null>(null);

  // Fetch technician profile
  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/tech-profile');
      if (res.data) {
        setTechProfile(res.data);
        if (!res.data.vehicleSpecialties?.length || !res.data.malfunctionSpecialties?.length) {
          setShowProfileModal(true);
        }
      } else {
        setShowProfileModal(true);
      }
    } catch {
      setShowProfileModal(true);
    }
  };

  const fetchActiveJob = async () => {
    try {
      const res = await api.get('/requests/tech-active');
      setAcceptedJob(res.data);
    } catch {
      setAcceptedJob(null);
    }
  };

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
    void fetchProfile();
    void fetchActiveJob();
    void fetchQueuedJobs();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    const handleDataUpdated = () => {
      void fetchQueuedJobs();
      void fetchActiveJob();
    };

    const handleRequestAccepted = (data: any) => {
      if (data.technicianId === techProfile?.id || data.technicianId === user?.technicianProfile?.id) {
        toast.success(t('custAcceptedOffer'));
        void fetchActiveJob();
        void fetchQueuedJobs();
      }
    };

    socket.on('data_updated', handleDataUpdated);
    socket.on('request_accepted', handleRequestAccepted);

    return () => {
      socket.off('data_updated', handleDataUpdated);
      socket.off('request_accepted', handleRequestAccepted);
    };
  }, [techProfile, user, t]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techProfile.vehicleSpecialties?.length || !techProfile.malfunctionSpecialties?.length) {
      alert(t('selectSpecialtiesAlert'));
      return;
    }
    try {
      const res = await api.patch('/auth/tech-profile', techProfile);
      setTechProfile(res.data);
      setShowProfileModal(false);
      toast.success(t('profileSavedSuccess'));
      void fetchQueuedJobs();
    } catch {
      alert('Failed to save profile');
    }
  };

  const toggleVehicleSpecialty = (val: string) => {
    const list = techProfile.vehicleSpecialties || [];
    if (list.includes(val)) {
      setTechProfile({ ...techProfile, vehicleSpecialties: list.filter((item: string) => item !== val) });
    } else {
      setTechProfile({ ...techProfile, vehicleSpecialties: [...list, val] });
    }
  };

  const toggleMalfunctionSpecialty = (val: string) => {
    const list = techProfile.malfunctionSpecialties || [];
    if (list.includes(val)) {
      setTechProfile({ ...techProfile, malfunctionSpecialties: list.filter((item: string) => item !== val) });
    } else {
      setTechProfile({ ...techProfile, malfunctionSpecialties: [...list, val] });
    }
  };

  const hasSentOffer = (req: ServiceRequest) => {
    if (!req.offers || !Array.isArray(req.offers)) return false;
    return req.offers.some(
      (o: any) => o.technician?.userId === user?.id || (techProfile?.id && o.technicianId === techProfile.id)
    );
  };

  const handleSendOffer = async (id: string): Promise<void> => {
    setSubmittingOfferId(id);
    try {
      await api.patch(`/requests/${id}/accept`);
      toast.success(t('offerSentSuccess'));
      void fetchQueuedJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to send offer or request already taken.');
      void fetchQueuedJobs();
    } finally {
      setSubmittingOfferId(null);
    }
  };

  const handleUpdateStatus = async (status: ServiceRequest['status']): Promise<void> => {
    if (!acceptedJob) return;
    try {
      const response = await api.patch<ServiceRequest>(`/requests/${acceptedJob.id}/status`, { status });
      if (status === 'COMPLETED') {
        setAcceptedJob(null);
        toast.success(t('jobCompletedToast'));
        void fetchQueuedJobs();
      } else {
        setAcceptedJob(response.data);
        toast.success(`${t('requestStatusUpdated')} ${status}`);
      }
    } catch {
      alert('Status update failed');
    }
  };

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Profile Completion / Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl relative my-auto border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Wrench className="h-4 w-4" />
                </div>
                {t('completeProfileTitle')}
              </h2>
              {techProfile.vehicleSpecialties?.length > 0 && techProfile.malfunctionSpecialties?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {t('specifySpecialtiesDesc')}
            </p>
            <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50/70 border border-amber-200 px-3 py-2 text-xs">
              <span className="text-slate-600 font-bold">{t('registeredPhone')}</span>
              <span className="font-extrabold text-amber-900 font-mono">{user?.phoneNumber || techProfile.user?.phoneNumber || 'N/A'}</span>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('workplaceOrWorkshop')}</label>
                <input
                  required
                  type="text"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                  value={techProfile.workplace || ''}
                  onChange={(e) => setTechProfile({ ...techProfile, workplace: e.target.value })}
                  placeholder={t('workplacePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('careerExperience')}</label>
                <input
                  required
                  type="text"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                  value={techProfile.careerExperience || ''}
                  onChange={(e) => setTechProfile({ ...techProfile, careerExperience: e.target.value })}
                  placeholder={t('experiencePlaceholder')}
                />
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="hasToolsCheckbox"
                  checked={techProfile.hasTools !== false}
                  onChange={(e) => setTechProfile({ ...techProfile, hasTools: e.target.checked })}
                  className="h-4 w-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="hasToolsCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                  {t('hasToolsCheckbox')}
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('selectVehiclesPrompt')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_OPTIONS.map((v) => {
                    const selected = (techProfile.vehicleSpecialties || []).includes(v.value);
                    return (
                      <button
                        type="button"
                        key={v.value}
                        onClick={() => toggleVehicleSpecialty(v.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          selected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {t(v.value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('selectMalfunctionsPrompt')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MALFUNCTION_OPTIONS.map((m) => {
                    const selected = (techProfile.malfunctionSpecialties || []).includes(m.value);
                    return (
                      <button
                        type="button"
                        key={m.value}
                        onClick={() => toggleMalfunctionSpecialty(m.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          selected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {t(m.value)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-3 rounded-xl hover:from-amber-600 hover:to-amber-700 hover:text-white shadow-md shadow-amber-500/25 transition mt-4"
              >
                {t('saveProfileBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">{t('techCenterTitle')}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
            <span className="text-slate-600 font-medium">
              {t('specialties')}: {techProfile.vehicleSpecialties?.map((v: string) => t(v)).join(', ') || t('allVehicles')} • {techProfile.malfunctionSpecialties?.map((m: string) => t(m)).join(', ') || t('allMalfunctions')}
            </span>
            {(user?.phoneNumber || techProfile.user?.phoneNumber) && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-amber-700 flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3" />
                  {user?.phoneNumber || techProfile.user?.phoneNumber}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 transition"
          >
            {t('editSpecialties')}
          </button>
          <button
            type="button"
            onClick={() => {
              void fetchQueuedJobs();
              void fetchActiveJob();
            }}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            {t('refreshFeeds')}
          </button>
        </div>
      </div>

      {/* Accepted Active Job */}
      {acceptedJob && (
        <div className="mb-8 rounded-2xl border-2 border-amber-500 bg-amber-50/30 p-4 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3 pt-1">
            <div>
              <span className="text-xs font-bold uppercase text-amber-700 tracking-wider">{t('activeJobTitle')}</span>
              <h3 className="text-lg font-black text-slate-900">
                {t(acceptedJob.malfunctionCategory)} - {t('assistanceSuffix')}
              </h3>
            </div>
            <span className="rounded-xl bg-amber-500 px-3.5 py-1 text-xs font-black text-slate-950 shadow-xs border border-amber-400">
              {acceptedJob.status === 'ACCEPTED' ? t('onTheWay') :
               acceptedJob.status === 'ARRIVED' ? t('arrivedAtLocation') :
               acceptedJob.status === 'IN_PROGRESS' ? t('currentlyRepairing') :
               t('workCompleted')}
            </span>
          </div>

          {/* Customer info */}
          {acceptedJob.customer && (
            <div className="mb-4 rounded-xl bg-white p-3.5 border border-amber-200 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-xs text-slate-400 block font-medium">{t('customer')}</span>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-600" />
                  {acceptedJob.customer.fullName}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">{t('phone')}</span>
                <a
                  href={`tel:${acceptedJob.customer.phoneNumber}`}
                  className="font-bold text-amber-700 text-sm flex items-center gap-1.5 hover:underline font-mono"
                >
                  <Phone className="h-4 w-4" />
                  {acceptedJob.customer.phoneNumber}
                </a>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-700">
            <span className="flex items-center gap-1 font-semibold">
              <Car className="h-4 w-4 text-slate-500" />
              <strong>{t('vehicleLabel')}</strong> {t(acceptedJob.vehicleType)}
            </span>
          </div>

          {acceptedJob.addressDescription && (() => {
            const lines = acceptedJob.addressDescription.split('\n');
            const mapUrl = lines.find((l: string) => l.trim().startsWith('http'))?.trim();
            const notes = lines.filter((l: string) => !l.trim().startsWith('http')).join(' ');
            const finalHref = mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acceptedJob.addressDescription)}`;

            return (
              <div className="mb-4 w-full">
                <a
                  href={finalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white border border-amber-200 hover:bg-amber-50/50 rounded-xl transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-bold text-slate-900">{t('openCustomerMaps')}</span>
                  </div>
                  <span className="text-xs bg-slate-950 text-amber-400 px-3 py-1.5 rounded-lg font-black">{t('startRoute')}</span>
                </a>
                {notes && (
                  <div className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-amber-200">
                    <span className="font-extrabold text-amber-900">{t('issueDetails')} </span>
                    {notes}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action Stages */}
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-amber-200/60">
            {acceptedJob.status === 'ACCEPTED' && (
              <button
                type="button"
                onClick={() => { void handleUpdateStatus('ARRIVED'); }}
                className="w-full sm:w-auto rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-600 transition shadow-sm"
              >
                {t('markAsArrived')}
              </button>
            )}
            {acceptedJob.status === 'ARRIVED' && (
              <button
                type="button"
                onClick={() => { void handleUpdateStatus('IN_PROGRESS'); }}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-2.5 text-xs font-black text-white hover:from-orange-600 hover:to-amber-700 transition shadow-sm"
              >
                {t('startRepair')}
              </button>
            )}
            {acceptedJob.status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={() => { void handleUpdateStatus('COMPLETED'); }}
                className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-sm"
              >
                {t('completeJob')}
              </button>
            )}
          </div>

          {/* Chat with Customer */}
          <div className="mt-5">
            <ChatBox
              requestId={acceptedJob.id}
              currentUserId={user?.id}
              currentUserRole="TECHNICIAN"
            />
          </div>
        </div>
      )}

      {/* Queued Requests Feed */}
      <h2 className="mb-4 text-base font-black tracking-tight text-slate-900">
        {t('availableRequests')}
      </h2>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      ) : queuedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-white">
          <CheckCircle2 className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">{t('noQueuedRequests')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {queuedRequests.map((req) => {
            const alreadySent = hasSentOffer(req);

            return (
              <div
                key={req.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-amber-400 hover:shadow-md transition"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-[11px] font-black uppercase text-amber-900 border border-amber-200">
                      {t(req.vehicleType)}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{t(req.malfunctionCategory)}</h3>
                  {(() => {
                    if (!req.addressDescription) {
                      return (
                        <p className="mt-2 text-xs text-slate-400 italic">
                          {t('addressUnlisted')}
                        </p>
                      );
                    }
                    const lines = req.addressDescription.split('\n');
                    const mapUrl = lines.find((l: string) => l.trim().startsWith('http'))?.trim() ||
                                   req.addressDescription.match(/https?:\/\/[^\s]+/)?.[0];
                    const notes = lines.filter((l: string) => !l.trim().startsWith('http')).join(' ').trim();

                    return (
                      <div className="mt-2 space-y-1.5">
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition"
                          >
                            <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>{t('openGoogleMaps')}</span>
                          </a>
                        )}
                        {notes && (
                          <p className="text-xs text-slate-600 line-clamp-2 break-words">
                            {notes}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {t('offersCount')} <strong>{req.offers?.length || 0}</strong>
                  </span>
                  {alreadySent ? (
                    <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200">
                      {t('offerSentWaiting')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!acceptedJob || submittingOfferId === req.id}
                      onClick={() => { void handleSendOffer(req.id); }}
                      className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-black text-slate-950 hover:from-amber-600 hover:to-amber-700 hover:text-white disabled:opacity-40 transition shadow-xs"
                    >
                      {submittingOfferId === req.id ? t('sending') : acceptedJob ? t('completeActiveFirst') : t('sendOffer')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
