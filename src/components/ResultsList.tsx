import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MetadataResult } from '../types';
import { RefreshCw, Link, AlertCircle, CheckCircle, Download, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ResultsList() {
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');

  useEffect(() => {
    const fetchResults = async () => {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('scraping_tasks')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      setResults(data);
      setLoading(false);
    };

    fetchResults();

    const channel = supabase
      .channel('scraping_tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'scraping_tasks' },
        (payload) => {
          setResults(current => {
            const updated = [...current];
            const index = updated.findIndex(item => item.id === payload.new.id);
            if (index >= 0) {
              updated[index] = payload.new;
            } else {
              updated.unshift(payload.new);
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExport = () => {
    const filteredResults = results
      .filter(result => filter === 'all' || result.status === filter)
      .filter(result => 
        result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const csv = [
      ['URL', 'Title', 'Description', 'Keywords', 'Status', 'Created At'],
      ...filteredResults.map(result => [
        result.url,
        result.title || '',
        result.description || '',
        (result.keywords || []).join(', '),
        result.status,
        new Date(result.created_at).toLocaleString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metadata-export-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClearCompleted = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('scraping_tasks')
      .delete()
      .eq('user_id', user.user.id)
      .eq('status', 'completed');

    if (error) {
      toast.error('Failed to clear completed tasks');
      return;
    }

    toast.success('Cleared completed tasks');
    setResults(prev => prev.filter(result => result.status !== 'completed'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No URLs processed yet</h3>
        <p className="mt-2 text-gray-500">Upload a CSV file to start scraping metadata</p>
      </div>
    );
  }

  const filteredResults = results
    .filter(result => filter === 'all' || result.status === filter)
    .filter(result => 
      result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Processing Results</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearCompleted}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Completed</span>
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search URLs, titles, or descriptions..."
              className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keywords
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResults.map((result) => (
              <tr key={result.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-xs"
                    >
                      {result.url}
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${result.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      result.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {result.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : result.status === 'failed' ? (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {result.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 truncate max-w-xs">
                    {result.title || '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-500 truncate max-w-xs">
                    {result.description || '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {result.keywords?.slice(0, 3).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {keyword}
                      </span>
                    ))}
                    {result.keywords && result.keywords.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{result.keywords.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}