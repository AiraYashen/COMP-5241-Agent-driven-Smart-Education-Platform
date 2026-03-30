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
  save_name     text,
  report_json   jsonb,
  created_at    timestamptz default now()
);

-- Add save columns to existing scenario_sessions table (safe if already exists)
alter table scenario_sessions add column if not exists save_name text;
alter table scenario_sessions add column if not exists report_json jsonb;

-- 22. scenario_themes (teacher-curated simulation themes)
create table if not exists scenario_themes (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid references users(id) on delete cascade,
  title          text not null,
  subject        text not null default '历史',
  subject_icon   text not null default '历',
  era            text not null,
  role_name      text not null,
  narrator_name  text not null,
  difficulty     text default '中级' check (difficulty in ('初级', '中级', '高级')),
  description    text,
  background     text,
  real_history   text,
  chapters_hint  int default 5,
  is_active      boolean default true,
  created_at     timestamptz default now()
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

-- 20. academic_terms (semester configuration for schedule week calculation)
create table if not exists academic_terms (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  term_start_date date not null,
  term_end_date   date,
  is_active       boolean default false,
  created_at      timestamptz default now()
);

create unique index if not exists idx_academic_terms_single_active
on academic_terms (is_active)
where is_active = true;

-- 21. lesson_sessions (AI micro-lesson temporary session payload)
create table if not exists lesson_sessions (
  id         uuid primary key default gen_random_uuid(),
  payload    jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_lesson_sessions_expires_at
on lesson_sessions (expires_at);

-- Extend discussions table with new columns (safe if already exist)
alter table discussions add column if not exists likes int default 0;
alter table discussions add column if not exists image_url text;
alter table discussions add column if not exists updated_at timestamptz;

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

-- Default academic term (adjust dates as needed)
insert into academic_terms (name, term_start_date, term_end_date, is_active)
select '2025-2026学年第二学期', '2026-02-23', '2026-07-10', true
where not exists (select 1 from academic_terms where is_active = true);

-- ============================================================
--  课程体系 (口袋课堂用)
-- ============================================================

-- 22. lesson_subjects (学科)
create table if not exists lesson_subjects (
  id         serial primary key,
  name       text not null unique,
  sort_order int  not null default 0
);

insert into lesson_subjects (name, sort_order) values
  ('高中语文',     1),
  ('高中数学',     2),
  ('高中英语',     3),
  ('高中物理',     4),
  ('高中化学',     5),
  ('高中生物学',   6),
  ('高中思想政治', 7),
  ('高中历史',     8),
  ('高中地理',     9)
on conflict (name) do nothing;

-- 23. lesson_textbooks (教材)
create table if not exists lesson_textbooks (
  id         serial primary key,
  subject_id int  not null references lesson_subjects(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  unique(subject_id, name)
);

insert into lesson_textbooks (subject_id, name, sort_order)
select s.id, t.name, t.sort_order
from lesson_subjects s
join (values
  ('高中化学', '高中化学人教版必修第一册',              1),
  ('高中化学', '高中化学人教版必修第二册',              2),
  ('高中化学', '高中化学人教版选择性必修1 化学反应原理',3),
  ('高中化学', '高中化学人教版选择性必修2 物质结构与性质',4),
  ('高中化学', '高中化学人教版选择性必修3 有机化学基础',5)
) as t(sname, name, sort_order) on s.name = t.sname
on conflict (subject_id, name) do nothing;

-- 24. lesson_chapters (章节)
create table if not exists lesson_chapters (
  id           serial primary key,
  textbook_id  int  not null references lesson_textbooks(id) on delete cascade,
  name         text not null,
  sort_order   int  not null default 0,
  unique(textbook_id, name)
);

insert into lesson_chapters (textbook_id, name, sort_order)
select tb.id, c.name, c.sort_order
from lesson_textbooks tb
join lesson_subjects  s  on s.id = tb.subject_id
join (values
  ('高中化学', '高中化学人教版必修第二册', '第五章 化工生产中的重要非金属元素', 1),
  ('高中化学', '高中化学人教版必修第二册', '第六章 化学反应与能量',             2),
  ('高中化学', '高中化学人教版必修第二册', '第七章 有机化合物',                 3),
  ('高中化学', '高中化学人教版必修第二册', '第八章 化学与可持续发展',           4)
) as c(sname, tbname, name, sort_order)
  on s.name = c.sname and tb.name = c.tbname
on conflict (textbook_id, name) do nothing;

-- 25. lesson_knowledge_points (知识点)
create table if not exists lesson_knowledge_points (
  id             serial primary key,
  chapter_id     int  not null references lesson_chapters(id) on delete cascade,
  name           text not null,
  sort_order     int  not null default 0,
  reference_text text,
  unique(chapter_id, name)
);

-- 为已存在的表补充 reference_text 列（幂等，可重复执行）
alter table lesson_knowledge_points add column if not exists reference_text text;

insert into lesson_knowledge_points (chapter_id, name, sort_order)
select ch.id, k.name, k.sort_order
from lesson_chapters  ch
join lesson_textbooks tb on tb.id = ch.textbook_id
join lesson_subjects  s  on s.id  = tb.subject_id
join (values
  ('高中化学','高中化学人教版必修第二册','第五章 化工生产中的重要非金属元素','第一节 硫及其化合物',              1),
  ('高中化学','高中化学人教版必修第二册','第五章 化工生产中的重要非金属元素','第二节 氮及其化合物',              2),
  ('高中化学','高中化学人教版必修第二册','第五章 化工生产中的重要非金属元素','第三节 无机非金属材料',            3),
  ('高中化学','高中化学人教版必修第二册','第五章 化工生产中的重要非金属元素','实验活动4 用化学沉淀法去除粗盐中的杂质离子',4),
  ('高中化学','高中化学人教版必修第二册','第五章 化工生产中的重要非金属元素','实验活动5 不同价态含硫物质的转化', 5),
  ('高中化学','高中化学人教版必修第二册','第六章 化学反应与能量',             '第一节 化学反应与能量变化',        1),
  ('高中化学','高中化学人教版必修第二册','第六章 化学反应与能量',             '第二节 化学反应的速率与限度',      2),
  ('高中化学','高中化学人教版必修第二册','第六章 化学反应与能量',             '实验活动6 化学能转化成电能',       3),
  ('高中化学','高中化学人教版必修第二册','第六章 化学反应与能量',             '实验活动7 化学反应速率的影响因素', 4),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '第一节 认识有机化合物',            1),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '第二节 乙烯与有机高分子材料',      2),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '第三节 乙醇与乙酸',               3),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '第四节 基本营养物质',             4),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '实验活动8 搭建球棍模型认识有机化合物分子结构的特点',5),
  ('高中化学','高中化学人教版必修第二册','第七章 有机化合物',                 '实验活动9 乙醇、乙酸的主要性质',  6),
  ('高中化学','高中化学人教版必修第二册','第八章 化学与可持续发展',           '第一节 自然资源的开发利用',        1),
  ('高中化学','高中化学人教版必修第二册','第八章 化学与可持续发展',           '第二节 化学品的合理使用',          2),
  ('高中化学','高中化学人教版必修第二册','第八章 化学与可持续发展',           '第三节 环境保护与绿色化学',        3)
) as k(sname, tbname, chname, name, sort_order)
  on s.name = k.sname and tb.name = k.tbname and ch.name = k.chname
