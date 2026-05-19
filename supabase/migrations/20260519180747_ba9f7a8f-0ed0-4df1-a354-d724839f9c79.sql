
-- Fix search_path warnings on trigger functions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

-- Seed photographers
INSERT INTO public.photographers (initials, full_name) VALUES
  ('ZD', 'Zé Diogo Lucena'),
  ('SC', 'Salvador Colaço'),
  ('RV', 'Rui Valido'),
  ('JMC', 'João Maria Catarino'),
  ('LNG', 'Luís Nobre Guedes'),
  ('FR', 'Francisco Rivotti'),
  ('RCD', 'Rodrigo Costa Duarte'),
  ('SP', 'Simão Pernas'),
  ('FLC', 'Filipe Leão Cabreira')
ON CONFLICT (initials) DO NOTHING;

-- Seed packages V3
INSERT INTO public.packages (name, version, base_price, description, num_prism_photographers, has_external_photographer, wp_variant_percentage, active) VALUES
  ('Signature', 3, 2500, '1 Prism, até 100 convidados, até 12h, +IVA, sinal 400€', 1, false, 10, true),
  ('Prime', 3, 3350, '1 Prism + 1 externo, até 12h, +IVA, sinal 400€', 1, true, 10, true),
  ('Prestige', 3, 4500, '2 Prism, até 12h, +IVA, sinal 400€', 2, false, 10, true),
  ('Premium', 3, 4900, '2 Prism + 1 externo, até 12h, +IVA, sinal 400€', 2, true, 15, true),
  ('Ultimate', 3, 7000, '3 Prism, até 12h, +IVA, sinal 400€', 3, false, 15, true);

-- Seed email templates
INSERT INTO public.email_templates (key, name, subject, body) VALUES
  ('proposta', 'Proposta', 'Proposta PRISM Storytellers — {{client_name}}', 'Olá {{client_name}},

Obrigado pelo seu interesse no nosso trabalho. Em anexo encontra a nossa proposta para o evento de {{event_date}}.

Pacote: {{package_name}}
Valor: {{total_value}}€ + IVA

Aguardamos o seu feedback.

Cumprimentos,
PRISM Storytellers'),
  ('followup', 'Follow-up', 'Seguimento — Proposta PRISM', 'Olá {{client_name}},

Esperamos que esteja tudo bem. Apenas a confirmar se recebeu a nossa proposta enviada há alguns dias.

Disponíveis para qualquer questão.

Cumprimentos,
PRISM Storytellers'),
  ('pedido_sinal', 'Pedido de Sinal', 'Pedido de Sinal — {{client_name}}', 'Olá {{client_name}},

Para confirmar a reserva da data {{event_date}}, agradecemos o pagamento do sinal de {{deposit_amount}}€.

Cumprimentos,
PRISM Storytellers'),
  ('confirmacao', 'Confirmação', 'Reserva confirmada — {{event_date}}', 'Olá {{client_name}},

Confirmamos a receção do sinal. A vossa data está reservada.

Cumprimentos,
PRISM Storytellers'),
  ('lembrete', 'Lembrete pré-evento', 'O grande dia aproxima-se — {{event_date}}', 'Olá {{client_name}},

Faltam poucos dias para o vosso evento. Estamos ansiosos!

Cumprimentos,
PRISM Storytellers')
ON CONFLICT (key) DO NOTHING;

-- Default settings row
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
