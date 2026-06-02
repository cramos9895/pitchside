import re

with open('src/components/admin/Sidebar.tsx', 'r') as f:
    content = f.read()

# Change the existing /admin/reviews to Testimonials
content = content.replace("href: '/admin/reviews',\n            label: 'Reviews',", "href: '/admin/reviews',\n            label: 'Testimonials',")

# Add Match Reviews
match_reviews = """        {
            href: '/admin/match-reviews',
            label: 'Match Reviews',
            icon: ShieldAlert,
            show: true
        },
        {
            href: '/admin/reviews',"""
content = content.replace("        {\n            href: '/admin/reviews',", match_reviews)

with open('src/components/admin/Sidebar.tsx', 'w') as f:
    f.write(content)

with open('src/app/actions/match-reviews.ts', 'r') as f:
    action = f.read()
    
action = action.replace("revalidatePath('/admin/reviews');", "revalidatePath('/admin/match-reviews');")

with open('src/app/actions/match-reviews.ts', 'w') as f:
    f.write(action)

print("Patched.")
