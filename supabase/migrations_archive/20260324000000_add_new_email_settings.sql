-- Add New Email Notification Settings
INSERT INTO public.system_settings (key, label, description, category, value)
VALUES
    ('notification.waitlist_promotion', 'Waitlist Promotion', 'Sent when a user is promoted from waitlist to active roster.', 'notification', 'true'::jsonb),
    ('notification.password_reset', 'Password Reset', 'Sent when a user requests a password reset.', 'notification', 'true'::jsonb),
    ('notification.captain_receipt', 'Captain Receipt', 'Sent to the team captain after a successful registration.', 'notification', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE
SET 
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;
