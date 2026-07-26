
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- One-time bootstrap: promote caller to admin if no admin exists yet.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_admin boolean; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_admin;
  IF has_admin THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_usd numeric(10,2) NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  daily_credits int NOT NULL DEFAULT 10,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.subscription_plans(id, name, price_usd, interval, daily_credits, features, sort_order) VALUES
  ('free','Free', 0, 'month', 10, '["10 AI actions/day","Basic tools","Community support"]'::jsonb, 1),
  ('pro_monthly','Pro Monthly', 1, 'month', 500, '["500 AI actions/day","All AI tools","Resume & Portfolio Builder","Priority responses","Email support"]'::jsonb, 2),
  ('pro_yearly','Pro Yearly', 10, 'year', 500, '["Everything in Pro Monthly","Best value — 2 months free","Early access to new tools"]'::jsonb, 3);

-- Subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub self read" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sub self insert" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub admin update" ON public.user_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE TRIGGER trg_sub_updated BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Payment requests
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  method text NOT NULL,
  sender_name text NOT NULL,
  sender_number text NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  screenshot_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT UPDATE (status, admin_notes) ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay self read" ON public.payment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pay self insert" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pay admin update" ON public.payment_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Usage events
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_user_created ON public.usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_user_kind ON public.usage_events(user_id, kind);
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage self" ON public.usage_events FOR ALL TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id);

-- Contact messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact anyone insert" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "contact admin read" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "contact admin update" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (true);

-- Payment settings (single row, editable from Supabase)
CREATE TABLE public.payment_settings (
  id int PRIMARY KEY DEFAULT 1,
  account_name text NOT NULL,
  account_number text NOT NULL,
  contact_number text NOT NULL,
  support_email text NOT NULL,
  methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin update" ON public.payment_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (true);

INSERT INTO public.payment_settings(id, account_name, account_number, contact_number, support_email, methods, instructions) VALUES
  (1,
   'Junaid Raza Qureshi',
   '03114918835',
   '+92 311 4918835',
   'junaidrazaqureshi28@gmail.com',
   '[
     {"key":"easypaisa","name":"EasyPaisa","color":"#00A651"},
     {"key":"jazzcash","name":"JazzCash","color":"#C8102E"},
     {"key":"nayapay","name":"NayaPay","color":"#7F00FF"}
   ]'::jsonb,
   'Send the exact amount to the account below, then upload your payment screenshot. Your Pro plan will be activated after admin verification (usually within a few hours).'
  );
