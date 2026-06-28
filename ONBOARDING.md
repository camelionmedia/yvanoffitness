# Cómo dar de alta un cliente nuevo (manual, v2)

Hacé esto después de que un cliente paga. Te toma ~10 minutos por cliente (menos si comparte rutina con otro).

## 0. Setup único (la primera vez)

1. Creá el proyecto en [supabase.com](https://supabase.com) → "New project".
2. Andá a **SQL Editor** y corré todo el contenido de `supabase/schema.sql`.
3. Andá a **Project Settings → API** y copiá:
   - `Project URL` → pegalo en `.env` como `VITE_SUPABASE_URL`
   - `anon public key` → pegalo en `.env` como `VITE_SUPABASE_KEY`
4. En Vercel (proyecto `fittrack`), agregá esas mismas dos variables en **Settings → Environment Variables** y redeployá.

(Si ya tenías el proyecto corriendo con la versión vieja, corré una sola vez `supabase/migration_v2_routine_assignments.sql` en vez de `schema.sql` — eso actualiza tus tablas existentes sin perder datos.)

## 1. Crear el login del cliente

En el dashboard de Supabase → **Authentication → Users → Add user**:
- Email: el email del cliente
- Password: una contraseña temporal (mandásela por WhatsApp, que la cambie después si quiere)
- Confirmá el usuario (marcá "Auto Confirm User")

Copiá el **UUID** que le asigna Supabase a ese usuario — lo necesitás en los pasos siguientes.

Repetí esto por cada persona (si dos o tres entrenan juntos con la misma rutina, igual cada uno necesita su propio login — eso no cambia, lo único que se comparte es la rutina).

## 2. Crear su perfil

En **SQL Editor**, corré (reemplazando los valores) — uno por cada cliente:

```sql
insert into fit_clients (id, name)
values ('PEGAR-UUID-DEL-CLIENTE', 'Nombre del Cliente');
```

## 3. Armar la rutina (una sola vez, aunque la compartan varios)

```sql
insert into fit_routines (name, description, days)
values (
  'Fuerza & Hipertrofia',
  'Plan de 4 días enfocado en bajar grasa y ganar fuerza',
  '{
    "Lunes": [
      { "id": "e1", "name": "Sentadilla con barra", "sets": 4, "reps": "8-10", "rest": 90, "notes": "Controlá la bajada en 3 segundos", "video": "https://youtube.com/watch?v=XXXX" },
      { "id": "e2", "name": "Prensa de piernas", "sets": 3, "reps": "12", "rest": 60, "notes": "" }
    ],
    "Miércoles": [
      { "id": "e3", "name": "Press banca plano", "sets": 4, "reps": "8", "rest": 90, "notes": "Escápulas retraídas todo el tiempo", "video": "https://youtube.com/watch?v=YYYY" }
    ]
  }'::jsonb
)
returning id;
```

Copiá el `id` que te devuelve (el de la rutina, no el del cliente) — lo necesitás en el paso 4.

Tip: guardá los videos de técnica de tu banco de ejercicios reusable (los grabás una sola vez) y pegá la misma URL de YouTube en cada rutina nueva que use ese ejercicio.

## 4. Asignar la rutina a cada cliente

Esto es lo que reemplaza "duplicar" la rutina: la misma rutina se la asignás a tantos clientes como quieras. Corré una línea por cada persona que la va a seguir:

```sql
insert into fit_routine_assignments (routine_id, client_id) values
('PEGAR-ID-DE-LA-RUTINA', 'PEGAR-UUID-DEL-CLIENTE-1'),
('PEGAR-ID-DE-LA-RUTINA', 'PEGAR-UUID-DEL-CLIENTE-2'),
('PEGAR-ID-DE-LA-RUTINA', 'PEGAR-UUID-DEL-CLIENTE-3');
```

Cada cliente sigue viendo y registrando **su propio** peso, series e historial — solo el plan de ejercicios es compartido. Si después le subís el peso sugerido a la sentadilla, editás la rutina una sola vez (`update fit_routines set days = '...' where id = 'ID-DE-LA-RUTINA'`) y se actualiza para los tres a la vez.

## 5. Avisarle al cliente

Mandale por WhatsApp:
- El link de la app: `https://fittrack-yvanoffitness.vercel.app`
- Su email y contraseña temporal
- Un mensaje corto: "Ya está tu rutina cargada, entrá con estos datos y la vas a ver en la pestaña 'Hoy'"

Eso es la "primera victoria" — antes de su primer entrenamiento, ya tiene acceso y puede ver exactamente qué le toca hacer.
