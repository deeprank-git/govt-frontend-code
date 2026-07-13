
-- Recreate questions_public as a SECURITY INVOKER view (defers to caller's RLS).
DROP VIEW IF EXISTS public.questions_public;
CREATE VIEW public.questions_public
WITH (security_invoker = true) AS
SELECT id, test_id, section, question_number, question_text, options, marks, negative_marks, difficulty, topic, created_at
FROM public.questions;
GRANT SELECT ON public.questions_public TO anon, authenticated;

-- Allow row visibility for the safe columns, but block sensitive columns via column GRANTs.
DROP POLICY IF EXISTS "questions readable after submission" ON public.questions;
CREATE POLICY "questions stem readable" ON public.questions
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.questions FROM anon, authenticated;
GRANT SELECT (id, test_id, section, question_number, question_text, options, marks, negative_marks, difficulty, topic, created_at)
  ON public.questions TO anon, authenticated;
-- correct_answer and explanation are intentionally NOT granted to anon/authenticated.

-- Private function returns full questions (with answers) only to authorized callers.
CREATE OR REPLACE FUNCTION private.get_attempt_questions(_attempt_id uuid)
RETURNS SETOF public.questions
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_test uuid;
  v_is_admin boolean := private.has_role(v_user, 'admin'::public.app_role);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF v_is_admin THEN
    SELECT test_id INTO v_test FROM public.attempts WHERE id = _attempt_id;
  ELSE
    SELECT test_id INTO v_test FROM public.attempts
    WHERE id = _attempt_id AND user_id = v_user AND status = 'completed';
  END IF;

  IF v_test IS NULL THEN
    RAISE EXCEPTION 'attempt not accessible';
  END IF;

  RETURN QUERY SELECT * FROM public.questions WHERE test_id = v_test ORDER BY question_number;
END;
$$;

REVOKE ALL ON FUNCTION private.get_attempt_questions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.get_attempt_questions(uuid) TO authenticated, service_role;

-- Public SECURITY INVOKER wrapper so PostgREST can RPC it.
CREATE OR REPLACE FUNCTION public.get_attempt_questions(_attempt_id uuid)
RETURNS SETOF public.questions
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_attempt_questions(_attempt_id);
$$;

REVOKE ALL ON FUNCTION public.get_attempt_questions(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_attempt_questions(uuid) TO authenticated, service_role;
