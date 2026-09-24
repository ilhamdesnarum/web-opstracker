import React from 'react';
import { Activity, Briefcase, Package, DollarSign, Users, LogOut, ChevronRight } from 'lucide-react';

const HubCard = ({ title, description, icon: Icon, colorClass, isLocked, onClick }) => (
  <div 
    onClick={isLocked ? undefined : onClick}
    className={`relative group bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/80 hover:border-slate-600 hover:shadow-xl hover:-translate-y-1'}`}
  >
    {isLocked && (
      <div className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 bg-slate-900/80 text-slate-400 rounded-full border border-slate-700">
        Segera Hadir
      </div>
    )}
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${colorClass}`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-400 line-clamp-2">{description}</p>
    
    {!isLocked && (
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>
    )}
  </div>
);

const PortalHub = ({ username, onLogout, onSelectApp }) => {
  return (
    <div className="min-h-screen bg-slate-900 relative page-enter">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Desnarum Hub</h1>
            <p className="text-xs text-blue-400">Enterprise Workspace</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400 border border-slate-700 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Selamat Datang, {username}</h2>
          <p className="text-slate-400">Pilih modul aplikasi yang ingin Anda akses hari ini.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HubCard 
            title="OpsTracker"
            description="Pantau aktivasi, gangguan, dan laporan operasional harian."
            icon={Activity}
            colorClass="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20 shadow-lg"
            onClick={() => onSelectApp('opstracker')}
          />
          <HubCard 
            title="ProjectHub"
            description="Manajemen proyek, timeline, dan alokasi sumber daya."
            icon={Briefcase}
            colorClass="bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/20 shadow-lg"
            isLocked={true}
          />
          <HubCard 
            title="SCM"
            description="Supply Chain Management, stok ONT, dan inventaris."
            icon={Package}
            colorClass="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 shadow-lg"
            isLocked={true}
          />
          <HubCard 
            title="FinanceHub"
            description="Monitoring tagihan, pengeluaran operasional, dan invoice."
            icon={DollarSign}
            colorClass="bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20 shadow-lg"
            isLocked={true}
          />
          <HubCard 
            title="ManagementHub"
            description="Laporan eksekutif, KPI performa cabang, dan analisis SDM."
            icon={Users}
            colorClass="bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20 shadow-lg"
            isLocked={true}
          />
        </div>
      </main>
    </div>
  );
};

export default PortalHub;
