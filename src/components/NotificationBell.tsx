import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  sendTestNotification,
  registerServiceWorker,
} from '../services/notificationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface NotificationBellProps {
  variant?: 'button' | 'banner';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ variant = 'button' }) => {
  const { isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (isSupported) {
      setPermission(getNotificationPermission());
      registerServiceWorker();

      // If user is logged in and already granted permission, ensure this device's subscription is registered
      if (isAuthenticated && getNotificationPermission() === 'granted') {
        subscribeToPushNotifications().catch(() => {});
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const handleToggleNotifications = async () => {
    if (loading) return;

    if (!supported) {
      toast(
        (t) => (
          <div className="flex flex-col gap-1 text-xs text-right">
            <span className="font-bold flex items-center gap-1 text-amber-700">
              <ShieldAlert className="h-4 w-4" /> يتطلب اتصالاً آمناً (HTTPS)
            </span>
            <span>
              نظام أندرويد يشترط فتح الموقع عبر رابط مشفر (https://...) لتمكين الإشعارات الخارجية في الخلفية.
            </span>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="mt-1 self-start bg-amber-600 text-white px-2 py-0.5 rounded text-[10px]"
            >
              حسناً
            </button>
          </div>
        ),
        { duration: 6000 }
      );
      return;
    }

    if (permission === 'granted') {
      setLoading(true);
      try {
        await subscribeToPushNotifications();
      } catch (err) {
        console.warn('Subscription sync warning:', err);
      }

      toast.promise(sendTestNotification(), {
        loading: 'جاري إرسال إشعار تجريبي لهاتفك...',
        success: 'تم إرسال الإشعار بنجاح! راجع شريط التنبيهات.',
        error: 'حدث خطأ أثناء إرسال الإشعار التجريبي.',
      }).finally(() => setLoading(false));
      return;
    }

    // Request permission and subscribe
    setLoading(true);
    try {
      const success = await subscribeToPushNotifications();
      const currentPerm = getNotificationPermission();
      setPermission(currentPerm);

      if (success) {
        toast.success('تم تفعيل إشعارات الهاتف بنجاح! 🔔 ستصلك تنبيهات الطلبات والعروض فوراً.');
        setTimeout(() => {
          sendTestNotification().catch(() => {});
        }, 800);
      } else if (currentPerm === 'denied') {
        toast.error('تم حظر الإشعارات من إعدادات المتصفح على هاتفك. يرجى تفعيلها من إعدادات الموقع.');
      } else {
        toast('لم يتم تفعيل الإشعارات بعد.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('تعذر تفعيل الإشعارات.');
    } finally {
      setLoading(false);
    }
  };

  const isGranted = permission === 'granted' && supported;

  if (variant === 'banner') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700">
            {isGranted ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">تنبيهات وإشعارات الهاتف اللحظية</h3>
            <p className="text-xs text-slate-600">
              {isGranted
                ? 'الإشعارات مفعلة بنجاح، ستصلك تنبيهات العروض وحالة الصيانة مباشرة على هاتفك.'
                : 'فعّل الإشعارات لتصلك تنبيهات العروض وحالة الصيانة حتى عند إغلاق المتصفح.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleNotifications}
          disabled={loading}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
            isGranted
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-600 hover:text-white'
          }`}
        >
          {isGranted ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>مفعلة (فحص إشعار)</span>
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              <span>تفعيل الإشعارات الآن</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleNotifications}
      disabled={loading}
      className={`relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition shadow-xs select-none ${
        isGranted
          ? 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900'
      }`}
      title={
        isGranted
          ? 'الإشعارات مفعلة - اضغط لإرسال إشعار تجريبي لهاتفك'
          : 'اضغط لتفعيل إشعارات الهاتف عند وصول طلبات أو عروض جديدة'
      }
    >
      {isGranted ? (
        <>
          <BellRing className="h-4 w-4 text-amber-600 animate-bounce" />
          <span className="hidden sm:inline">الإشعارات مفعلة</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 hidden sm:inline" />
        </>
      ) : (
        <>
          <div className="relative">
            <Bell className="h-4 w-4 text-slate-500" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <span className="hidden sm:inline">تفعيل الإشعارات</span>
        </>
      )}
    </button>
  );
};
