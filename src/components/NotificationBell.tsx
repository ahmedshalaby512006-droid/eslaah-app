import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2 } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  sendTestNotification,
  registerServiceWorker,
} from '../services/notificationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (isPushSupported()) {
      setSupported(true);
      setPermission(getNotificationPermission());
      registerServiceWorker();

      // If user is logged in and already granted permission, ensure this device's subscription is registered
      if (isAuthenticated && getNotificationPermission() === 'granted') {
        subscribeToPushNotifications().catch(() => {});
      }
    }
  }, [isAuthenticated]);

  if (!supported || !isAuthenticated) return null;

  const handleToggleNotifications = async () => {
    if (loading) return;

    if (permission === 'granted') {
      // Permission already granted: Ensure subscription is registered for THIS device, then send a test push
      setLoading(true);
      try {
        await subscribeToPushNotifications();
      } catch (err) {
        console.warn('Subscription sync warning:', err);
      }

      toast.promise(sendTestNotification(), {
        loading: 'جاري إرسال إشعار تجريبي لهاتفك...',
        success: 'تم إرسال الإشعار بنجاح! راجع شريط الإشعارات أعلى الشاشة.',
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

  const isGranted = permission === 'granted';

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
