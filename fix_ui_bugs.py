import re

# Fix settings page
settings_file = 'src/app/settings/page.tsx'
with open(settings_file, 'r') as f:
    settings_content = f.read()

# Replace bleeding comments
settings_content = settings_content.replace("""                            Settings
// @ts-expect-error - Bypassing structural TS mismatch for deployment
                        </h1>""", """                            Settings
                        </h1>""")

settings_content = settings_content.replace("""                    </div>
                                        // @ts-expect-error - Residual typing mismatch from extended schema mapping
                                        {profile?.role === 'host' && (""", """                    </div>
                                        {profile?.role === 'host' && (""")

with open(settings_file, 'w') as f:
    f.write(settings_content)

# Fix QR scanner animation
qr_file = 'src/components/public/checkin/GlobalPassportModal.tsx'
with open(qr_file, 'r') as f:
    qr_content = f.read()

qr_content = qr_content.replace("""                            <div className="w-full h-[2px] bg-pitch-accent/50 absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(204,255,0,0.8)]" />""", "")

with open(qr_file, 'w') as f:
    f.write(qr_content)

print("Fixed UI bugs")
