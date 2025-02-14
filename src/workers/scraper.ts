import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../lib/supabase';

export async function scrapeUrl(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const title = $('title').text() || $('meta[property="og:title"]').attr('content');
    const description = 
      $('meta[name="description"]').attr('content') || 
      $('meta[property="og:description"]').attr('content');
    const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];

    return {
      title,
      description,
      keywords,
      status: 'completed' as const
    };
  } catch (error) {
    return {
      title: null,
      description: null,
      keywords: null,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Start processing function
export async function startProcessing() {
  const { data: tasks, error } = await supabase
    .from('scraping_tasks')
    .select('*')
    .eq('status', 'pending')
    .limit(10);

  if (error || !tasks) {
    console.error('Error fetching tasks:', error);
    return;
  }

  for (const task of tasks) {
    const result = await scrapeUrl(task.url);
    
    const { error: updateError } = await supabase
      .from('scraping_tasks')
      .update(result)
      .eq('id', task.id);

    if (updateError) {
      console.error('Error updating task:', updateError);
    }
  }

  // Schedule next batch
  setTimeout(startProcessing, 5000);
}

// Start the processing loop
startProcessing();