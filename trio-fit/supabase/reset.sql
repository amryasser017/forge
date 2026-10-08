-- ⚠️ DELETES ALL TRIO FIT DATA. Only for a brand-new / half-installed project, to start the setup again from zero.
-- It drops only TRIO FIT's own tables, view and functions (nothing else in your Supabase project).
drop view if exists member_totals;
drop function if exists award_xp(uuid, text, int, int, text, text, uuid, date);
drop function if exists grant_achievement(uuid, text);
drop function if exists buy_cosmetic(uuid, uuid);
drop table if exists
  login_attempts, app_settings, ai_insights, challenge_events, challenge_participants, challenges,
  member_cosmetics, cosmetic_items, member_achievements, achievements, xp_transactions,
  daily_check_ins, water_logs, saved_meals, food_items, food_logs,
  exercise_sets, workout_exercises, workout_sessions,
  exercise_category_links, exercises, exercise_categories,
  progress_photos, body_measurements, member_goals, members
  cascade;
