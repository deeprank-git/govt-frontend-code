
CREATE TYPE public.app_role AS ENUM ('admin','student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, email TEXT, mobile TEXT, dob DATE, gender TEXT, address TEXT,
  avatar_url TEXT, preferred_categories TEXT[] DEFAULT '{}',
  preparation_goal TEXT, day_streak INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT,
  icon TEXT, exam_count INT DEFAULT 0, sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, short_name TEXT,
  conducting_body TEXT, level TEXT, description TEXT, overview TEXT,
  eligibility JSONB DEFAULT '{}'::jsonb, syllabus JSONB DEFAULT '[]'::jsonb,
  exam_pattern JSONB DEFAULT '[]'::jsonb, important_dates JSONB DEFAULT '[]'::jsonb,
  selection_process JSONB DEFAULT '[]'::jsonb, books JSONB DEFAULT '[]'::jsonb,
  cutoff JSONB DEFAULT '[]'::jsonb, preparation_tips JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb, test_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false, notification_url TEXT, apply_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exams TO anon, authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read exams" ON public.exams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage exams" ON public.exams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  test_type TEXT NOT NULL DEFAULT 'full_length',
  tier TEXT, total_questions INT DEFAULT 0, total_marks INT DEFAULT 0,
  duration_minutes INT DEFAULT 60, negative_marking NUMERIC DEFAULT 0,
  difficulty TEXT DEFAULT 'medium', is_free BOOLEAN DEFAULT true,
  shift TEXT, paper_year INT, attempt_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mock_tests TO anon, authenticated;
GRANT ALL ON public.mock_tests TO service_role;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tests" ON public.mock_tests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage tests" ON public.mock_tests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT 'General',
  question_number INT NOT NULL, question_text TEXT NOT NULL,
  options JSONB NOT NULL, correct_answer TEXT NOT NULL,
  explanation TEXT, marks NUMERIC DEFAULT 1, negative_marks NUMERIC DEFAULT 0.25,
  difficulty TEXT DEFAULT 'medium', topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  marked_for_review JSONB NOT NULL DEFAULT '[]'::jsonb,
  visited JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC DEFAULT 0, total_marks NUMERIC DEFAULT 0,
  correct_count INT DEFAULT 0, wrong_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0, accuracy NUMERIC DEFAULT 0,
  percentile NUMERIC DEFAULT 0, rank INT,
  time_taken_seconds INT DEFAULT 0,
  section_analysis JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin view all attempts" ON public.attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.current_affairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'National',
  summary TEXT, content TEXT, image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.current_affairs TO anon, authenticated;
GRANT ALL ON public.current_affairs TO service_role;
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read ca" ON public.current_affairs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage ca" ON public.current_affairs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL, tier TEXT, released_on DATE,
  challenge_open BOOLEAN DEFAULT false,
  response_sheet_url TEXT, answer_key_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.answer_keys TO anon, authenticated;
GRANT ALL ON public.answer_keys TO service_role;
ALTER TABLE public.answer_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read keys" ON public.answer_keys FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage keys" ON public.answer_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'notification',
  description TEXT, alert_date DATE,
  is_new BOOLEAN DEFAULT true, link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read alerts" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage alerts" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.mock_tests(id) ON DELETE SET NULL,
  title TEXT NOT NULL, year INT NOT NULL,
  tier TEXT, shift TEXT, paper_date DATE,
  questions_count INT DEFAULT 100, marks INT DEFAULT 200,
  duration_minutes INT DEFAULT 60, attempts INT DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pyqs TO anon, authenticated;
GRANT ALL ON public.pyqs TO service_role;
ALTER TABLE public.pyqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pyqs" ON public.pyqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage pyqs" ON public.pyqs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEED DATA
INSERT INTO public.categories (slug, name, description, icon, exam_count, sort_order) VALUES
('ssc','SSC Exams','Staff Selection Commission exams','briefcase',80,1),
('banking','Banking Exams','IBPS, SBI, RBI and more','landmark',120,2),
('railways','Railways','RRB NTPC, Group D, ALP','train',70,3),
('teaching','Teaching','CTET, KVS, NVS, DSSSB','graduation-cap',85,4),
('defence','Defence','NDA, CDS, AFCAT, CAPF','shield',50,5),
('state-psc','State PSC','UPPSC, BPSC, MPSC and more','map',60,6),
('police','Police','UP Police, Delhi Police, SI','badge',40,7),
('engineering','Engineering','SSC JE, RRB JE, GATE','wrench',55,8),
('upsc','UPSC','Civil Services, IFS, IES','crown',15,9);

WITH c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.exams (category_id, slug, name, short_name, conducting_body, level, description, is_featured, overview, eligibility, syllabus, exam_pattern, important_dates, selection_process, books, cutoff, preparation_tips, faqs)
SELECT (SELECT id FROM c WHERE slug = v.cat), v.slug, v.name, v.sn, v.body, v.lvl, v.descr, v.feat,
  v.overview, v.elig::jsonb, v.syl::jsonb, v.pat::jsonb, v.dates::jsonb, v.sel::jsonb, v.books::jsonb, v.cut::jsonb, v.tips::jsonb, v.faqs::jsonb
FROM (VALUES
  ('ssc','ssc-cgl','SSC CGL','SSC CGL','Staff Selection Commission','Graduate','Combined Graduate Level Examination for Group B and C posts.', true,
   'SSC CGL is conducted to recruit candidates for various Group B and Group C posts in Ministries, Departments and Organisations of the Government of India.',
   '{"nationality":"Indian citizen","age_limit":"18 to 32 years (varies by post)","qualification":"Bachelor degree from a recognized university","age_relaxation":"As per government norms"}',
   '[{"subject":"General Intelligence & Reasoning","topics":["Analogy","Similarities & Differences","Spatial Visualization","Problem Solving","Syllogism"]},{"subject":"General Awareness","topics":["History","Geography","Polity","Economy","Science","Awards"]},{"subject":"Quantitative Aptitude","topics":["Number System","Simplification","Algebra","Geometry","Mensuration","DI"]},{"subject":"English Comprehension","topics":["Reading Comprehension","Cloze Test","Spotting Errors","Vocabulary","Grammar"]}]',
   '[{"subject":"General Intelligence & Reasoning","questions":25,"marks":50},{"subject":"General Awareness","questions":25,"marks":50},{"subject":"Quantitative Aptitude","questions":25,"marks":50},{"subject":"English Comprehension","questions":25,"marks":50}]',
   '[{"label":"Notification","date":"09 May 2025"},{"label":"Application Start","date":"09 May 2025"},{"label":"Last Date","date":"04 Jun 2025"},{"label":"Admit Card","date":"Jul 2025"},{"label":"Tier 1 Exam","date":"Aug-Sep 2025"},{"label":"Tier 1 Result","date":"Dec 2025"}]',
   '["Tier 1 - Computer Based Test","Tier 2 - CBT (Mains)","Document Verification","Final Merit"]',
   '[{"title":"Quantitative Aptitude","author":"R.S. Aggarwal"},{"title":"Lucent General Knowledge","author":"Lucent"}]',
   '[{"category":"General","marks":150},{"category":"OBC","marks":140},{"category":"SC","marks":130}]',
   '["Practice previous year papers","Take regular mock tests","Focus on weak areas","Revise daily"]',
   '[{"q":"What is the age limit for SSC CGL?","a":"18 to 32 years depending on the post."}]'),
  ('ssc','ssc-chsl','SSC CHSL','SSC CHSL','Staff Selection Commission','12th Pass','Combined Higher Secondary Level for LDC, JSA, DEO posts.', true,
   'SSC CHSL recruits candidates for Lower Divisional Clerk, JSA, DEO and Postal Assistant.',
   '{"nationality":"Indian citizen","age_limit":"18 to 27 years","qualification":"12th pass"}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('ssc','ssc-mts','SSC MTS','SSC MTS','Staff Selection Commission','10th Pass','Multi Tasking Staff exam', true,'SSC MTS recruits multi-tasking staff.','{"qualification":"10th pass","age_limit":"18 to 25"}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('ssc','ssc-gd-constable','SSC GD Constable','SSC GD','Staff Selection Commission','10th Pass','GD Constable in CAPF', false,'GD Constable recruitment.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('ssc','ssc-cpo','SSC CPO','SSC CPO','Staff Selection Commission','Graduate','Central Police Organization SI', false,'CPO recruits Sub-Inspectors.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('ssc','ssc-selection-post','SSC Selection Post','SSC SP','Staff Selection Commission','Various','Phase exam for various posts', false,'Phase examination.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('ssc','ssc-stenographer','SSC Stenographer','SSC Steno','Staff Selection Commission','12th Pass','Stenographer Grade C & D', false,'Steno recruitment.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('banking','ibps-po','IBPS PO','IBPS PO','Institute of Banking Personnel Selection','Graduate','Probationary Officer recruitment', true,'IBPS PO for public sector banks.','{"qualification":"Bachelor degree","age_limit":"20-30 years"}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('banking','ibps-clerk','IBPS Clerk','IBPS Clerk','Institute of Banking Personnel Selection','Graduate','Clerk recruitment for PSBs', true,'IBPS Clerk recruits clerks.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('railways','rrb-ntpc','RRB NTPC','RRB NTPC','Railway Recruitment Board','12th/Graduate','Non Technical Popular Categories', true,'NTPC for railway non-technical posts.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('railways','rrb-group-d','RRB Group D','RRB Group D','Railway Recruitment Board','10th Pass','Level 1 railway posts', true,'Group D recruitment.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('upsc','upsc-cse','UPSC CSE','UPSC CSE','Union Public Service Commission','Graduate','Civil Services Examination', true,'UPSC CSE for IAS, IPS, IFS.','{"age_limit":"21-32 years"}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('police','delhi-police-constable','Delhi Police Constable','DP Constable','Staff Selection Commission','12th Pass','Delhi Police Constable recruitment', false,'Delhi Police recruitment.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('defence','ib-acio','IB ACIO','IB ACIO','Intelligence Bureau','Graduate','Assistant Central Intelligence Officer', false,'IB ACIO recruitment.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('defence','ib-security-assistant','IB Security Assistant','IB SA','Intelligence Bureau','12th Pass','Security assistant role', false,'IB SA.','{}','[]','[]','[]','[]','[]','[]','[]','[]'),
  ('state-psc','ib-mts','IB MTS','IB MTS','Intelligence Bureau','10th Pass','IB Multi Tasking Staff', false,'IB MTS.','{}','[]','[]','[]','[]','[]','[]','[]','[]')
) AS v(cat, slug, name, sn, body, lvl, descr, feat, overview, elig, syl, pat, dates, sel, books, cut, tips, faqs);

WITH e AS (SELECT id FROM public.exams WHERE slug='ssc-cgl')
INSERT INTO public.mock_tests (exam_id, title, description, test_type, tier, total_questions, total_marks, duration_minutes, negative_marking, difficulty, is_free, attempt_count)
SELECT e.id, t.title, t.descr, t.tt, t.tier, t.q, t.m, t.d, t.neg, t.diff, true, t.att FROM e, (VALUES
  ('SSC CGL Full Length Mock Test 01','Complete syllabus based test','full_length','Tier 1',10,20,60,0.5,'medium',24600),
  ('SSC CGL Tier 1 Full Mock Test 02','Practice for Tier 1','full_length','Tier 1',100,200,60,0.5,'medium',23685),
  ('SSC CGL Full Length Mock Test 03','Mixed difficulty','full_length','Tier 1',100,200,60,0.5,'medium',19700),
  ('SSC CGL Tier 1 Mock Test #1','Free mock for Tier 1','free','Tier 1',100,200,60,0.5,'easy',26800),
  ('Quantitative Aptitude Sectional 01','Quant sectional','sectional','Tier 1',50,100,30,0.5,'medium',31200),
  ('SSC CGL Previous Year 2023 Shift 1','PYQ shift 1','pyq','Tier 1',100,200,60,0.5,'hard',22100)
) AS t(title, descr, tt, tier, q, m, d, neg, diff, att);

WITH t AS (SELECT id FROM public.mock_tests WHERE title='SSC CGL Full Length Mock Test 01' LIMIT 1)
INSERT INTO public.questions (test_id, section, question_number, question_text, options, correct_answer, explanation, marks, negative_marks, difficulty, topic)
SELECT t.id, q.section, q.qn, q.qt, q.opts::jsonb, q.ans, q.expl, 2, 0.5, q.diff, q.topic FROM t, (VALUES
  ('General Intelligence & Reasoning',1,'Find the missing number in the series: 2, 6, 12, 20, 30, ?',
   '[{"key":"A","text":"40"},{"key":"B","text":"42"},{"key":"C","text":"44"},{"key":"D","text":"46"}]','B','Differences increase by 2: next add 12 -> 42.','easy','Series'),
  ('General Intelligence & Reasoning',2,'If MONDAY is coded as NPOEBZ, then FRIDAY is coded as?',
   '[{"key":"A","text":"GSJEBZ"},{"key":"B","text":"GSJEAZ"},{"key":"C","text":"GSJDAZ"},{"key":"D","text":"GTJEBZ"}]','A','Each letter shifted by +1.','medium','Coding'),
  ('Quantitative Aptitude',3,'The average of 5 consecutive even numbers is 30. What is the largest number?',
   '[{"key":"A","text":"32"},{"key":"B","text":"34"},{"key":"C","text":"36"},{"key":"D","text":"38"}]','B','Middle = 30, numbers 26,28,30,32,34.','medium','Averages'),
  ('Quantitative Aptitude',4,'A man covers 30 km in 5 hours. His speed is?',
   '[{"key":"A","text":"5 km/h"},{"key":"B","text":"6 km/h"},{"key":"C","text":"7 km/h"},{"key":"D","text":"8 km/h"}]','B','30/5 = 6 km/h.','easy','Speed'),
  ('English Language',5,'Choose the correct synonym of "Abundant".',
   '[{"key":"A","text":"Scarce"},{"key":"B","text":"Plentiful"},{"key":"C","text":"Empty"},{"key":"D","text":"Rare"}]','B','Abundant means plentiful.','easy','Vocabulary'),
  ('English Language',6,'Identify the part with an error: "He don''t / know / the answer."',
   '[{"key":"A","text":"He dont"},{"key":"B","text":"know"},{"key":"C","text":"the answer"},{"key":"D","text":"No error"}]','A','Should be doesnt.','easy','Grammar'),
  ('General Awareness',7,'Who is the current President of India?',
   '[{"key":"A","text":"Ram Nath Kovind"},{"key":"B","text":"Droupadi Murmu"},{"key":"C","text":"Pranab Mukherjee"},{"key":"D","text":"A.P.J. Abdul Kalam"}]','B','Droupadi Murmu, since 2022.','easy','Polity'),
  ('General Awareness',8,'The capital of Australia is?',
   '[{"key":"A","text":"Sydney"},{"key":"B","text":"Melbourne"},{"key":"C","text":"Canberra"},{"key":"D","text":"Perth"}]','C','Canberra is the capital.','easy','Geography'),
  ('General Awareness',9,'INS Vagsheer is a?',
   '[{"key":"A","text":"Fighter Jet"},{"key":"B","text":"Submarine"},{"key":"C","text":"Aircraft Carrier"},{"key":"D","text":"Missile"}]','B','Scorpene-class submarine.','medium','Defence'),
  ('Quantitative Aptitude',10,'Simple interest on Rs. 5000 at 8% per annum for 2 years is?',
   '[{"key":"A","text":"Rs. 700"},{"key":"B","text":"Rs. 800"},{"key":"C","text":"Rs. 900"},{"key":"D","text":"Rs. 1000"}]','B','SI = 5000*8*2/100 = 800.','easy','Interest')
) AS q(section, qn, qt, opts, ans, expl, diff, topic);

INSERT INTO public.current_affairs (slug, title, category, summary, content, is_featured, published_at) VALUES
('rbi-repo-rate-unchanged-2025','RBI keeps Repo Rate unchanged at 6.50%','Economy','The MPC believes the current stance is appropriate to align inflation with target.','Full coverage of the RBI Monetary Policy Committee decision and outlook.', true, now() - interval '4 hours'),
('isro-eos08-launch','ISRO Successfully Launches EOS-08 Satellite','Science & Tech','EOS-08 supports environmental monitoring and disaster management.','EOS-08 mission carries advanced payloads.', true, now() - interval '8 hours'),
('india-eu-free-trade','India and EU agree to fast-track FTA by end of 2025','International','Boost bilateral trade, investment, strategic cooperation.','Negotiations are progressing.', true, now() - interval '12 hours'),
('new-education-policy-update','New Education Policy Implementation Updates','National','Latest implementation updates from the Ministry of Education.','Details about NEP rollout.', false, now() - interval '1 day'),
('neeraj-chopra-diamond-league','Neeraj Chopra wins Gold at Doha Diamond League 2025','Sports','Neeraj clinched first with 88.36m throw.','Full report.', false, now() - interval '2 days'),
('icc-mens-t20-2024','ICC Men T20 World Cup 2024 Schedule Announced','Sports','Schedule released by ICC.','Tournament dates and venues.', false, now() - interval '3 days');

WITH e AS (SELECT id, slug FROM public.exams)
INSERT INTO public.notifications (exam_id, title, alert_type, description, alert_date, is_new)
SELECT (SELECT id FROM e WHERE slug = v.slug), v.title, v.atype, v.descr, v.dt, v.is_new
FROM (VALUES
  ('ssc-cgl','SSC CGL 2025 Notification Out','notification','Exam Date 09 - 14 Sep 2025','2025-09-09'::date, true),
  ('ibps-po','IBPS PO 2025 Exam Date Released','exam_date','Prelims in October','2025-10-15'::date, true),
  ('rrb-ntpc','RRB NTPC 2025 Admit Card','admit_card','Admit card to be released soon','2025-08-25'::date, true),
  ('ssc-chsl','SSC CHSL 2025 Application Dates Extended','registration','New last date 31 July','2025-07-31'::date, false),
  ('upsc-cse','UPSC CSE 2025 Prelims Admit Card Released','admit_card','Download from official site','2025-05-14'::date, false)
) AS v(slug, title, atype, descr, dt, is_new);

WITH e AS (SELECT id, slug FROM public.exams)
INSERT INTO public.answer_keys (exam_id, title, tier, released_on, challenge_open)
SELECT (SELECT id FROM e WHERE slug = v.slug), v.title, v.tier, v.dt, v.chal
FROM (VALUES
  ('ssc-cgl','SSC CGL 2025 Tier 1','Tier 1','2025-05-19'::date, true),
  ('rrb-ntpc','RRB NTPC 2025 (CBT 1)','CBT 1','2025-05-18'::date, true),
  ('ssc-chsl','SSC CHSL 2025 Tier 1','Tier 1','2025-05-15'::date, false),
  ('ibps-po','IBPS PO 2025 Prelims','Prelims','2025-05-10'::date, false)
) AS v(slug, title, tier, dt, chal);

WITH e AS (SELECT id FROM public.exams WHERE slug='ssc-cgl')
INSERT INTO public.pyqs (exam_id, title, year, tier, shift, paper_date, questions_count, marks, duration_minutes, attempts)
SELECT e.id, v.title, v.yr, v.tier, v.shift, v.dt, 100, 200, 60, v.att FROM e, (VALUES
  ('SSC CGL 2024 Tier 1', 2024, 'Tier 1', 'Shift 1', '2024-09-13'::date, 24600),
  ('SSC CGL 2024 Tier 1', 2024, 'Tier 1', 'Shift 3', '2024-09-13'::date, 21300),
  ('SSC CGL 2023 Tier 1', 2023, 'Tier 1', 'Shift 1', '2023-07-14'::date, 18700),
  ('SSC CGL 2023 Tier 1', 2023, 'Tier 1', 'Shift 2', '2023-07-14'::date, 16100),
  ('SSC CGL 2022 Tier 1', 2022, 'Tier 1', 'Shift 1', '2022-12-01'::date, 14600),
  ('SSC CGL 2022 Tier 1', 2022, 'Tier 1', 'Shift 2', '2022-12-01'::date, 12800)
) AS v(title, yr, tier, shift, dt, att);
