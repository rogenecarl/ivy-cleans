#!/usr/bin/env bash
# scripts/download-assets.sh — pull real assets from the live site
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/images public/icons

BASE="https://ivycleans.com/wp-content/uploads"
IMAGES=(
  2023/05/Logo.png
  2023/06/dusting.jpg 2023/06/vacuuming.jpg 2023/06/bathroom-cleaning.jpg
  2023/06/window.jpg 2023/06/upholstery.jpg
  2023/06/service-icon1.png 2023/06/service-icon2.png 2023/06/service-icon3.png
  2023/06/service-icon4.png 2023/06/service-icon5.png
  2023/07/Untitled-design.png 2023/07/Untitled-design-1-2.png 2023/07/Untitled-design-2.png
  2023/07/rn_image_picker_lib_temp_d129a169-21-1.jpg
  2023/07/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg
  2023/11/before.jpg 2023/11/after.jpg
  2023/11/cleaning-bg2.jpg 2023/11/faq-bg.jpg
  2023/06/cleaning-bg-desktop.jpg 2023/06/cleaning-bg-mbl.jpg
  2023/06/cleaning-bg3.jpg 2023/06/move-out-bg.jpg
  2023/12/Logo.png 2023/12/Group-5.png 2023/12/logo-mbl1.png 2023/12/logo-mbl2.png
  2023/12/guarantee-icon-1.png
  2023/12/icon1.png 2023/12/icon2.png 2023/12/icon3.png 2023/12/icon4.png 2023/12/icon5.png
  2023/12/icon6.png 2023/12/icon7.png 2023/12/icon8.png 2023/12/icon9.png 2023/12/icon10.png
  2023/12/bg.jpg 2023/12/sec01-bgg.jpg 2023/12/Rectangle-12.jpg
  2023/12/pexels-la-miko-36167641.jpg "2023/12/woman-holding-spray-cleaner-1.png"
  2024/03/image-12.webp 2024/03/image-8.webp 2024/03/image-15.webp
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_44e964bc48926e05964972e6c042257c.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_336b91c4074d8ba6be3c75cb1fbe3538.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_463c35959d5dbbd33f15d6ef7858cd18.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_56247593c8630ce7a36d64aff55ab241.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_26c0418afaf76eae62c81a42683725ff.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_51b83e9a17d78c72d5a00c5714507752.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_b6f41b6f1e06107b29211a5aeb0c6878.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_db464bae7301c38f8607cd4ff2652a30.jpg
  2023/12/ChIJT35locmWcKMRgykID0Xc2Vo_1d694dba7949954b92bc22ef5a96f457.jpg
  # round 3: deep-cleaning + move-out pages
  2023/06/deep-bg4.jpg 2023/06/deep-icon1.png 2023/06/deep-icon2.png
  2023/06/deep-icon3.png 2023/06/deep-icon4.png 2023/06/deep-img1.jpg
  2023/06/deep-img2.jpg 2023/06/out-icon1.png 2023/06/out-icon2.png
  2023/06/out-icon3.png 2023/06/out-img1.jpg 2023/06/out-img2.jpg
  2023/06/out-img3.jpg
  # round 3 section backgrounds (post-245.css / post-241.css)
  2023/06/deep-bg1.jpg 2023/06/deep-bg2.jpg 2023/06/deep-bg3.jpg
  2023/06/deep-bg5.jpg 2023/06/out-bg1.jpg 2023/06/out-bg2.jpg
  2023/06/out-bg3.jpg
)
for path in "${IMAGES[@]}"; do
  name="$(basename "$path")"
  # 2023/12/Logo.png collides with 2023/05/Logo.png — keep the footer one distinct
  if [ "$path" = "2023/12/Logo.png" ]; then name="Logo-footer.png"; fi
  [ -f "public/images/$name" ] || curl -sf --retry 3 --max-time 120 "$BASE/$path" -o "public/images/$name"
  echo "ok $name"
done

for icon in facebook x youtube instagram pinterest tiktok; do
  [ -f "public/icons/$icon.svg" ] || curl -sfL --retry 3 "https://unpkg.com/simple-icons@13/icons/$icon.svg" -o "public/icons/$icon.svg"
  echo "ok $icon.svg"
done

# real favicon (replaces the create-next-app default)
curl -sf --retry 3 --max-time 120 "$BASE/2023/05/cropped-favicon-32x32.png" -o src/app/icon.png
rm -f src/app/favicon.ico
echo "ok icon.png"
