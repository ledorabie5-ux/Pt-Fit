-- PT Fit Platform - Supabase PostgreSQL Schema
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/cjkmhwlevonoutcmcjxb/sql/new)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  uid TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'trainee', -- 'trainee', 'coach', 'admin'
  status TEXT NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  bio TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  experience_years INT DEFAULT 0,
  certifications JSONB DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  coach_id TEXT,
  coach_name TEXT,
  subscription_status TEXT DEFAULT 'inactive', -- 'active', 'expired', 'inactive', 'frozen'
  subscription_start TEXT,
  subscription_expiry TEXT,
  subscription_duration TEXT,
  is_frozen BOOLEAN DEFAULT FALSE,
  frozen_at TEXT,
  days_remaining_when_frozen INT DEFAULT 0,
  unfreeze_date TEXT,
  created_at TEXT DEFAULT NOW()::text,
  updated_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 2. Programs / Workout Plans Table
CREATE TABLE IF NOT EXISTS public.programs (
  id TEXT PRIMARY KEY,
  trainee_id TEXT UNIQUE NOT NULL,
  trainee_name TEXT,
  coach_id TEXT,
  coach_name TEXT,
  workout_days JSONB DEFAULT '[]'::jsonb,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT NOW()::text,
  updated_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 3. Nutrition Plans Table
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id TEXT PRIMARY KEY,
  trainee_id TEXT UNIQUE NOT NULL,
  trainee_name TEXT,
  coach_id TEXT,
  coach_name TEXT,
  daily_calories INT DEFAULT 2000,
  protein_grams INT DEFAULT 150,
  carbs_grams INT DEFAULT 200,
  fats_grams INT DEFAULT 60,
  water_liters NUMERIC DEFAULT 3.0,
  notes TEXT,
  meals JSONB DEFAULT '[]'::jsonb,
  created_at TEXT DEFAULT NOW()::text,
  updated_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 4. Exercise Videos Table
CREATE TABLE IF NOT EXISTS public.exercise_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  target_muscle TEXT,
  target_muscle_ar TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  description_ar TEXT,
  instructions JSONB DEFAULT '[]'::jsonb,
  instructions_ar JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 5. Progress Logs Table
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL,
  workout_day_id TEXT,
  workout_day_name TEXT,
  completed_at TEXT NOT NULL,
  completed_exercises JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  weight NUMERIC,
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'info',
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 7. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  message TEXT,
  media_url TEXT,
  media_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 8. Workout Templates Table
CREATE TABLE IF NOT EXISTS public.workout_templates (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  workout_days JSONB DEFAULT '[]'::jsonb,
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- 9. Nutrition Templates Table
CREATE TABLE IF NOT EXISTS public.nutrition_templates (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  daily_calories INT DEFAULT 2000,
  protein_grams INT DEFAULT 150,
  carbs_grams INT DEFAULT 200,
  fats_grams INT DEFAULT 60,
  meals JSONB DEFAULT '[]'::jsonb,
  created_at TEXT DEFAULT NOW()::text,
  data JSONB DEFAULT '{}'::jsonb
);

-- Storage Bucket Setup for Media & Uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('ptfit-media', 'ptfit-media', true),
  ('trainee_photos', 'trainee_photos', true),
  ('coach_photos', 'coach_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Security Policies
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;

CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id IN ('ptfit-media', 'trainee_photos', 'coach_photos'));
CREATE POLICY "Public Insert Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('ptfit-media', 'trainee_photos', 'coach_photos'));
CREATE POLICY "Public Update Access" ON storage.objects FOR UPDATE USING (bucket_id IN ('ptfit-media', 'trainee_photos', 'coach_photos'));
CREATE POLICY "Public Delete Access" ON storage.objects FOR DELETE USING (bucket_id IN ('ptfit-media', 'trainee_photos', 'coach_photos'));

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_coach_id ON public.users(coach_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_programs_trainee_id ON public.programs(trainee_id);
CREATE INDEX IF NOT EXISTS idx_programs_coach_id ON public.programs(coach_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_trainee_id ON public.nutrition_plans(trainee_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach_id ON public.nutrition_plans(coach_id);

CREATE INDEX IF NOT EXISTS idx_progress_logs_trainee_id ON public.progress_logs(trainee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_workout_templates_coach_id ON public.workout_templates(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_coach_id ON public.nutrition_templates(coach_id);

-- Enable Realtime for core live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.programs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_logs;

-- Row Level Security (RLS) & Table Access Policies
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users', 'programs', 'nutrition_plans', 'exercise_videos', 
    'progress_logs', 'notifications', 'chat_messages', 
    'workout_templates', 'nutrition_templates'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Access Policy All" ON public.%I;', t);
    EXECUTE format('CREATE POLICY "Access Policy All" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;



