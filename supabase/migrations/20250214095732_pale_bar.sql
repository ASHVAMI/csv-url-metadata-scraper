/*
  # Create scraping tasks schema

  1. New Tables
    - `scraping_tasks`
      - `id` (uuid, primary key)
      - `url` (text, not null)
      - `title` (text)
      - `description` (text)
      - `keywords` (text[])
      - `status` (text, not null)
      - `error` (text)
      - `created_at` (timestamptz)
      - `user_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `scraping_tasks` table
    - Add policies for authenticated users to:
      - Insert their own tasks
      - Read their own tasks
      - Update their own tasks
*/

CREATE TABLE IF NOT EXISTS scraping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  keywords text[],
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE scraping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tasks"
  ON scraping_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own tasks"
  ON scraping_tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON scraping_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);