-- Additional seed content for the practice library (breathing/mindfulness/sound),
-- so the Session 4 player screens have real rows to render beyond Session 1's
-- three seed items.

insert into public.content_library (type, title, description, duration_seconds, media_url, evidence_tag)
values
  ('breathing', '4-7-8 Breathing', 'Inhale for 4, hold for 7, exhale for 8 — a pattern often used to calm the nervous system before sleep or a stressful moment.', 240, null, 'strong'),
  ('breathing', 'Box Breathing (Extended)', 'A longer 10-minute version of box breathing for a deeper reset.', 600, null, 'strong'),
  ('mindfulness', '3-Minute Breathing Space', 'A brief check-in with your thoughts, body, and breath — good for a quick reset between tasks.', 180, null, 'strong'),
  ('sound', 'Rain on Leaves', 'Gentle rainfall recording for background calm or focus.', 600, null, 'moderate'),
  ('sound', 'Slow Piano (Calming)', 'A slow, self-selected style piano piece — research links this style to measurable reductions in physiological stress markers.', 480, null, 'strong')
on conflict do nothing;