on conflict (chapter_id, name) do nothing;

-- ============================================================
--  高中生物学 数据
-- ============================================================

-- 教材
insert into lesson_textbooks (subject_id, name, sort_order)
select s.id, t.name, t.sort_order
from lesson_subjects s
join (values
  ('高中生物学', '高中生物学人教版必修1 分子与细胞',         1),
  ('高中生物学', '高中生物学人教版必修2 遗传与进化',         2),
  ('高中生物学', '高中生物学人教版选择性必修1 稳态与调节',   3),
  ('高中生物学', '高中生物学人教版选择性必修2 生物与环境',   4),
  ('高中生物学', '高中生物学人教版选择性必修3 生物技术与工程',5)
) as t(sname, name, sort_order) on s.name = t.sname
on conflict (subject_id, name) do nothing;

-- 章节（选择性必修2 生物与环境）
insert into lesson_chapters (textbook_id, name, sort_order)
select tb.id, c.name, c.sort_order
from lesson_textbooks tb
join lesson_subjects  s  on s.id = tb.subject_id
join (values
  ('高中生物学', '高中生物学人教版选择性必修2 生物与环境', '第1章 种群及其动态',       1),
  ('高中生物学', '高中生物学人教版选择性必修2 生物与环境', '第2章 群落及其演替',       2),
  ('高中生物学', '高中生物学人教版选择性必修2 生物与环境', '第3章 生态系统及其稳定性', 3),
  ('高中生物学', '高中生物学人教版选择性必修2 生物与环境', '第4章 人与环境',           4)
) as c(sname, tbname, name, sort_order)
  on s.name = c.sname and tb.name = c.tbname
on conflict (textbook_id, name) do nothing;

-- 知识点（选择性必修2 生物与环境）
insert into lesson_knowledge_points (chapter_id, name, sort_order)
select ch.id, k.name, k.sort_order
from lesson_chapters  ch
join lesson_textbooks tb on tb.id = ch.textbook_id
join lesson_subjects  s  on s.id  = tb.subject_id
join (values
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第1章 种群及其动态',       '第1节 种群的数量特征',   1),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第1章 种群及其动态',       '第2节 种群数量的变化',   2),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第1章 种群及其动态',       '第3节 影响种群数量变化的因素', 3),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第2章 群落及其演替',       '第1节 群落的结构',       1),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第2章 群落及其演替',       '第2节 群落的主要类型',   2),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第2章 群落及其演替',       '第3节 群落的演替',       3),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第3章 生态系统及其稳定性', '第1节 生态系统的结构',   1),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第3章 生态系统及其稳定性', '第2节 生态系统的能量流动', 2),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第3章 生态系统及其稳定性', '第3节 生态系统的物质循环', 3),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第3章 生态系统及其稳定性', '第4节 生态系统的信息传递', 4),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第3章 生态系统及其稳定性', '第5节 生态系统的稳定性', 5),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第4章 人与环境',           '第1节 人类活动对生态环境的影响', 1),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第4章 人与环境',           '第2节 生物多样性及其保护', 2),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第4章 人与环境',           '第3节 生态工程',          3),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第4章 人与环境',           '一 生态工程的基本原理',   4),
  ('高中生物学','高中生物学人教版选择性必修2 生物与环境','第4章 人与环境',           '二 生态工程的实例和发展前景', 5)
) as k(sname, tbname, chname, name, sort_order)
  on s.name = k.sname and tb.name = k.tbname and ch.name = k.chname
on conflict (chapter_id, name) do nothing;
