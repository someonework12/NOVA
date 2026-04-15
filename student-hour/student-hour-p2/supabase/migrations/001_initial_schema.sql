-- =============================================
-- THE STUDENT HOUR — SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable pgvector for Nova memory embeddings (Phase 4)
create extension if not exists vector;

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           text,
  role            text not null default 'student' check (role in ('student','tutor','admin')),
  department      text,
  university      text,
  group_id        uuid,
  session_count   int default 0,
  onboarding_complete boolean default false,
  created_at      timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- STUDENT COURSES (weakness form submissions)
-- =============================================
create table if not exists student_courses (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid references profiles(id) on delete cascade,
  course_code         text not null,
  course_title        text not null,
  weakness_description text,
  created_at          timestamptz default now()
);

alter table student_courses enable row level security;

create policy "Students can manage own courses"
  on student_courses for all using (auth.uid() = student_id);

create policy "Admins can read all courses"
  on student_courses for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- GROUPS
-- =============================================
create table if not exists groups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  shared_courses  text[],
  focus           text,
  created_at      timestamptz default now()
);

alter table groups enable row level security;

create policy "Group members can read their group"
  on groups for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.group_id = id)
  );

create policy "Admins can manage groups"
  on groups for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- TUTOR ASSIGNMENTS
-- =============================================
create table if not exists tutor_assignments (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid references profiles(id) on delete cascade,
  group_id    uuid references groups(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(tutor_id, group_id)
);

alter table tutor_assignments enable row level security;

create policy "Tutors can read own assignments"
  on tutor_assignments for select using (auth.uid() = tutor_id);

create policy "Admins can manage assignments"
  on tutor_assignments for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- GROUP CHAT MESSAGES (real-time)
-- =============================================
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,
  sender_name text,
  sender_role text,
  content     text not null,
  created_at  timestamptz default now()
);

alter table messages enable row level security;

create policy "Group members can read messages"
  on messages for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.group_id = messages.group_id)
    or
    exists (select 1 from tutor_assignments ta where ta.tutor_id = auth.uid() and ta.group_id = messages.group_id)
  );

create policy "Group members can send messages"
  on messages for insert with check (
    auth.uid() = sender_id
    and (
      exists (select 1 from profiles p where p.id = auth.uid() and p.group_id = messages.group_id)
      or
      exists (select 1 from tutor_assignments ta where ta.tutor_id = auth.uid() and ta.group_id = messages.group_id)
    )
  );

-- Enable real-time for messages
alter publication supabase_realtime add table messages;

-- =============================================
-- GROUP RESOURCES (tutor uploads)
-- =============================================
create table if not exists group_resources (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references groups(id) on delete cascade,
  tutor_id     uuid references profiles(id) on delete set null,
  title        text not null,
  content_text text,
  file_url     text,
  for_nova     boolean default false,
  created_at   timestamptz default now()
);

alter table group_resources enable row level security;

create policy "Group members can read resources"
  on group_resources for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.group_id = group_resources.group_id)
    or
    exists (select 1 from tutor_assignments ta where ta.tutor_id = auth.uid() and ta.group_id = group_resources.group_id)
  );

create policy "Tutors can insert resources"
  on group_resources for insert with check (
    auth.uid() = tutor_id
  );

-- =============================================
-- TASKS (assigned by tutors)
-- =============================================
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade,
  tutor_id    uuid references profiles(id) on delete set null,
  title       text not null,
  description text,
  due_date    date,
  created_at  timestamptz default now()
);

alter table tasks enable row level security;

create policy "Group members can read tasks"
  on tasks for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.group_id = tasks.group_id)
    or
    exists (select 1 from tutor_assignments ta where ta.tutor_id = auth.uid() and ta.group_id = tasks.group_id)
  );

create policy "Tutors can manage tasks"
  on tasks for all using (auth.uid() = tutor_id);

-- =============================================
-- PROFESSOR NOVA MEMORY (consciousness store)
-- =============================================
create table if not exists nova_memory (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references profiles(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz default now()
);

alter table nova_memory enable row level security;

create policy "Students can read own memory"
  on nova_memory for select using (auth.uid() = student_id);

create policy "Service role manages memory"
  on nova_memory for all using (true);

-- Index for vector similarity search (Phase 4)
create index if not exists nova_memory_embedding_idx
  on nova_memory using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
