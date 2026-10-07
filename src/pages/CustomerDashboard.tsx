import toast from "react-hot-toast";
import React, { useState, useEffect, FormEvent } from 'react';
import { LucideIcon, Car, Truck, Bike, Bus, AlertCircle, Zap, Shield, HelpCircle, Star, Phone, UserCheck, Wrench, MessageSquare, MapPin, RotateCcw, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { parseLocationAndIssue } from '../utils/locationParser';
import { ChatBox } from '../components/ChatBox';
import { NotificationBell } from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { socket } from '../socket';

interface VehicleOption {
  type: string;
  icon: LucideIcon;
}

interface MalfunctionOption {
  type: string;
  icon: LucideIcon;
}

export interface ServiceRequest {
  id: string;
  vehicleType: string;
  malfunctionCategory: string;
  addressDescription?: string;
  status: 'QUEUED' | 'PENDING' | 'DISPATCHING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offers?: any[];
  technician?: any;
  createdAt: string;
}

const VEHICLES: VehicleOption[] = [
  { type: 'SEDAN', icon: Car },
  { type: 'SUV', icon: Car },
  { type: 'MOTORCYCLE', icon: Bike },
  { type: 'HEAVY_TRUCK', icon: Truck },
  { type: 'BUS', icon: Bus },
];

const MALFUNCTIONS: MalfunctionOption[] = [
  { type: 'ELECTRICAL', icon: Zap },
  { type: 'MECHANICAL', icon: AlertCircle },
  { type: 'TIRE_AND_WHEEL', icon: HelpCircle },
  { type: 'BODY_AND_CHASSIS', icon: Shield },
  { type: 'BATTERY_JUMP', icon: Zap },
  { type: 'TOWING', icon: Truck },
];

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [vehicleType, setVehicleType] = useState<string>('SEDAN');
  const [malfunctionCategory, setMalfunctionCategory] = useState<string>('MECHANICAL');
  const [gpsLocationUrl, setGpsLocationUrl] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);

  // Tech Profile inspection modal
  const [showTechProfile, setShowTechProfile] = useState<boolean>(false);
  const [techProfileData, setTechProfileData] = useState<any>(null);

  // Rating modal states
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [priceScore, setPriceScore] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const fetchActiveRequest = async () => {
    try {
      const res = await api.get('/requests/active');
      if (!res.data || res.data.status === 'CANCELLED') {
        setActiveRequest(null);
        setShowRatingModal(false);
      } else if (res.data.status === 'COMPLETED') {
        setActiveRequest(res.data);
        setShowRatingModal(true); // Mandatory
      } else {
        setActiveRequest(res.data);
        setShowRatingModal(false);
      }
    } catch {
      setActiveRequest(null);
      setShowRatingModal(false);
    }
  };

  useEffect(() => {
    void fetchActiveRequest();
  }, []);

  // Real-time WebSocket listeners
  useEffect(() => {
    const handleDataUpdated = () => {
      void fetchActiveRequest();
    };

    const handleOfferReceived = (data: any) => {
      if (data.customerId === user?.id) {
        toast.success(t('newOfferReceived'));
        void fetchActiveRequest();
      }
    };

    const handleStatusChanged = (data: any) => {
      if (activeRequest && data.requestId === activeRequest.id) {
        toast.success(`${t('requestStatusUpdated')} ${data.status}`);
        void fetchActiveRequest();
      }
    };

    socket.on('data_updated', handleDataUpdated);
    socket.on('offer_received', handleOfferReceived);
    socket.on('status_changed', handleStatusChanged);

    return () => {
      socket.off('data_updated', handleDataUpdated);
      socket.off('offer_received', handleOfferReceived);
      socket.off('status_changed', handleStatusChanged);
    };
  }, [user, activeRequest, t]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('geoNotSupported'));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setGpsLocationUrl(mapsUrl);
        setIsLocating(false);
        toast.success(t('gpsCapturedSuccess'));
      },
      (error) => {
        console.error(error);
        alert(t('geoError'));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateRequest = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!gpsLocationUrl && !manualAddress.trim()) {
      alert(t('locationRequiredAlert'));
      return;
    }

    setLoading(true);
    try {
      const parts: string[] = [];
      if (gpsLocationUrl) {
        parts.push(gpsLocationUrl);
      }
      if (manualAddress.trim()) {
        parts.push(`[LOC]: ${manualAddress.trim()}`);
      }
      if (issueDescription.trim()) {
        parts.push(`[ISSUE]: ${issueDescription.trim()}`);
      }
      const combinedAddress = parts.join('\n');

      const response = await api.post<ServiceRequest>('/requests', {
        vehicleType,
        malfunctionCategory,
        addressDescription: combinedAddress,
      });
      setActiveRequest(response.data);
      toast.success(t('requestCreatedSuccess'));
      setGpsLocationUrl('');
      setManualAddress('');
      setIssueDescription('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTechProfile = async (techId: string) => {
    try {
      const res = await api.get(`/requests/technician/${techId}`);
      setTechProfileData(res.data);
      setShowTechProfile(true);
    } catch {
      alert(t('errorLoadingProfile'));
    }
  };

  const handleAcceptOffer = async (technicianId: string) => {
    if (!activeRequest) return;
    try {
      await api.patch(`/requests/${activeRequest.id}/customer-accept`, { technicianId });
      toast.success(t('techAcceptedToast'));
      void fetchActiveRequest();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept technician offer');
    }
  };

  const handleRejectOffer = async (technicianId: string) => {
    if (!activeRequest) return;
    try {
      await api.patch(`/requests/${activeRequest.id}/customer-reject`, { technicianId });
      toast(t('offerRejected'));
      void fetchActiveRequest();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject offer');
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;
    if (!confirm(t('cancelRequestConfirm'))) return;
    try {
      await api.patch(`/requests/${activeRequest.id}/cancel`);
      setActiveRequest(null);
      toast.success(t('requestCancelledSuccess'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleRatingSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!activeRequest) return;
    try {
      await api.post('/ratings', {
        requestId: activeRequest.id,
        qualityScore,
        priceFairnessScore: priceScore,
        comment,
      });
      setShowRatingModal(false);
      setActiveRequest(null);
      toast.success(t('thankYouRating'));
    } catch {
      alert('Failed to submit rating.');
    }
  };

  const getStatusBadgeText = (status: string) => {
    switch (status) {
      case 'QUEUED': return t('statusQueued');
      case 'PENDING': return t('statusPending');
      case 'DISPATCHING': return t('statusDispatching');
      case 'ACCEPTED': return t('statusAccepted');
      case 'ARRIVED': return t('statusArrived');
      case 'IN_PROGRESS': return t('statusInProgress');
      case 'COMPLETED': return t('statusCompleted');
      case 'CANCELLED': return t('statusCancelled');
      default: return status;
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Notifications Banner */}
      <NotificationBell variant="banner" />

      {activeRequest ? (
        <div className="rounded-2xl border-2 border-amber-500/70 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 pt-1">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">{t('activeRequestTitle')}</span>
              <h2 className="text-lg font-black text-slate-900">
                {t(activeRequest.malfunctionCategory)} - {t('assistanceSuffix')}
              </h2>
            </div>
            <span className={`rounded-xl px-3 py-1 text-xs font-extrabold border ${
              activeRequest.status === 'QUEUED' ? 'bg-amber-100 text-amber-950 border-amber-300' :
              activeRequest.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-900 border-blue-200' :
              activeRequest.status === 'ARRIVED' ? 'bg-indigo-100 text-indigo-900 border-indigo-200' :
              activeRequest.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-900 border-purple-200' :
              'bg-emerald-100 text-emerald-900 border-emerald-200'
            }`}>
              {getStatusBadgeText(activeRequest.status)}
            </span>
          </div>

          {/* Request Details */}
          {(() => {
            const { mapUrl, manualAddress, issueDetails } = parseLocationAndIssue(activeRequest.addressDescription);
            return (
              <div className="py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{t('vehicleType')}</p>
                    <p className="font-bold text-slate-900 mt-0.5">{t(activeRequest.vehicleType)}</p>
                  </div>
                  {mapUrl && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{t('gpsLabel')}</p>
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition shadow-2xs"
                      >
                        <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>{t('openGoogleMaps')}</span>
                      </a>
                    </div>
                  )}
                </div>

                {manualAddress && (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3">
                    <span className="text-xs font-black text-amber-950 block mb-1">
                      📍 {t('locationLabel')}:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 font-semibold break-words">
                      {manualAddress}
                    </p>
                  </div>
                )}

                {issueDetails && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs font-black text-slate-800 block mb-1">
                      🔧 {t('issueLabel')}:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium break-words">
                      {issueDetails}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Assigned Technician Card (if Accepted or In Progress) */}
          {activeRequest.status !== 'QUEUED' && activeRequest.technician && (
            <div className="my-4 rounded-xl border border-amber-300 bg-amber-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black text-amber-950">{t('assignedTech')}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <p className="text-slate-500 font-medium">{t('name')}</p>
                  <p className="font-extrabold text-slate-900">{activeRequest.technician.user?.fullName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">{t('phone')}</p>
                  <p className="font-bold text-amber-800 flex items-center gap-1 font-mono">
                    <Phone className="h-3.5 w-3.5 text-amber-600" />
                    {activeRequest.technician.user?.phoneNumber}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">{t('workplace')}</p>
                  <p className="font-semibold text-slate-800">{activeRequest.technician.workplace || t('independentSpecialist')}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">{t('serviceStatus')}</p>
                  <p className="font-extrabold text-amber-900">
                    {activeRequest.status === 'ACCEPTED' ? t('onTheWay') :
                     activeRequest.status === 'ARRIVED' ? t('arrivedAtLocation') :
                     activeRequest.status === 'IN_PROGRESS' ? t('currentlyRepairing') :
                     t('workCompleted')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chat with Technician when job is active */}
          {activeRequest.status !== 'QUEUED' && activeRequest.status !== 'COMPLETED' && (
            <div className="mt-4">
              <ChatBox
                requestId={activeRequest.id}
                currentUserId={user?.id || (activeRequest as any).customerId}
                currentUserRole="CUSTOMER"
              />
            </div>
          )}

          {/* QUEUED Offers List */}
          {activeRequest.status === 'QUEUED' && (
            <div className="mt-4">
              {activeRequest.offers && activeRequest.offers.length > 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                  <h3 className="text-sm font-black text-amber-950 mb-2">
                    {t('offersReceived')} ({activeRequest.offers.length})
                  </h3>
                  <div className="space-y-3">
                    {activeRequest.offers.map((offer: any) => {
                      const completedCount = offer.technician?.totalCompletedJobs || 0;
                      const hasRating = completedCount > 0;
                      const avgQuality = offer.technician?.averageQualityRating ? Number(offer.technician.averageQualityRating).toFixed(1) : null;
                      const avgPrice = offer.technician?.averagePriceRating ? Number(offer.technician.averagePriceRating).toFixed(1) : null;
                      const overallAvg = (avgQuality && avgPrice) ? ((Number(avgQuality) + Number(avgPrice)) / 2).toFixed(1) : null;

                      return (
                        <div key={offer.id} className="rounded-xl bg-white p-3.5 border border-amber-200 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-xs">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{offer.technician?.user?.fullName}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                              {hasRating && overallAvg ? (
                                <span className="flex items-center gap-0.5 text-amber-700 font-extrabold">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                  {overallAvg} / 5 ({completedCount} {t('jobsCount')})
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {t('notRatedYet')}
                                </span>
                              )}
                              {offer.technician?.workplace && (
                                <>
                                  <span>•</span>
                                  <span>{offer.technician.workplace}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleAcceptOffer(offer.technicianId)}
                              className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-sm hover:from-amber-600 hover:to-amber-700 hover:text-white transition"
                            >
                              {t('acceptOffer')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectOffer(offer.technicianId)}
                              className="flex-1 sm:flex-none rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                            >
                              {t('rejectOffer')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewTechProfile(offer.technicianId)}
                              className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                              {t('viewProfile')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-300 p-6 text-center bg-amber-50/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mx-auto mb-2" />
                  <p className="text-xs font-bold text-amber-900">{t('waitingForOffers')}</p>
                </div>
              )}

              {/* Cancel button allowed while in QUEUED */}
              <button
                type="button"
                onClick={handleCancelRequest}
                className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
              >
                {t('cancelRequestBtn')}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Create New Request Form */
        <form onSubmit={handleCreateRequest} className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-tight text-slate-900">{t('selectVehicle')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {VEHICLES.map((v) => {
                const Icon = v.icon;
                const isSelected = vehicleType === v.type;
                return (
                  <button
                    type="button"
                    key={v.type}
                    onClick={() => setVehicleType(v.type)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`mb-2 h-6 w-6 ${isSelected ? 'text-amber-600' : 'text-slate-600'}`} />
                    <span className="text-xs">{t(v.type)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-tight text-slate-900">{t('selectIssue')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MALFUNCTIONS.map((m) => {
                const Icon = m.icon;
                const isSelected = malfunctionCategory === m.type;
                return (
                  <button
                    type="button"
                    key={m.type}
                    onClick={() => setMalfunctionCategory(m.type)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 font-bold text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`mb-2 h-6 w-6 ${isSelected ? 'text-amber-600' : 'text-slate-600'}`} />
                    <span className="text-xs">{t(m.type)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GPS Location (Google Maps) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  {t('gpsLocationTitle')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('gpsAutoDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-xl transition-all border border-amber-500 shadow-xs active:scale-95 disabled:opacity-50"
              >
                <MapPin className={`h-4 w-4 ${isLocating ? 'animate-bounce text-amber-900' : 'text-slate-950'}`} />
                {isLocating ? t('locating') : t('useCurrentLocation')}
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                readOnly
                value={gpsLocationUrl}
                placeholder={t('gpsNotCaptured')}
                className={`w-full rounded-xl border p-3 text-xs sm:text-sm font-mono transition select-all focus:outline-none ${
                  gpsLocationUrl
                    ? 'border-emerald-400 bg-emerald-50/60 text-emerald-950 font-semibold cursor-default'
                    : 'border-slate-300 bg-slate-100/70 text-slate-500 cursor-not-allowed'
                }`}
              />
              {gpsLocationUrl && (
                <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t('gpsCapturedSuccess')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGpsLocationUrl('')}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>إعادة التحديد / Reset</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Manual Descriptive Address */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 mb-2">
              {t('manualAddressTitle')}
            </h2>
            <textarea
              rows={3}
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder={t('manualAddressPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {/* 5. Issue Details */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
            <label className="block text-sm font-bold text-slate-900 mb-3">
              {t('issueDetailsTitle')}
            </label>
            <textarea
              rows={3}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder={t('issuePlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700 hover:text-white disabled:opacity-50 transition transform active:scale-[0.99]"
          >
            {loading ? t('dispatching') : t('requestHelpBtn')}
          </button>
        </form>
      )}

      {/* Technician Profile Inspection Modal */}
      {showTechProfile && techProfileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setShowTechProfile(false)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
                <Wrench className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('techProfileModalTitle')}</h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('fullName')}</span>
                <span className="font-bold text-slate-800">{techProfileData.user?.fullName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('phoneNumber')}</span>
                <span className="font-semibold text-slate-800 font-mono">{techProfileData.user?.phoneNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('workplace')}</span>
                <span className="font-semibold text-slate-800">{techProfileData.workplace || t('independentSpecialist')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('experience')}</span>
                <span className="font-semibold text-slate-800">{techProfileData.careerExperience || t('notRatedYet')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('toolsEquipment')}</span>
                <span className="font-bold text-emerald-600">{techProfileData.hasTools ? t('yesEquipped') : t('no')}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">{t('completedJobs')}</span>
                <span className="font-bold text-slate-800">{techProfileData.totalCompletedJobs || 0}</span>
              </div>

              {/* Ratings Summary */}
              <div className="border-b pb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-500">{t('overallRating')}</span>
                  {techProfileData.totalCompletedJobs > 0 && techProfileData.averageQualityRating ? (
                    <span className="font-extrabold text-amber-700 flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      {((Number(techProfileData.averageQualityRating) + Number(techProfileData.averagePriceRating)) / 2).toFixed(1)} / 5
                    </span>
                  ) : (
                    <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {t('notRatedYet')}
                    </span>
                  )}
                </div>
                {techProfileData.totalCompletedJobs > 0 && techProfileData.averageQualityRating && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                    <div>{t('qualityRating')}: <strong>⭐ {Number(techProfileData.averageQualityRating).toFixed(1)}/5</strong></div>
                    <div>{t('priceRating')}: <strong>⭐ {Number(techProfileData.averagePriceRating).toFixed(1)}/5</strong></div>
                  </div>
                )}
              </div>

              <div className="border-b pb-2">
                <span className="text-slate-500 block mb-1">{t('vehicleSpecialties')}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {techProfileData.vehicleSpecialties?.length ? techProfileData.vehicleSpecialties.map((v: string) => (
                    <span key={v} className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[11px] font-bold">{t(v)}</span>
                  )) : <span className="text-slate-400">{t('allVehicles')}</span>}
                </div>
              </div>

              <div className="border-b pb-2">
                <span className="text-slate-500 block mb-1">{t('malfunctionSpecialties')}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {techProfileData.malfunctionSpecialties?.length ? techProfileData.malfunctionSpecialties.map((m: string) => (
                    <span key={m} className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold">{t(m)}</span>
                  )) : <span className="text-slate-400">{t('allMalfunctions')}</span>}
                </div>
              </div>

              {/* Previous Customer Reviews */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  {t('previousReviews')} ({techProfileData.reviews?.length || 0})
                </h4>
                {techProfileData.reviews && techProfileData.reviews.length > 0 ? (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pe-1">
                    {techProfileData.reviews.map((rev: any) => (
                      <div key={rev.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{rev.request?.customer?.fullName || t('customerRole')}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-3 text-[11px] text-amber-700 font-extrabold mb-1">
                          <span>{t('qualityRating')}: ⭐ {rev.qualityScore}/5</span>
                          <span>{t('priceRating')}: ⭐ {rev.priceFairnessScore}/5</span>
                        </div>
                        {rev.comment && <p className="text-slate-600 italic">"{rev.comment}"</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">
                    {t('noReviewsYet')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Rating Modal */}
      {showRatingModal && activeRequest?.status === 'COMPLETED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 border border-slate-200">
            <h3 className="text-base font-black text-slate-900">{t('rateServiceTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('rateServiceDesc')}
            </p>
            <form onSubmit={handleRatingSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('workQualityRating')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onClick={() => setQualityScore(star)}
                      className={`h-6 w-6 cursor-pointer transition ${
                        qualityScore >= star ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('priceFairnessRating')}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onClick={() => setPriceScore(star)}
                      className={`h-6 w-6 cursor-pointer transition ${
                        priceScore >= star ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('optionalFeedback')}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                rows={2}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-extrabold text-slate-950 hover:from-amber-600 hover:to-amber-700 hover:text-white shadow-md shadow-amber-500/20 transition"
              >
                {t('submitRating')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
