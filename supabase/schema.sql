-- ============================================================
--  EduPlatform – Supabase Schema
--  Run this in Supabase SQL Editor to initialize the database
-- ============================================================

-- 1. schools
create table if not exists schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  logo_url   text,
  created_at timestamptz default now()
);

-- 2. users (extends Supabase auth.users via separate profile table)
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text unique,
  email         text,
  password_hash text,
  role          text not null check (role in ('ADMIN','TEACHER','STUDENT')) default 'STUDENT',
  school_id     uuid references schools(id) on delete set null,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- 3. classes
create table if not exists classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  grade      text,
  school_id  uuid references schools(id) on delete cascade,
  created_at timestamptz default now()
);

-- 4. enrollments  (student ↔ class)
create table if not exists enrollments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid references users(id) on delete cascade,
  class_id   uuid references classes(id) on delete cascade,
  unique(student_id, class_id)
);

-- 5. teacher_classes (teacher ↔ class + subject)
create table if not exists teacher_classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid references users(id) on delete cascade,
  class_id   uuid references classes(id) on delete cascade,
  subject    text not null,
  unique(teacher_id, class_id, subject)
);

-- 6. schedules
create table if not exists schedules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  teacher_id  uuid references users(id) on delete set null,
  subject     text not null,
  weekday     int  not null check (weekday between 1 and 7),
  time_start  time not null,
  time_end    time not null,
  room        text,
  week_type   text default 'BOTH' check (week_type in ('BOTH','ODD','EVEN')),
  created_at  timestamptz default now()
);

-- 7. announcements
create table if not exists announcements (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid references users(id) on delete cascade,
  class_id             uuid references classes(id) on delete cascade,
  title                text not null,
  content              text not null,
  push_threshold_hours int  default 24,
  created_at           timestamptz default now()
);

-- 8. announcement_reads
create table if not exists announcement_reads (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid references announcements(id) on delete cascade,
  student_id      uuid references users(id) on delete cascade,
  read_at         timestamptz default now(),
  unique(announcement_id, student_id)
);

-- 9. assignments
create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid references users(id) on delete cascade,
  class_id     uuid references classes(id) on delete cascade,
  subject      text not null,
  title        text not null,
  description  text,
  deadline     timestamptz,
  allow_late   boolean default false,
  created_at   timestamptz default now()
);

-- 10. submissions
create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id    uuid references users(id) on delete cascade,
  content       text,
  file_url      text,
  submitted_at  timestamptz default now(),
  score         numeric,
  ai_score      numeric,
  feedback      text,
  graded_at     timestamptz,
  unique(assignment_id, student_id)
);

-- 11. grades
create table if not exists grades (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references users(id) on delete cascade,
  class_id     uuid references classes(id) on delete cascade,
  subject      text not null,
  score        numeric not null,
  total_score  numeric default 100,
  exam_name    text,
  teacher_id   uuid references users(id) on delete set null,
  paper_url    text,
  ai_analysis  text,
  created_at   timestamptz default now()
);

-- 12. materials
create table if not exists materials (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid references users(id) on delete cascade,
  class_id     uuid references classes(id) on delete cascade,
  subject      text not null,
  title        text not null,
  type         text default 'OTHER' check (type in ('PDF','PPT','WORD','VIDEO','IMAGE','OTHER')),
  file_url     text not null,
  file_size    bigint,
  created_at   timestamptz default now()
);

-- 13. material_views  (learning analytics)
create table if not exists material_views (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid references materials(id) on delete cascade,
  student_id   uuid references users(id) on delete cascade,
  start_at     timestamptz default now(),
  end_at       timestamptz,
  duration_sec int
);

-- 14. discussions
create table if not exists discussions (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references users(id) on delete cascade,
  class_id   uuid references classes(id) on delete cascade,
  subject    text,
  content    text not null,
  parent_id  uuid references discussions(id) on delete cascade,
  is_pinned  boolean default false,
  created_at timestamptz default now()
);

-- 15. notifications
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  type        text not null,
  title       text not null,
  content     text,
  is_read     boolean default false,
  related_id  uuid,
  created_at  timestamptz default now()
);

-- 16. wrong_questions
create table if not exists wrong_questions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid references users(id) on delete cascade,
  assignment_id     uuid references assignments(id) on delete cascade,
  question_content  text,
  student_answer    text,
  correct_answer    text,
  knowledge_point   text,
  subject           text,
  created_at        timestamptz default now()
);

-- 17. preview_videos  (AI-generated pre-class previews)
create table if not exists preview_videos (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid references materials(id) on delete cascade,
  teacher_id    uuid references users(id) on delete cascade,
  class_id      uuid references classes(id) on delete cascade,
  summary_text  text,
  tts_url       text,
  slides_json   jsonb,
  created_at    timestamptz default now()
);

-- 18. scenario_sessions (ChronoCo-pilot simulation sessions)
create table if not exists scenario_sessions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references users(id) on delete cascade,
  scenario_id   text not null,
  choices_json  jsonb default '[]',
  chapter_index int default 0,
  completed     boolean default false,
  created_at    timestamptz default now()
);

-- 19. ai_assistants (per-class AI TA configuration)
create table if not exists ai_assistants (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid references users(id) on delete cascade,
  class_id       uuid references classes(id) on delete cascade,
  subject        text,
  name           text not null,
  avatar_emoji   text default '🤖',
  system_prompt  text,
  knowledge_text text,
  created_at     timestamptz default now()
);

-- Extend discussions table with new columns (safe if already exist)
alter table discussions add column if not exists likes int default 0;
alter table discussions add column if not exists image_url text;

-- ============================================================
--  Seed data for development/testing
-- ============================================================

-- School
insert into schools (id, name, address)
values ('00000000-0000-0000-0000-000000000001', '示范中学', '香港特別行政區')
on conflict do nothing;

-- Admin user (password: admin123)
insert into users (id, name, phone, email, password_hash, role, school_id)
values (
  '00000000-0000-0000-0000-000000000010',
  'Admin',
  '10000000000',
  'admin@school.edu',
  '$2b$10$YourHashHere',  -- replace with real bcrypt hash
  'ADMIN',
  '00000000-0000-0000-0000-000000000001'
) on conflict do nothing;

-- Teacher
insert into users (id, name, phone, role, school_id)
values (
  '00000000-0000-0000-0000-000000000011',
  '张老师',
  '13800000001',
  'TEACHER',
  '00000000-0000-0000-0000-000000000001'
) on conflict do nothing;

-- Student
insert into users (id, name, phone, role, school_id)
values (
  '00000000-0000-0000-0000-000000000012',
  '李同学',
  '13800000002',
  'STUDENT',
  '00000000-0000-0000-0000-000000000001'
) on conflict do nothing;

-- Class
insert into classes (id, name, grade, school_id)
values ('00000000-0000-0000-0000-000000000020', '高三(1)班', '高三', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

-- Enrollment
insert into enrollments (student_id, class_id)
values ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000020')
on conflict do nothing;

-- Teacher assignment
insert into teacher_classes (teacher_id, class_id, subject)
values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000020', '数学')
on conflict do nothing;
