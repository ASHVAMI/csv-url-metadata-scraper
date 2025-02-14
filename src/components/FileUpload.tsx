import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export function FileUpload() {
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState<{ valid: number; invalid: number } | null>(null);

  const validateUrls = (urls: string[]) => {
    const urlPattern = new RegExp(
      '^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i' // fragment locator
    );

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    urls.forEach(url => {
      if (urlPattern.test(url)) {
        validUrls.push(url);
      } else {
        invalidUrls.push(url);
      }
    });

    return { validUrls, invalidUrls };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;

    setValidating(true);
    setStats(null);

    try {
      Papa.parse(file, {
        complete: async (results) => {
          const urls = results.data.flat().filter(url => url && typeof url === 'string');
          
          if (urls.length === 0) {
            toast.error('No valid URLs found in the CSV file');
            return;
          }

          const { validUrls, invalidUrls } = validateUrls(urls);
          setStats({ valid: validUrls.length, invalid: invalidUrls.length });

          if (validUrls.length === 0) {
            toast.error('No valid URLs found in the CSV file');
            return;
          }

          const { data: user } = await supabase.auth.getUser();
          
          if (!user) {
            toast.error('Please login first');
            return;
          }

          const { error } = await supabase.from('scraping_tasks').insert(
            validUrls.map(url => ({
              url,
              status: 'pending',
              user_id: user.user.id
            }))
          );

          if (error) throw error;
          
          toast.success(`Added ${validUrls.length} URLs for processing`);
          if (invalidUrls.length > 0) {
            toast.error(`${invalidUrls.length} invalid URLs were skipped`);
          }
        },
        error: (error) => {
          toast.error(`Error parsing CSV: ${error.message}`);
        }
      });
    } catch (error) {
      toast.error('Failed to process file');
      console.error(error);
    } finally {
      setValidating(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          {validating ? (
            <Upload className="mx-auto h-12 w-12 text-blue-500 animate-bounce" />
          ) : isDragActive ? (
            <Upload className="mx-auto h-12 w-12 text-blue-500" />
          ) : (
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
          )}
          <div>
            <p className="text-base font-medium text-gray-900">
              {validating ? 'Validating URLs...' : 
                isDragActive ? 'Drop the CSV file here' : 'Upload your CSV file'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Drag and drop a CSV file containing URLs, or click to select
            </p>
          </div>
          <div className="text-xs text-gray-500">
            CSV format: One URL per line
          </div>
        </div>
      </div>

      {stats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <span className="text-gray-600">Valid URLs: {stats.valid}</span>
            </div>
            {stats.invalid > 0 && (
              <div className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                <span className="text-gray-600">Invalid URLs: {stats.invalid}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}