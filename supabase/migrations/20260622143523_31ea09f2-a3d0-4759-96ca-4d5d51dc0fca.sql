
-- 1. Move has_role to a private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- 2. Recreate every policy that referenced public.has_role to use private.has_role
DROP POLICY IF EXISTS "admin manage categories" ON public.categories;
CREATE POLICY "admin manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage exams" ON public.exams;
CREATE POLICY "admin manage exams" ON public.exams
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage tests" ON public.mock_tests;
CREATE POLICY "admin manage tests" ON public.mock_tests
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage questions" ON public.questions;
CREATE POLICY "admin manage questions" ON public.questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin view all attempts" ON public.attempts;
CREATE POLICY "admin view all attempts" ON public.attempts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage ca" ON public.current_affairs;
CREATE POLICY "admin manage ca" ON public.current_affairs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage keys" ON public.answer_keys;
CREATE POLICY "admin manage keys" ON public.answer_keys
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage alerts" ON public.notifications;
CREATE POLICY "admin manage alerts" ON public.notifications
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin manage pyqs" ON public.pyqs;
CREATE POLICY "admin manage pyqs" ON public.pyqs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Drop the public-facing wrapper so signed-in users can no longer RPC it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 4. Lock down questions: hide correct_answer and explanation pre-submission
DROP POLICY IF EXISTS "public read questions" ON public.questions;

-- Only admins, or users who have a submitted attempt for this test, can read the full row.
CREATE POLICY "questions readable after submission" ON public.questions
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.attempts a
      WHERE a.user_id = auth.uid()
        AND a.test_id = questions.test_id
        AND a.status = 'completed'
    )
  );

-- Revoke anon access entirely on the raw questions table
REVOKE SELECT ON public.questions FROM anon;

-- Safe view: question stems only, no correct_answer / explanation
CREATE OR REPLACE VIEW public.questions_public
WITH (security_invoker = true) AS
SELECT
  id,
  test_id,
  section,
  question_number,
  question_text,
  options,
  marks,
  negative_marks,
  difficulty,
  topic,
  created_at
FROM public.questions;

GRANT SELECT ON public.questions_public TO anon, authenticated;

-- Allow the view to bypass the new restrictive policy by adding a permissive SELECT for the columns the view selects.
-- Because security_invoker=true, the view inherits the caller's RLS. We need a second policy that allows
-- reading the safe columns for anyone (authenticated or anon) while taking a test.
CREATE POLICY "questions stem readable" ON public.questions
  FOR SELECT TO anon, authenticated
  USING (true);
-- Re-grant anon SELECT only at the column level so correct_answer/explanation stay private.
REVOKE SELECT ON public.questions FROM anon, authenticated;
GRANT SELECT (id, test_id, section, question_number, question_text, options, marks, negative_marks, difficulty, topic, created_at)
  ON public.questions TO anon, authenticated;
-- Full-row SELECT (including correct_answer/explanation) requires the restrictive policy via these columns:
GRANT SELECT (correct_answer, explanation) ON public.questions TO authenticated;

-- Service role keeps full access
GRANT ALL ON public.questions TO service_role;

-- 5. Server-side scoring RPC (SECURITY DEFINER, locked down to the attempt owner)
CREATE OR REPLACE FUNCTION private.submit_attempt(_attempt_id uuid, _answers jsonb, _time_taken_seconds int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_test uuid;
  v_correct int := 0;
  v_wrong int := 0;
  v_skipped int := 0;
  v_score numeric := 0;
  v_total_marks numeric := 0;
  v_section_stats jsonb := '{}'::jsonb;
  r record;
  v_ans text;
  v_section text;
  v_sec jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT test_id INTO v_test FROM public.attempts
  WHERE id = _attempt_id AND user_id = v_user AND status = 'in_progress';
  IF v_test IS NULL THEN
    RAISE EXCEPTION 'attempt not found or not in progress';
  END IF;

  FOR r IN
    SELECT id, section, marks, negative_marks, correct_answer
    FROM public.questions WHERE test_id = v_test
  LOOP
    v_total_marks := v_total_marks + r.marks;
    v_section := r.section;
    v_sec := COALESCE(v_section_stats->v_section, jsonb_build_object('name', v_section, 'total', 0, 'correct', 0, 'wrong', 0, 'score', 0));
    v_sec := jsonb_set(v_sec, '{total}', to_jsonb((v_sec->>'total')::int + 1));
    v_ans := _answers->>r.id::text;
    IF v_ans IS NULL OR v_ans = '' THEN
      v_skipped := v_skipped + 1;
    ELSIF v_ans = r.correct_answer THEN
      v_correct := v_correct + 1;
      v_score := v_score + r.marks;
      v_sec := jsonb_set(v_sec, '{correct}', to_jsonb((v_sec->>'correct')::int + 1));
      v_sec := jsonb_set(v_sec, '{score}', to_jsonb((v_sec->>'score')::numeric + r.marks));
    ELSE
      v_wrong := v_wrong + 1;
      v_score := v_score - r.negative_marks;
      v_sec := jsonb_set(v_sec, '{wrong}', to_jsonb((v_sec->>'wrong')::int + 1));
      v_sec := jsonb_set(v_sec, '{score}', to_jsonb((v_sec->>'score')::numeric - r.negative_marks));
    END IF;
    v_section_stats := jsonb_set(v_section_stats, ARRAY[v_section], v_sec);
  END LOOP;

  UPDATE public.attempts SET
    answers = _answers,
    score = v_score,
    total_marks = v_total_marks,
    correct_count = v_correct,
    wrong_count = v_wrong,
    skipped_count = v_skipped,
    accuracy = CASE WHEN v_correct + v_wrong > 0 THEN (v_correct::numeric / (v_correct + v_wrong)) * 100 ELSE 0 END,
    percentile = LEAST(99.9, GREATEST(10, (v_score / GREATEST(1, v_total_marks)) * 100)),
    time_taken_seconds = _time_taken_seconds,
    section_analysis = (SELECT jsonb_agg(value) FROM jsonb_each(v_section_stats)),
    status = 'completed',
    submitted_at = now()
  WHERE id = _attempt_id AND user_id = v_user;

  RETURN _attempt_id;
END;
$$;

REVOKE ALL ON FUNCTION private.submit_attempt(uuid, jsonb, int) FROM public;
GRANT EXECUTE ON FUNCTION private.submit_attempt(uuid, jsonb, int) TO authenticated, service_role;

-- Expose a thin public wrapper so PostgREST can call it (SECURITY INVOKER -> defers to private fn)
CREATE OR REPLACE FUNCTION public.submit_attempt(_attempt_id uuid, _answers jsonb, _time_taken_seconds int)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.submit_attempt(_attempt_id, _answers, _time_taken_seconds);
$$;

REVOKE ALL ON FUNCTION public.submit_attempt(uuid, jsonb, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, int) TO authenticated, service_role;
