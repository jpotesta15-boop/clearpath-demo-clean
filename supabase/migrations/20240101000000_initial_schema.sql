-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('coach', 'client')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs table
CREATE TABLE public.programs (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program assignments
CREATE TABLE public.program_assignments (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, client_id)
);

-- Videos table
CREATE TABLE public.videos (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video assignments
CREATE TABLE public.video_assignments (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, client_id)
);

-- Availability slots
CREATE TABLE public.availability_slots (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_group_session BOOLEAN DEFAULT FALSE,
  max_participants INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (bookings)
CREATE TABLE public.sessions (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  availability_slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE public.activity_log (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "Coaches can manage their clients" ON public.clients
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can view themselves" ON public.clients
  FOR SELECT USING (
    id IN (SELECT id FROM public.clients WHERE coach_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- Programs policies
CREATE POLICY "Coaches can manage their programs" ON public.programs
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can view assigned programs" ON public.program_assignments
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE coach_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- Videos policies
CREATE POLICY "Coaches can manage their videos" ON public.videos
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can view assigned videos" ON public.video_assignments
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE coach_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- Availability slots policies
CREATE POLICY "Coaches can manage their availability" ON public.availability_slots
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can view coach availability" ON public.availability_slots
  FOR SELECT USING (true);

-- Sessions policies
CREATE POLICY "Coaches can manage their sessions" ON public.sessions
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can view and request sessions" ON public.sessions
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE coach_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Clients can create session requests" ON public.sessions
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE coach_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    ))
  );

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Activity log policies
CREATE POLICY "Users can view their activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_clients_coach ON public.clients(coach_id);
CREATE INDEX idx_sessions_coach ON public.sessions(coach_id);
CREATE INDEX idx_sessions_client ON public.sessions(client_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

