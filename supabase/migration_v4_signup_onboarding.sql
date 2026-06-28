-- Migration v4: Add onboarding fields to fit_clients for auto-signup flow
-- Run this once in Supabase SQL editor

ALTER TABLE fit_clients ADD COLUMN (
  experiencia text, -- 'nunca', 'hace_anos', 'entrena_ahora'
  lesiones text, -- descripción o null
  edad int,
  peso_actual float,
  dias_semana int, -- 3, 4, 5, 6
  objetivo text, -- 'fuerza', 'hipertrofia', 'resistencia'
  onboarding_completado boolean default false,
  video_bienvenida_visto boolean default false
);
