export interface MetadataResult {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  created_at: string;
  user_id: string;
}

export interface User {
  id: string;
  email: string;
}