const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// User screenshot source path
const userImgPath = 'C:\\Users\\sufi1\\Pictures\\Screenshots\\filewalatool.png';
const fallbackAppIllustration = path.resolve(__dirname, '../public/app-illustration.png');

let sourcePath = userImgPath;
if (!fs.existsSync(sourcePath)) {
  if (fs.existsSync(fallbackAppIllustration)) {
    sourcePath = fallbackAppIllustration;
  } else {
    console.error('Source image not found at', userImgPath);
    process.exit(1);
  }
}

const base64 = fs.readFileSync(sourcePath).toString('base64');
const dataUrl = 'data:image/png;base64,' + base64;

// 1200x630 HTML Template with the user's graphic
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .bg-img {
    width: 1200px;
    height: 630px;
    object-fit: contain;
    object-position: center;
    background-color: #ffffff;
  }
</style>
</head>
<body>
  <img src="${dataUrl}" class="bg-img" alt="FileWala Tool OG" />
</body>
</html>`;

const tempHtml = path.resolve(__dirname, 'temp-user-og.html');
const outPng = path.resolve(__dirname, '../public/og-image.png');
fs.writeFileSync(tempHtml, html, 'utf-8');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fileUrl = 'file:///' + tempHtml.replace(/\\/g, '/');

try {
  execSync(
    `"${edgePath}" --headless=new --screenshot="${outPng}" --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 "${fileUrl}"`,
    { stdio: 'pipe' }
  );
  console.log('Successfully generated 1200x630 OG image at', outPng, 'size:', fs.statSync(outPng).size);

  // Also copy to dist if dist exists
  const distOut = path.resolve(__dirname, '../dist/og-image.png');
  if (fs.existsSync(path.dirname(distOut))) {
    fs.copyFileSync(outPng, distOut);
    console.log('Copied to dist/og-image.png');
  }

  // Also copy user screenshot to public/app-illustration.png so the application can use it as background!
  const publicAppBg = path.resolve(__dirname, '../public/app-illustration.png');
  fs.copyFileSync(sourcePath, publicAppBg);
  console.log('Copied to public/app-illustration.png for application background');

  const distAppBg = path.resolve(__dirname, '../dist/app-illustration.png');
  if (fs.existsSync(path.dirname(distAppBg))) {
    fs.copyFileSync(sourcePath, distAppBg);
  }
} catch (err) {
  console.error('Render error:', err.message);
} finally {
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
}
