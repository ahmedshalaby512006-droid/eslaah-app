import React, { useState, useEffect, FormEvent } from 'react';
import { LucideIcon, Car, Truck, Bike, Bus, AlertCircle, Zap, Shield, HelpCircle, Star } from 'lucide-react';
import api from '../api/client';
import { ChatBox } from '../components/ChatBox';


interface VehicleOption {
  type: string;
  label: string;
  icon: LucideIcon;
}

interface MalfunctionOption {
  type: string;
  label: string;
  icon: LucideIcon;
}

export interface ServiceRequest {
  id: string;
  vehicleType: string;
  malfunctionCategory: string;
  addressDescription?: string;
  status: 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

const VEHICLES: VehicleOption[] = [
  { type: 'SEDAN', label: 'Sedan', icon: Car },
  { type: 'SUV', label: 'SUV', icon: Car },
  { type: 'MOTORCYCLE', label: 'Motorcycle', icon: Bike },
  { type: 'HEAVY_TRUCK', label: 'Truck', icon: Truck },
  { type: 'BUS', label: 'Bus', icon: Bus },
];

const MALFUNCTIONS: MalfunctionOption[] = [
  { type: 'ELECTRICAL', label: 'Electrical', icon: Zap },
  { type: 'MECHANICAL', label: 'Mechanical', icon: AlertCircle },
  { type: 'TIRE_AND_WHEEL', label: 'Flat Tire', icon: HelpCircle },
  { type: 'BODY_AND_CHASSIS', label: 'Body/Chassis', icon: Shield },
  { type: 'BATTERY_JUMP', label: 'Dead Battery', icon: Zap },
  { type: 'TOWING', label: 'Towing Service', icon: Truck },
];

export const CustomerDashboard: React.FC = () => {
  const [vehicleType, setVehicleType] = useState<string>('SEDAN');
  const [malfunctionCategory, setMalfunctionCategory] = useState<string>('MECHANICAL');
  const [addressDescription, setAddressDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);

  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [priceScore, setPriceScore] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState('');

const fetchActiveRequest = async () => {
    try {
      const res = await api.get('/requests/active');
      if (!res.data || res.data.status === 'COMPLETED' || res.data.status === 'CANCELLED') {
        setActiveRequest(null);
      } else {
        setActiveRequest(res.data);
      }
    } catch (err) {
      setActiveRequest(null);
    }
  };

// 1. فحص لمرة واحدة فقط عند فتح الصفحة
useEffect(() => {
  void fetchActiveRequest();
}, []);

// 2. تفعيل المراقبة فقط طالما يوجد طلب نشط بالفعل
useEffect(() => {
  // إذا لم يكن هناك طلب، لا تشغل أي مؤقت
  if (!activeRequest) return;

  const interval = setInterval(() => {
    void fetchActiveRequest();
  }, 2000);

  return () => clearInterval(interval);
}, [activeRequest]);

const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('خاصية تحديد الموقع غير مدعومة في متصفحك');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setAddressDescription(mapsUrl);
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        alert('تعذر جلب موقعك، يرجى تفعيل إذن الوصول للموقع (GPS)');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateRequest = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post<ServiceRequest>('/requests', {
        vehicleType,
        malfunctionCategory,
        addressDescription: `${addressDescription}\n Issue Description: ${issueDescription}`,
      });
      setActiveRequest(response.data);
    } catch {
      alert('Failed to submit request');
    } finally {
      setLoading(false);
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
      alert('Thank you for rating!');
    } catch {
      alert('Failed to submit rating.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {activeRequest ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Active Request</span>
              <h2 className="text-lg font-bold text-slate-800">{activeRequest.malfunctionCategory} Assistance</h2>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {activeRequest.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Vehicle</p>
              <p className="font-semibold text-slate-700">{activeRequest.vehicleType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Location Notes</p>
              <div className="mt-1 space-y-1 text-xs sm:text-sm">
  {activeRequest.addressDescription?.split('\n').map((line: string, index: number) => {
    const isUrl = line.trim().startsWith('http');
    return isUrl ? (
      <a
        key={index}
        href={line.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-blue-600 underline break-all hover:text-blue-800"
      >
        📍 My Location
      </a>
    ) : (
      <p key={index} className="text-slate-700 font-semibold break-words">
        {line}
      </p>
    );
  })}
</div>
            </div>
          </div>

          {activeRequest.status === 'COMPLETED' && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
            >
              Rate Service
            </button>
          )}

          {activeRequest && activeRequest.status === 'ACCEPTED' && (
          <ChatBox
            requestId={activeRequest.id}
             currentUserId={(activeRequest as any).customerId}
            currentUserRole="CUSTOMER"
          
          />
        )}

          {(activeRequest.status as string) === 'QUEUED' && (
            <button
              onClick={async () => {
                try {
                  await api.patch(`/requests/${activeRequest.id}/cancel`);
                  setActiveRequest(null);
                } catch (err: any) {
                  alert(err.response?.data?.message || 'فشل إلغاء الطلب');
                }
              }}
              className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition"
            >
              إلغاء الطلب
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleCreateRequest} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-tight text-slate-800">1. Select Vehicle Type</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {VEHICLES.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    type="button"
                    key={v.type}
                    onClick={() => setVehicleType(v.type)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                      vehicleType === v.type
                        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="mb-2 h-6 w-6" />
                    <span className="text-xs">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 text-sm font-bold tracking-tight text-slate-800">2. Select Issue Type</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MALFUNCTIONS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    type="button"
                    key={m.type}
                    onClick={() => setMalfunctionCategory(m.type)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                      malfunctionCategory === m.type
                        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="mb-2 h-6 w-6" />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-sm font-bold tracking-tight text-slate-800">
      3. Current Location or Maps Link
    </h2>
    <button
      type="button"
      onClick={handleGetCurrentLocation}
      disabled={isLocating}
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 disabled:opacity-50"
    >
      <svg className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {isLocating ? 'جاري التحديد...' : 'تحديد موقعي الحالي'}
    </button>
  </div>
  <textarea
    rows={3}
    value={addressDescription}
    onChange={(e) => setAddressDescription(e.target.value)}
    placeholder="e.g. Paste Google Maps link... OR Enter your current location address..."
    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-none"
  />
</div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <label className="block text-sm font-semibold text-slate-900 mb-3">
    4. Issue or Repair Details
  </label>
  <textarea
    rows={3}
    value={issueDescription}
    onChange={(e) => setIssueDescription(e.target.value)}
    placeholder="e.g. Engine overheating, flat tire, battery won't start..."
    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
  />
</div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Dispatching...' : 'Request Emergency Roadside Help'}
          </button>
        </form>
      )}

      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Rate Your Service</h3>
            <form onSubmit={handleRatingSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Work Quality (1-5)</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onClick={() => setQualityScore(star)}
                      className={`h-6 w-6 cursor-pointer ${
                        qualityScore >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Price Fairness (1-5)</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onClick={() => setPriceScore(star)}
                      className={`h-6 w-6 cursor-pointer ${
                        priceScore >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                rows={2}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Submit Rating
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};