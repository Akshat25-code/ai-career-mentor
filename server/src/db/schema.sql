-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_data (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  status VARCHAR(50), -- 'student', 'graduate', 'switcher'
  target_role VARCHAR(100),
  skill_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  graduation_year INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resume uploads + analysis results (also serves as version history)
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source VARCHAR(20) NOT NULL, -- 'pdf' | 'text'
  target_role VARCHAR(100),
  raw_text TEXT NOT NULL,
  ats_score INT,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_created ON resumes(user_id, created_at DESC);

-- Interview sessions + transcripts
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  interview_type VARCHAR(30) NOT NULL, -- 'behavioral' | 'technical' | 'case'
  difficulty VARCHAR(20) NOT NULL, -- 'entry' | 'mid' | 'senior'
  target_role VARCHAR(100),
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_score INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interviews_user_created ON interview_sessions(user_id, created_at DESC);

-- Roadmaps stored as JSONB (phases + milestones)
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  target_role VARCHAR(100) NOT NULL,
  roadmap_data JSONB NOT NULL,
  progress_percent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monthly usage counters for freemium limits
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID NOT NULL REFERENCES users(id),
  period_ym VARCHAR(7) NOT NULL, -- e.g. '2025-12'
  resume_analyses_used INT NOT NULL DEFAULT 0,
  interviews_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, period_ym)
);
