
-- Remove the overly permissive policy and column grants that accidentally let
-- authenticated users read correct_answer/explanation again.
DROP POLICY IF EXISTS "questions stem readable" ON public.questions;

REVOKE SELECT ON public.questions FROM anon, authenticated;
REVOKE SELECT (id, test_id, section, question_number, question_text, options, marks, negative_marks, difficulty, topic, created_at) ON public.questions FROM anon, authenticated;
REVOKE SELECT (correct_answer, explanation) ON public.questions FROM authenticated;

-- Restore plain table-level SELECT to authenticated — RLS now strictly limits which rows
-- (admin OR submitted-attempt owner) can read; column privileges are not needed.
GRANT SELECT ON public.questions TO authenticated;

-- Recreate the safe stems view as SECURITY DEFINER so taking a test does not require
-- read access to the underlying table. The view only exposes non-sensitive columns.
DROP VIEW IF EXISTS public.questions_public;
CREATE VIEW public.questions_public AS
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

ALTER VIEW public.questions_public OWNER TO postgres;
GRANT SELECT ON public.questions_public TO anon, authenticated;
