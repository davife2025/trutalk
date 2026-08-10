-- Addresses a gap found in Session 12's research review: financial stress
-- (inflation, naira volatility, unemployment) is the most commonly cited
-- driver of everyday stress in Nigeria specifically, and the practice
-- library had nothing addressing it directly — just generic breathing and
-- mindfulness content that doesn't engage with the actual root cause many
-- users are dealing with.

insert into public.content_library (type, title, description, duration_seconds, media_url, evidence_tag)
values
  (
    'journaling_prompt',
    'What''s one financial worry you can''t control right now — and one small thing you can?',
    'Financial stress is one of the most common stress triggers. Separating what''s controllable today from what isn''t is a technique with real evidence behind it (financial therapy interventions), not just generic advice.',
    null,
    null,
    'moderate'
  ),
  (
    'journaling_prompt',
    'If money weren''t part of the equation, what would you actually be worried about?',
    'Sometimes financial stress is standing in for a different underlying worry. This prompt helps separate the two.',
    null,
    null,
    'moderate'
  ),
  (
    'mindfulness',
    '5-Minute Reset Before a Hard Money Conversation',
    'A short grounding exercise designed for the moments before a stressful financial conversation — a bill, a budget talk, a difficult ask.',
    300,
    null,
    'moderate'
  )
on conflict do nothing;
