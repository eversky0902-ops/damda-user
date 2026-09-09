-- Apply the business console auto-confirm setting to paid reservations.

CREATE OR REPLACE FUNCTION public.apply_business_auto_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'
     AND EXISTS (
       SELECT 1
       FROM public.business_place_profiles
       WHERE business_owner_id = NEW.business_owner_id
         AND auto_confirm_reservations = true
     ) THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_business_auto_confirmation ON public.reservations;
CREATE TRIGGER apply_business_auto_confirmation
BEFORE INSERT OR UPDATE OF status, business_owner_id ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.apply_business_auto_confirmation();
