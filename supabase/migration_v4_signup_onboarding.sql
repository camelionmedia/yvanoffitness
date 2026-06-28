-- Migration v4: Add onboarding fields to fit_clients for auto-signup flow
-- Run this once in Supabase SQL editor

ALTER TABLE fit_clients
  ADD COLUMN experiencia text,
  ADD COLUMN lesiones text,
  ADD COLUMN edad int,
  ADD COLUMN peso_actual float,
  ADD COLUMN dias_semana int,
  ADD COLUMN objetivo text,
  ADD COLUMN onboarding_completado boolean default false,
  ADD COLUMN video_bienvenida_visto boolean default false;
