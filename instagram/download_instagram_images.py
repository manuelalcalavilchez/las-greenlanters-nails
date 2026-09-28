import instaloader
import os

USERNAME = "greenlanters.nails"
OUTPUT_DIR = "instagram_images"
MAX_POSTS = 30

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Crear instancia de Instaloader
L = instaloader.Instaloader(
    dirname_pattern=OUTPUT_DIR,
    filename_pattern="{shortcode}",
    download_videos=False,  # Solo imágenes
)

# Obtener perfil público
profile = instaloader.Profile.from_username(L.context, USERNAME)

print(f"Perfil encontrado: {profile.full_name} (@{profile.username})")
print(f"Posts totales: {profile.mediacount}")

count = 0
for post in profile.get_posts():
    if count >= MAX_POSTS:
        break
    # Solo imágenes (no videos ni reels)
    if post.mediatype_name != "Image":
        continue
    print(f"[DOWN] {post.shortcode}...")
    L.download_post(post, target=USERNAME)
    count += 1

print(f"\nListo. {count} imágenes descargadas en la carpeta: {OUTPUT_DIR}")
