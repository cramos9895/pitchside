-- Insert default email notification settings to ensure emails fire correctly.
INSERT INTO "public"."system_settings" ("key", "value", "label")
VALUES
    ('notification.confirmation', 'true', 'Confirmation Emails'),
    ('notification.booking_receipt', 'true', 'Booking Receipts'),
    ('notification.waitlist', 'true', 'Waitlist Notifications'),
    ('notification.waitlist_promotion', 'true', 'Waitlist Promotions'),
    ('notification.chat_alert', 'true', 'Chat Alerts'),
    ('notification.team_invite', 'true', 'Team Invites'),
    ('notification.cancellation', 'true', 'Cancellation Emails')
ON CONFLICT ("key") DO NOTHING;
