import { socket } from '../socket';
import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Star, MessageSquare, Search, Filter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();

  useEffect(() => {
    socket.on('data_updated', () => {
      void fetchData();
    });
    return () => {
      socket.off('data_updated');
    };
  }, []);

  const isUserActive = (user: any) => {
    if (!user.isOnline) return false;
    if (!user.lastSeen) return false;
    return (new Date().getTime() - new Date(user.lastSeen).getTime()) < 90000; // 90 seconds
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for requests
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Filters for technicians
  const [techRatingFilter, setTechRatingFilter] = useState('ALL');
  const [techSearchQuery, setTechSearchQuery] = useState('');

  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, reqsRes, custRes, techRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/requests/all'),
        api.get('/admin/users?role=CUSTOMER'),
        api.get('/admin/users?role=TECHNICIAN')
      ]);
      setStats(statsRes.data);
      setRequests(reqsRes.data);
      setUsers([...custRes.data, ...techRes.data]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/ban`);
      fetchData();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, isBanned: !selectedUser.isBanned });
      }
    } catch {
      alert('Error updating ban status');
    }
  };

  const openUserDetails = async (user: any) => {
    setSelectedUser(user);
    try {
      const res = await api.get(`/admin/users/${user.id}/requests`);
      setUserRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !stats) return <div className="p-8 text-center text-slate-500 font-bold">{t('loading')}</div>;

  const requestStatsData = [
    { name: t('completedStat'), value: stats.requests.completed, color: '#10b981' },
    { name: t('cancelledStat'), value: stats.requests.cancelled, color: '#ef4444' },
    { name: t('inProgressStat'), value: stats.requests.inProgress, color: '#f59e0b' },
    { name: t('dispatchedStat'), value: stats.requests.dispatched, color: '#ea580c' },
    { name: t('queuedStat'), value: stats.requests.queued, color: '#64748b' },
  ];

  const userStatsData = [
    { name: t('customersStat'), value: stats.users.customers, color: '#475569' },
    { name: t('techniciansStat'), value: stats.users.technicians, color: '#f59e0b' },
  ];

  const onlineStatsData = [
    { name: t('onlineTechs'), value: stats.users.onlineTechs, color: '#22c55e' },
    { name: t('offlineTechs'), value: stats.users.offlineTechs, color: '#94a3b8' },
  ];

  const filteredRequests = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter && r.malfunctionCategory !== typeFilter) return false;
    return true;
  });

  // Filter and sort technicians
  let filteredTechnicians = users.filter(u => u.role === 'TECHNICIAN');
  if (techSearchQuery) {
    const q = techSearchQuery.toLowerCase();
    filteredTechnicians = filteredTechnicians.filter(u =>
      u.fullName.toLowerCase().includes(q) || (u.phoneNumber && u.phoneNumber.includes(q))
    );
  }

  if (techRatingFilter === 'NOT_RATED') {
    filteredTechnicians = filteredTechnicians.filter(u => (u.technicianProfile?.totalCompletedJobs || 0) === 0);
  } else if (techRatingFilter === 'OVERALL') {
    filteredTechnicians = filteredTechnicians
      .filter(u => (u.technicianProfile?.totalCompletedJobs || 0) > 0)
      .sort((a, b) => {
        const scoreA = (Number(a.technicianProfile?.averageQualityRating || 0) + Number(a.technicianProfile?.averagePriceRating || 0)) / 2;
        const scoreB = (Number(b.technicianProfile?.averageQualityRating || 0) + Number(b.technicianProfile?.averagePriceRating || 0)) / 2;
        return scoreB - scoreA;
      });
  } else if (techRatingFilter === 'QUALITY') {
    filteredTechnicians = filteredTechnicians
      .filter(u => (u.technicianProfile?.totalCompletedJobs || 0) > 0)
      .sort((a, b) => Number(b.technicianProfile?.averageQualityRating || 0) - Number(a.technicianProfile?.averageQualityRating || 0));
  } else if (techRatingFilter === 'PRICE') {
    filteredTechnicians = filteredTechnicians
      .filter(u => (u.technicianProfile?.totalCompletedJobs || 0) > 0)
      .sort((a, b) => Number(b.technicianProfile?.averagePriceRating || 0) - Number(a.technicianProfile?.averagePriceRating || 0));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('adminPanelTitle')}</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Automotive Fleet & Operations Center</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'dashboard', label: t('tabDashboard') },
          { key: 'transactions', label: t('tabTransactions') },
          { key: 'customers', label: t('tabCustomers') },
          { key: 'technicians', label: t('tabTechnicians') }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition ${activeTab === tab.key ? 'bg-slate-950 text-amber-400 shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-1">{t('totalRequests')}</h3>
              <p className="text-2xl font-black text-slate-900">{stats.requests.total}</p>
            </div>
            <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-1">{t('totalUsers')}</h3>
              <p className="text-2xl font-black text-slate-900">{stats.users.customers + stats.users.technicians}</p>
            </div>
            <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-1">{t('completedStat')}</h3>
              <p className="text-2xl font-black text-emerald-600">{stats.requests.completed}</p>
            </div>
            <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-slate-500 text-xs font-bold uppercase mb-1">{t('cancelledStat')}</h3>
              <p className="text-2xl font-black text-red-600">{stats.requests.cancelled}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 h-72">
              <h3 className="text-sm font-bold text-slate-900 mb-4 text-center">{t('requestsOverview')}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {requestStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 h-72">
              <h3 className="text-sm font-bold text-slate-900 mb-4 text-center">{t('usersBreakdown')}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userStatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {userStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 h-72">
              <h3 className="text-sm font-bold text-slate-900 mb-4 text-center">{t('techPresence')}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={onlineStatsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {onlineStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <div className="mb-4 flex flex-wrap gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 p-2.5 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-amber-500">
              <option value="">{t('allStatuses')}</option>
              <option value="QUEUED">{t('statusQueued')}</option>
              <option value="DISPATCHING">{t('statusDispatching')}</option>
              <option value="ACCEPTED">{t('statusAccepted')}</option>
              <option value="ARRIVED">{t('statusArrived')}</option>
              <option value="IN_PROGRESS">{t('statusInProgress')}</option>
              <option value="COMPLETED">{t('statusCompleted')}</option>
              <option value="CANCELLED">{t('statusCancelled')}</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-300 p-2.5 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-amber-500">
              <option value="">{t('allCategories')}</option>
              <option value="MECHANICAL">{t('MECHANICAL')}</option>
              <option value="ELECTRICAL">{t('ELECTRICAL')}</option>
              <option value="TIRE_AND_WHEEL">{t('TIRE_AND_WHEEL')}</option>
              <option value="BATTERY_JUMP">{t('BATTERY_JUMP')}</option>
              <option value="TOWING">{t('TOWING')}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">{t('tableId')}</th>
                  <th className="px-4 py-3">{t('tableDate')}</th>
                  <th className="px-4 py-3">{t('tableCustomer')}</th>
                  <th className="px-4 py-3">{t('tableTechnician')}</th>
                  <th className="px-4 py-3">{t('tableStatus')}</th>
                  <th className="px-4 py-3">{t('tableService')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
                  <tr key={req.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{req.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs">{new Date(req.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{req.customer?.fullName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{req.technician?.user?.fullName || t('unassigned')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                        req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        req.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                        req.status === 'QUEUED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {t(`status${req.status.charAt(0) + req.status.slice(1).toLowerCase()}`) || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{t(req.malfunctionCategory)} - {t(req.vehicleType)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {users.filter(u => u.role === 'CUSTOMER').map(user => (
              <div key={user.id} onClick={() => openUserDetails(user)} className="border border-slate-200 p-4 rounded-2xl cursor-pointer hover:border-amber-400 hover:shadow-sm transition bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">{user.fullName}</h4>
                  <div className="flex gap-1">
                    {user.isBanned && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{t('banned')}</span>}
                    {!user.isBanned && isUserActive(user) && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">{t('active')}</span>}
                    {!user.isBanned && !isUserActive(user) && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{t('inactive')}</span>}
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{user.phoneNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'technicians' && (
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          {/* Technicians Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
                <Filter className="h-4 w-4 text-amber-600" /> {t('filterAndSort')}
              </div>
              <button
                type="button"
                onClick={() => setTechRatingFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  techRatingFilter === 'ALL' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t('allTechnicians')}
              </button>
              <button
                type="button"
                onClick={() => setTechRatingFilter('OVERALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  techRatingFilter === 'OVERALL' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t('topOverallRating')}
              </button>
              <button
                type="button"
                onClick={() => setTechRatingFilter('QUALITY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  techRatingFilter === 'QUALITY' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t('highestQuality')}
              </button>
              <button
                type="button"
                onClick={() => setTechRatingFilter('PRICE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  techRatingFilter === 'PRICE' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t('bestPrice')}
              </button>
              <button
                type="button"
                onClick={() => setTechRatingFilter('NOT_RATED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  techRatingFilter === 'NOT_RATED' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t('notRatedYetFilter')}
              </button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 absolute start-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={techSearchQuery}
                onChange={e => setTechSearchQuery(e.target.value)}
                placeholder={t('searchTechnician')}
                className="ps-9 pe-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 w-48 sm:w-60"
              />
            </div>
          </div>

          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map(user => {
              const completedCount = user.technicianProfile?.totalCompletedJobs || 0;
              const hasRating = completedCount > 0;
              const avgQuality = user.technicianProfile?.averageQualityRating ? Number(user.technicianProfile.averageQualityRating).toFixed(1) : null;
              const avgPrice = user.technicianProfile?.averagePriceRating ? Number(user.technicianProfile.averagePriceRating).toFixed(1) : null;
              const overallAvg = (avgQuality && avgPrice) ? ((Number(avgQuality) + Number(avgPrice)) / 2).toFixed(1) : null;

              return (
                <div
                  key={user.id}
                  onClick={() => openUserDetails(user)}
                  className="border border-slate-200 p-4 rounded-2xl cursor-pointer hover:border-amber-400 hover:shadow-md transition bg-white space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-sm">{user.fullName}</h4>
                    <div className="flex gap-1">
                      {user.isBanned && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{t('banned')}</span>}
                      {!user.isBanned && isUserActive(user) && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">{t('active')}</span>}
                      {!user.isBanned && !isUserActive(user) && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{t('inactive')}</span>}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-mono text-slate-700">{user.phoneNumber}</p>
                    <p>{user.email}</p>
                    {user.technicianProfile?.workplace && (
                      <p className="font-medium text-slate-800">{t('workshopLabel')} {user.technicianProfile.workplace}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    {hasRating && overallAvg ? (
                      <div className="flex items-center gap-1 font-extrabold text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <span>{overallAvg} / 5</span>
                        <span className="text-[10px] text-slate-400 font-normal">({completedCount} {t('jobsCount')})</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded text-[11px]">
                        {t('notRatedYet')}
                      </span>
                    )}

                    {hasRating && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        {t('qualityShort')}: <strong>{avgQuality}</strong> | {t('priceShort')}: <strong>{avgPrice}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto border border-slate-200">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-xl font-black mb-4 text-slate-900">{selectedUser.fullName} - {t('userDetails')}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl text-sm border border-slate-200">
              <div><strong className="text-slate-700">{t('email')}:</strong> {selectedUser.email}</div>
              <div><strong className="text-slate-700">{t('phone')}:</strong> <span className="font-mono">{selectedUser.phoneNumber}</span></div>
              <div><strong className="text-slate-700">{t('role')}:</strong> {selectedUser.role === 'TECHNICIAN' ? t('technicianRole') : selectedUser.role === 'CUSTOMER' ? t('customerRole') : selectedUser.role}</div>
              <div><strong className="text-slate-700">{t('accountStatus')}</strong> {selectedUser.isBanned ? <span className="text-red-600 font-bold">{t('banned')}</span> : <span className="text-emerald-600 font-bold">{t('valid')}</span>}</div>
              <div><strong className="text-slate-700">{t('presence')}</strong> {isUserActive(selectedUser) ? <span className="text-emerald-600 font-bold">{t('active')}</span> : <span className="text-slate-500 font-bold">{t('inactive')}</span>}</div>

              {selectedUser.technicianProfile && (
                <>
                  <div><strong className="text-slate-700">{t('completedJobs')}:</strong> {selectedUser.technicianProfile.totalCompletedJobs}</div>
                  <div><strong className="text-slate-700">{t('workplace')}:</strong> {selectedUser.technicianProfile.workplace || t('independentSpecialist')}</div>
                  <div><strong className="text-slate-700">{t('toolsAvailable')}</strong> {selectedUser.technicianProfile.hasTools ? t('yes') : t('no')}</div>
                  <div><strong className="text-slate-700">{t('qualityRating')}:</strong> {selectedUser.technicianProfile.totalCompletedJobs > 0 ? `${selectedUser.technicianProfile.averageQualityRating}/5` : t('notRatedYet')}</div>
                  <div><strong className="text-slate-700">{t('priceRating')}:</strong> {selectedUser.technicianProfile.totalCompletedJobs > 0 ? `${selectedUser.technicianProfile.averagePriceRating}/5` : t('notRatedYet')}</div>
                  <div><strong className="text-slate-700">{t('overallRating')}:</strong> {selectedUser.technicianProfile.totalCompletedJobs > 0 ? `${((Number(selectedUser.technicianProfile.averageQualityRating) + Number(selectedUser.technicianProfile.averagePriceRating)) / 2).toFixed(1)}/5` : t('notRatedYet')}</div>
                </>
              )}
            </div>

            <div className="mb-6 flex gap-4">
              <button 
                onClick={() => handleBanToggle(selectedUser.id)} 
                className={`px-4 py-2 rounded-xl font-bold text-white text-sm transition ${selectedUser.isBanned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {selectedUser.isBanned ? t('unbanUser') : t('banUser')}
              </button>
            </div>

            {/* Performance Chart for Tech */}
            {selectedUser.role === 'TECHNICIAN' && (
              <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 text-sm">{t('monthlyPerformance')}</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={
                      Array.from({ length: 30 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const dateStr = d.toLocaleDateString();
                        const count = userRequests.filter(r => r.status === 'COMPLETED' && new Date(r.createdAt).toLocaleDateString() === dateStr).length;
                        return { date: dateStr, completed: count };
                      })
                    }>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 8}} tickFormatter={(t) => t.split('/')[0] + '/' + t.split('/')[1]} />
                      <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="completed" stroke="#f59e0b" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Customer Reviews & Feedback Section */}
            {selectedUser.role === 'TECHNICIAN' && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b pb-2">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  {t('customerReviewsTitle')}
                </h3>
                {userRequests.filter(r => r.rating).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">{t('noReviewsAdmin')}</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pe-1">
                    {userRequests.filter(r => r.rating).map(r => (
                      <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{r.customer?.fullName || t('customerRole')}</span>
                          <span className="text-slate-400 text-[10px]">{new Date(r.rating.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-3 text-amber-700 font-extrabold mb-1 text-[11px]">
                          <span>{t('workQualityRating')}: ⭐ {r.rating.qualityScore}/5</span>
                          <span>{t('priceFairnessRating')}: ⭐ {r.rating.priceFairnessScore}/5</span>
                        </div>
                        {r.rating.comment && (
                          <p className="text-slate-600 italic">"{r.rating.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transaction List */}
            <h3 className="font-bold text-slate-800 mb-3 border-b pb-2 text-sm">
              {selectedUser.role === 'TECHNICIAN' ? t('allJobsServiced') : t('customerRequestsMade')}
            </h3>
            <div className="space-y-2.5">
              {userRequests.length === 0 ? (
                <p className="text-sm text-slate-500 italic">{t('noPastTransactions')}</p>
              ) : (
                userRequests.map(r => (
                  <div key={r.id} className="border border-slate-200 p-3 rounded-xl flex justify-between items-center bg-white shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-slate-900 mb-0.5">{t(r.malfunctionCategory)} - {t(r.vehicleType)}</div>
                      <div className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</div>
                      {selectedUser.role === 'TECHNICIAN' && r.customer && (
                        <div className="text-[11px] text-slate-600 mt-1">{t('customer')}: {r.customer.fullName} ({r.customer.phoneNumber})</div>
                      )}
                      {selectedUser.role === 'CUSTOMER' && r.technician && (
                        <div className="text-[11px] text-slate-600 mt-1">{t('technicianRole')}: {r.technician.user?.fullName}</div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      r.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {t(`status${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`) || r.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
