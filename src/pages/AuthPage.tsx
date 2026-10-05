import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth, RegisterPayload } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Wrench, ShieldAlert } from 'lucide-react';

interface ApiErrorResponse {
  message?: string;
}

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { user, login, register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'TECHNICIAN' || user.role === 'ENGINEER') {
        navigate('/technician');
      } else {
        navigate('/customer');
      }
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<RegisterPayload>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'CUSTOMER',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login({ phoneNumber: formData.phoneNumber, password: formData.password });
        const savedUser = localStorage.getItem('user');
        const role = savedUser ? JSON.parse(savedUser).role : 'CUSTOMER';
        navigate(role === 'ADMIN' ? '/admin' : role === 'TECHNICIAN' ? '/technician' : '/customer');
      } else {
        await register(formData);
        navigate(formData.role === 'ADMIN' ? '/admin' : formData.role === 'TECHNICIAN' ? '/technician' : '/customer');
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      setError(axiosError.response?.data?.message || t('authFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/25">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {isLogin ? t('welcomeBack') : t('createAccount')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {t('appName')} • Roadside Assistance Platform
          </p>
        </div>

        <div className="mb-6 flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`w-1/2 rounded-lg py-2 text-xs font-bold sm:text-sm transition ${
              isLogin ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('signIn')}
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`w-1/2 rounded-lg py-2 text-xs font-bold sm:text-sm transition ${
              !isLogin ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('register')}
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 sm:text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">{t('fullName')}</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
                  placeholder={t('fullNamePlaceholder')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">{t('email')}</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">{t('role')}</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none bg-white font-medium transition"
                >
                  <option value="CUSTOMER">{t('customerRole')}</option>
                  <option value="TECHNICIAN">{t('technicianRole')}</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">{t('phoneNumber')}</label>
            <input
              type="text"
              name="phoneNumber"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none font-mono transition"
              placeholder={t('phoneNumberPlaceholder')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">{t('password')}</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 hover:text-white disabled:opacity-50 transition"
          >
            {isSubmitting ? t('loading') : isLogin ? t('signIn') : t('createAccount')}
          </button>
        </form>
      </div>
    </div>
  );
};