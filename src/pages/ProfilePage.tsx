import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Wrench } from 'lucide-react';

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

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [password, setPassword] = useState('********');

  // Technician Specific States
  const [workplace, setWorkplace] = useState('');
  const [careerExperience, setCareerExperience] = useState('');
  const [hasTools, setHasTools] = useState(true);
  const [vehicleSpecialties, setVehicleSpecialties] = useState<string[]>([]);
  const [malfunctionSpecialties, setMalfunctionSpecialties] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(user?.role !== 'ADMIN');
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');

      api.get('/auth/me').then((res) => {
        if (res.data) {
          if (res.data.phoneNumber) setPhoneNumber(res.data.phoneNumber);
          if (res.data.fullName) setFullName(res.data.fullName);
        }
      }).catch(() => {});

      if (user.role === 'TECHNICIAN' || user.role === 'ENGINEER') {
        api.get('/auth/tech-profile').then((res) => {
          if (res.data) {
            if (res.data.user?.phoneNumber) setPhoneNumber(res.data.user.phoneNumber);
            if (res.data.user?.fullName) setFullName(res.data.user.fullName);
            setWorkplace(res.data.workplace || '');
            setCareerExperience(res.data.careerExperience || '');
            setHasTools(res.data.hasTools !== false);
            setVehicleSpecialties(res.data.vehicleSpecialties || []);
            setMalfunctionSpecialties(res.data.malfunctionSpecialties || []);
          }
        }).catch(() => {});
      }
    }
  }, [user]);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVerifyError('');
    try {
      await api.post('/auth/verify-password', { password: verifyPasswordInput });
      setIsAdminVerified(true);
    } catch {
      setVerifyError(t('incorrectPassword'));
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicle = (val: string) => {
    if (!isEditing) return;
    if (vehicleSpecialties.includes(val)) {
      setVehicleSpecialties(vehicleSpecialties.filter((v) => v !== val));
    } else {
      setVehicleSpecialties([...vehicleSpecialties, val]);
    }
  };

  const toggleMalfunction = (val: string) => {
    if (!isEditing) return;
    if (malfunctionSpecialties.includes(val)) {
      setMalfunctionSpecialties(malfunctionSpecialties.filter((m) => m !== val));
    } else {
      setMalfunctionSpecialties([...malfunctionSpecialties, val]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const passwordToSend = password && password !== '********' ? password : undefined;

    try {
      const response = await api.put('/auth/profile', {
        fullName,
        phoneNumber,
        ...(passwordToSend && { password: passwordToSend }),
      });
      updateUser(response.data);

      if (user?.role === 'TECHNICIAN' || user?.role === 'ENGINEER') {
        await api.patch('/auth/tech-profile', {
          workplace,
          careerExperience,
          hasTools,
          vehicleSpecialties,
          malfunctionSpecialties,
        });
      }

      setMessage(t('profileUpdatedSuccess'));
      setIsEditing(false);
    } catch {
      setMessage(t('profileUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminVerified) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-xl font-bold mb-4 text-slate-900">{t('adminSecurityGate')}</h1>
          <p className="text-sm text-slate-600 mb-6">{t('adminSecurityDesc')}</p>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={verifyPasswordInput}
              onChange={(e) => setVerifyPasswordInput(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-center focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white text-slate-900"
              required
            />
            {verifyError && <p className="text-sm text-red-500 font-bold">{verifyError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-amber-400 font-black py-3 rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? t('verifying') : t('unlockProfile')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-black mb-6 text-slate-900">{t('myProfile')}</h1>
      <form onSubmit={handleUpdate} className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        {user?.role !== 'ADMIN' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('fullName')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isEditing}
              className={`w-full border rounded-xl p-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-slate-900 transition-colors ${
                isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-50'
              }`}
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('phoneNumber')}</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={!isEditing}
            className={`w-full border rounded-xl p-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-slate-900 font-mono transition-colors ${
              isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-50'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!isEditing}
            className={`w-full border rounded-xl p-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-slate-900 transition-colors ${
              isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-50'
            }`}
            required
            minLength={8}
          />
        </div>

        {/* Technician Specific Fields */}
        {(user?.role === 'TECHNICIAN' || user?.role === 'ENGINEER') && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Wrench className="h-4 w-4" />
              </div>
              <h2 className="text-base font-black text-slate-900">{t('techProDetails')}</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('workplaceCompany')}</label>
              <input
                type="text"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                disabled={!isEditing}
                placeholder={t('workplaceCompanyPlaceholder')}
                className={`w-full border rounded-xl p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-slate-900 ${
                  isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-50'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('careerExperience')}</label>
              <input
                type="text"
                value={careerExperience}
                onChange={(e) => setCareerExperience(e.target.value)}
                disabled={!isEditing}
                placeholder={t('experiencePlaceholder')}
                className={`w-full border rounded-xl p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none text-slate-900 ${
                  isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-50'
                }`}
              />
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                id="profileHasTools"
                checked={hasTools}
                onChange={(e) => setHasTools(e.target.checked)}
                disabled={!isEditing}
                className="h-4 w-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <label htmlFor="profileHasTools" className="text-xs font-bold text-slate-800 cursor-pointer">
                {t('hasToolsFull')}
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('vehicleSpecialties')}</label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_OPTIONS.map((v) => {
                  const selected = vehicleSpecialties.includes(v.value);
                  return (
                    <button
                      type="button"
                      key={v.value}
                      onClick={() => toggleVehicle(v.value)}
                      disabled={!isEditing}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300'
                      } ${!isEditing ? 'opacity-80 cursor-default' : 'hover:bg-slate-50'}`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {t(v.value)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('malfunctionSpecialties')}</label>
              <div className="flex flex-wrap gap-2">
                {MALFUNCTION_OPTIONS.map((m) => {
                  const selected = malfunctionSpecialties.includes(m.value);
                  return (
                    <button
                      type="button"
                      key={m.value}
                      onClick={() => toggleMalfunction(m.value)}
                      disabled={!isEditing}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300'
                      } ${!isEditing ? 'opacity-80 cursor-default' : 'hover:bg-slate-50'}`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {t(m.value)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {message && <div className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{message}</div>}

        <div className="flex gap-3 pt-4">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setMessage('');
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-3 rounded-xl hover:from-amber-600 hover:to-amber-700 hover:text-white transition shadow-md shadow-amber-500/20"
            >
              {t('editProfile')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFullName(user?.fullName || '');
                  setPhoneNumber(user?.phoneNumber || '');
                  setPassword('********');
                  setMessage('');
                }}
                className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-3 rounded-xl hover:from-amber-600 hover:to-amber-700 hover:text-white disabled:opacity-50 transition shadow-md shadow-amber-500/20"
              >
                {loading ? t('saving') : t('saveChanges')}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
