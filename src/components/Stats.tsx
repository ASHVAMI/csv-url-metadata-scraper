import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatsData {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  avgProcessingTime: number;
}

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('scraping_tasks')
        .select('*')
        .eq('user_id', user.user.id);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      const stats = {
        total: data.length,
        completed: data.filter(task => task.status === 'completed').length,
        failed: data.filter(task => task.status === 'failed').length,
        pending: data.filter(task => task.status === 'pending').length,
        avgProcessingTime: 0
      };

      setStats(stats);
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Scraping Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total URLs"
          value={stats.total}
          icon={<Clock className="h-6 w-6 text-blue-500" />}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          color="green"
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<XCircle className="h-6 w-6 text-red-500" />}
          color="red"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<RefreshCw className="h-6 w-6 text-yellow-500" />}
          color="yellow"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}