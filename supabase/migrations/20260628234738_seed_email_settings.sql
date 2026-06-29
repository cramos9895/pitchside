-- Insert default email notification settings to ensure emails fire correctly.
INSERT INTO "public"."system_settings" ("key", "value")
VALUES
    ('notification.confirmation', 'true'),
    ('notification.booking_receipt', 'true'),
    ('notification.waitlist', 'true'),
    ('notification.waitlist_promotion', 'true'),
    ('notification.chat_alert', 'true'),
    ('notification.team_invite', 'true'),
    ('notification.cancellation', 'true')
ON CONFLICT ("key") DO NOTHING;
