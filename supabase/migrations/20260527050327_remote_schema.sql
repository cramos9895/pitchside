drop extension if exists "pg_net";

drop policy "Admins can view all bookings" on "public"."bookings";

drop policy "Admins can view all profiles" on "public"."profiles";

drop policy "Captains can remove players from their roster" on "public"."booking_rosters";

drop policy "Captains can view their own booking rosters" on "public"."booking_rosters";

drop policy "Facility admins can view all rosters for their facility" on "public"."booking_rosters";

drop policy "Super admins can view all rosters" on "public"."booking_rosters";

alter table "public"."profiles" add column "primary_sports" text[] default '{}'::text[];

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from profiles where id = auth.uid() limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_system_role()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select system_role from profiles where id = auth.uid() limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (
    id, 
    email, 
    first_name, 
    last_name,
    dob,
    phone_number,
    zip_code,
    organization_name,
    job_title,
    certification_level,
    primary_sports
  )
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'zip_code',
    new.raw_user_meta_data->>'organization_name',
    new.raw_user_meta_data->>'job_title',
    new.raw_user_meta_data->>'certification_level',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'primary_sports')), '{}')
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$function$
;


  create policy "Captains can remove players from their roster"
  on "public"."booking_rosters"
  as permissive
  for delete
  to public
using (((EXISTS ( SELECT 1
   FROM public.resource_bookings rb
  WHERE ((rb.id = booking_rosters.booking_group_id) AND (rb.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.recurring_booking_groups rbg
  WHERE ((rbg.id = booking_rosters.booking_group_id) AND (rbg.user_id = auth.uid()))))));



  create policy "Captains can view their own booking rosters"
  on "public"."booking_rosters"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.resource_bookings rb
  WHERE ((rb.id = booking_rosters.booking_group_id) AND (rb.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.recurring_booking_groups rbg
  WHERE ((rbg.id = booking_rosters.booking_group_id) AND (rbg.user_id = auth.uid()))))));



  create policy "Facility admins can view all rosters for their facility"
  on "public"."booking_rosters"
  as permissive
  for select
  to public
using (((public.get_my_system_role() = 'facility_admin'::text) AND ((EXISTS ( SELECT 1
   FROM public.resource_bookings rb
  WHERE (rb.id = booking_rosters.booking_group_id))) OR (EXISTS ( SELECT 1
   FROM public.recurring_booking_groups rbg
  WHERE (rbg.id = booking_rosters.booking_group_id))))));



  create policy "Super admins can view all rosters"
  on "public"."booking_rosters"
  as permissive
  for select
  to public
using (((public.get_my_system_role() = 'super_admin'::text) OR (public.get_my_role() = 'master_admin'::text)));


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


DROP POLICY IF EXISTS "Admin Delete" ON "storage"."objects";
  create policy "Admin Delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'public-assets'::text));



DROP POLICY IF EXISTS "Admin Update" ON "storage"."objects";
  create policy "Admin Update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'public-assets'::text));



DROP POLICY IF EXISTS "Authenticated Upload" ON "storage"."objects";
  create policy "Authenticated Upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'public-assets'::text));



DROP POLICY IF EXISTS "Public Access" ON "storage"."objects";
  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'public-assets'::text));



