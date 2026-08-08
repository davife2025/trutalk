-- Minimal seed content so apps/web has something to render in Session 1 dev.
insert into public.content_library (type, title, description, duration_seconds, evidence_tag)
values
  ('breathing', 'Box Breathing (4-4-4-4)', 'A simple 4-count breathing pattern to calm the nervous system.', 180, 'strong'),
  ('mindfulness', '5-Minute Body Scan', 'A short guided body scan for quick stress relief.', 300, 'strong'),
  ('journaling_prompt', 'What is one thing weighing on you today?', 'A gentle prompt to start expressive writing.', null, 'strong')
on conflict do nothing;
