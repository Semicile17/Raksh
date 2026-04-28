'use client';

import { PatientList } from '@/components/layout/PatientList';
import { SimulationPanel } from '@/components/simulation/SimulationPanel';
import { Activity, ShieldAlert, Heart, Zap, Settings, UserCircle } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 shadow-lg shadow-teal-600/20">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">RAKSH</span>
            <div className="flex items-center gap-1.5 -mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Simulation Control</span>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink icon={<Activity size={18} />} label="Dashboard" active />
          <NavLink icon={<Heart size={18} />} label="Vitals" />
          <NavLink icon={<Zap size={18} />} label="Events" />
        </nav>

        <div className="flex items-center gap-4">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Settings size={20} />
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
          <div className="flex items-center gap-3 pl-2">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-slate-900 dark:text-white">Dr. Vaibhav</p>
               <p className="text-[10px] text-slate-500 uppercase tracking-tight">Chief Medical Officer</p>
             </div>
             <UserCircle className="h-10 w-10 text-slate-400" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Patient List */}
        <aside className="w-80 flex-shrink-0 bg-white dark:bg-slate-900">
          <PatientList />
        </aside>

        {/* Content - Simulation Panel */}
        <section className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          <SimulationPanel />
        </section>
      </div>
    </main>
  );
}

function NavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-2 text-sm font-bold transition-all ${
        active 
          ? 'text-teal-600 border-b-2 border-teal-600 pb-1' 
          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      {icon}
      {label}
    </a>
  );
}
