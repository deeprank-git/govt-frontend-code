DROP POLICY IF EXISTS "questions stem readable" ON public.questions;
REVOKE SELECT ON public.questions FROM anon, authenticated;