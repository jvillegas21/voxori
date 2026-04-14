CREATE OR REPLACE FUNCTION public.increment_usage(
  p_tenant_id    uuid,
  p_period_start date,
  p_period_end   date,
  p_minutes      int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO usage_records (tenant_id, period_start, period_end, minutes_used, minutes_included)
  VALUES (p_tenant_id, p_period_start, p_period_end, p_minutes, 0)
  ON CONFLICT (tenant_id, period_start)
  DO UPDATE SET minutes_used = usage_records.minutes_used + EXCLUDED.minutes_used;
END;
$$;
