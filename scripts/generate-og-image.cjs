const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logoPath = path.resolve(__dirname, '../public/logo.png');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
  logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    width: 1200px;
    height: 630px;
    background-color: #ffffff;
    color: #18181b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 36px 44px;
    border: 1px solid #e4e4e7;
    -webkit-font-smoothing: antialiased;
  }

  /* 2D Flat Light-Theme Dot Matrix Grid */
  .dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0, 0, 0, 0.07) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
    z-index: 1;
  }

  /* Subtle Clean Accent Hints */
  .ambient-top-left {
    position: absolute;
    top: -100px;
    left: -100px;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(225, 29, 42, 0.07) 0%, transparent 70%);
    pointer-events: none;
    z-index: 2;
  }
  .ambient-bottom-right {
    position: absolute;
    bottom: -100px;
    right: -100px;
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 2;
  }

  .content-layer {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Top Navigation Bar */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-img {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    object-fit: contain;
    border: 1px solid #e4e4e7;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .brand-title {
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #09090b;
  }
  .version-pill {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
    color: #52525b;
    background: #f4f4f5;
    border: 1px solid #e4e4e7;
    padding: 3px 9px;
    border-radius: 6px;
  }
  .ai-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    font-weight: 600;
    color: #0284c7;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    padding: 5px 13px;
    border-radius: 20px;
  }
  .ai-sparkle {
    font-size: 14px;
  }

  /* Main 2D Split Layout */
  .main-split {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 36px;
    flex: 1;
    margin: 18px 0;
  }

  /* Left Column: Value Prop & Typography */
  .left-col {
    flex: 1;
    max-width: 580px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .category-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    color: #e11d2a;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hero-headline {
    font-size: 44px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -0.035em;
    color: #09090b;
  }
  .hero-headline span {
    color: #e11d2a;
  }
  .hero-subhead {
    font-size: 15px;
    line-height: 1.5;
    color: #52525b;
    font-weight: 400;
  }

  /* 2D Flat AI Feature Badges */
  .badges-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 2px;
  }
  .badge-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fafafa;
    border: 1px solid #e4e4e7;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #27272a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .badge-icon {
    font-size: 14px;
  }

  /* Right Column: 2D Flat AI Studio Mockup Card */
  .right-col {
    width: 470px;
    display: flex;
    flex-direction: column;
  }
  .studio-card {
    background: #ffffff;
    border: 1px solid #d4d4d8;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card-topbar {
    background: #f4f4f5;
    border-bottom: 1px solid #e4e4e7;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .window-dots {
    display: flex;
    gap: 6px;
  }
  .window-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
  .window-dot.red { background: #ef4444; }
  .window-dot.yellow { background: #f59e0b; }
  .window-dot.green { background: #10b981; }
  .card-title {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    font-weight: 700;
    color: #3f3f46;
  }
  .ai-tag {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    font-weight: 700;
    background: #fef2f2;
    border: 1px solid #fecdd3;
    color: #e11d2a;
    padding: 1px 6px;
    border-radius: 4px;
  }

  /* Viewport Workspace */
  .card-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .viewfinder-box {
    position: relative;
    height: 185px;
    background: #fafafa;
    border: 1px solid #d4d4d8;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Left Side: Transparent Cutout Checkerboard */
  .left-side-bg {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 50%;
    background-image: linear-gradient(45deg, #e4e4e7 25%, transparent 25%),
                      linear-gradient(-45deg, #e4e4e7 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #e4e4e7 75%),
                      linear-gradient(-45deg, transparent 75%, #e4e4e7 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0;
    background-color: #ffffff;
  }

  /* Right Side: Cyber Cafe Official Blue */
  .right-side-bg {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 50%;
    background: #0096ff;
  }

  /* Split AI Divider Line with Badge */
  .ai-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background: #ffffff;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ai-handle-pill {
    background: #18181b;
    color: #ffffff;
    font-size: 9px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 10px;
    border: 1px solid #ffffff;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  /* 2D Flat Corner Viewfinder Brackets */
  .corner-bracket {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: #09090b;
    pointer-events: none;
    z-index: 6;
  }
  .cb-tl { top: 6px; left: 6px; border-top: 2px solid #09090b; border-left: 2px solid #09090b; }
  .cb-tr { top: 6px; right: 6px; border-top: 2px solid #ffffff; border-right: 2px solid #ffffff; }
  .cb-bl { bottom: 6px; left: 6px; border-bottom: 2px solid #09090b; border-left: 2px solid #09090b; }
  .cb-br { bottom: 6px; right: 6px; border-bottom: 2px solid #ffffff; border-right: 2px solid #ffffff; }

  /* Top HUD Badge */
  .hud-pill {
    position: absolute;
    top: 9px;
    left: 9px;
    background: #ffffff;
    border: 1px solid #d4d4d8;
    border-radius: 4px;
    padding: 2px 7px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    font-weight: 700;
    color: #09090b;
    z-index: 6;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .hud-pill-right {
    position: absolute;
    top: 9px;
    right: 9px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    padding: 2px 7px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    z-index: 6;
  }

  /* Center Subject Silhouette */
  .subject-illustration {
    position: relative;
    z-index: 3;
    width: 124px;
    height: 156px;
    margin-top: 28px;
  }

  /* Verification Checklist Rows */
  .specs-checklist {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .spec-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fafafa;
    border: 1px solid #e4e4e7;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
  }
  .spec-key {
    color: #3f3f46;
  }
  .spec-status {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    font-weight: 700;
    color: #059669;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .spec-status.ai-active {
    color: #0284c7;
    background: #f0f9ff;
    border-color: #bae6fd;
  }

  /* Bottom Footer */
  .bottom-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid #e4e4e7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #71717a;
  }
  .site-domain {
    font-weight: 700;
    color: #09090b;
  }
  .engine-tech {
    color: #52525b;
  }
</style>
</head>
<body>
  <div class="dot-grid"></div>
  <div class="ambient-top-left"></div>
  <div class="ambient-bottom-right"></div>

  <div class="content-layer">
    <!-- Top Nav -->
    <div class="top-bar">
      <div class="brand-group">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo" />` : '<div class="logo-img" style="background:#e11d2a;"></div>'}
        <span class="brand-title">FileWala Tool</span>
        <span class="version-pill">v2.0 · On-Device AI</span>
      </div>
      <div class="ai-status">
        <span class="ai-sparkle">✨</span>
        <span>Neural AI Models Running 100% In-RAM · Zero Cloud Uploads</span>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="main-split">
      <!-- Left Column -->
      <div class="left-col">
        <div class="category-tag">
          <span>✨</span>
          <span>Indian Govt Compliance &amp; AI Studio</span>
        </div>

        <h1 class="hero-headline">
          The AI-Powered File &amp;<br>
          <span>Govt Photo Studio.</span>
        </h1>

        <p class="hero-subhead">
          Automatic AI portrait enhancement, neural face deblurring &amp; sub-second background matting. Formats PAN, Passport, UPSC &amp; SSC photos to official government specs with 100% client-side privacy.
        </p>

        <div class="badges-grid">
          <div class="badge-item">
            <span class="badge-icon">✨</span>
            <span>AI Neural Face Enhancer</span>
          </div>
          <div class="badge-item">
            <span class="badge-icon">⚡</span>
            <span>Sub-Second AI BG Remover</span>
          </div>
          <div class="badge-item">
            <span class="badge-icon">🇮🇳</span>
            <span>PAN · Passport · UPSC · SSC</span>
          </div>
          <div class="badge-item">
            <span class="badge-icon">🔒</span>
            <span>100% Private (No Uploads)</span>
          </div>
        </div>
      </div>

      <!-- Right Column: 2D Flat Studio Mockup Card -->
      <div class="right-col">
        <div class="studio-card">
          <div class="card-topbar">
            <div class="window-dots">
              <div class="window-dot red"></div>
              <div class="window-dot yellow"></div>
              <div class="window-dot green"></div>
            </div>
            <div class="card-title">Cyber Cafe AI Studio · Live Matting</div>
            <div class="ai-tag">✨ AI ACTIVE</div>
          </div>

          <div class="card-body">
            <!-- 2D Biometric Viewfinder -->
            <div class="viewfinder-box">
              <div class="left-side-bg"></div>
              <div class="right-side-bg"></div>

              <!-- AI Split Slider Indicator -->
              <div class="ai-divider">
                <div class="ai-handle-pill">✨ AI CUTOUT</div>
              </div>

              <!-- Viewfinder Brackets -->
              <div class="corner-bracket cb-tl"></div>
              <div class="corner-bracket cb-tr"></div>
              <div class="corner-bracket cb-bl"></div>
              <div class="corner-bracket cb-br"></div>

              <!-- HUD Pills -->
              <div class="hud-pill">Original Cutout</div>
              <div class="hud-pill-right">CSC Blue Fill</div>

              <!-- Clean 2D Flat Passport Silhouette SVG -->
              <svg class="subject-illustration" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Hair -->
                <path d="M30 46 C30 20, 70 20, 70 46 C66 38, 60 34, 50 34 C40 34, 34 38, 30 46 Z" fill="#18181b" />
                <!-- Head -->
                <circle cx="50" cy="46" r="19" fill="#fed7aa" />
                <path d="M40 38 C42 26, 58 26, 60 38 Z" fill="#09090b" />
                <!-- Neck -->
                <rect x="45" y="62" width="10" height="12" rx="2" fill="#fdba74" />
                <!-- Shoulders / Suit (2D Flat) -->
                <path d="M16 115 C18 84, 35 74, 50 74 C65 74, 82 84, 84 115 Z" fill="#18181b" />
                <!-- Shirt Collar -->
                <path d="M42 74 L50 86 L58 74 Z" fill="#ffffff" />
                <!-- Formal Tie -->
                <path d="M48 85 L52 85 L53 108 L50 114 L47 108 Z" fill="#e11d2a" />
              </svg>
            </div>

            <!-- Verification Checklist -->
            <div class="specs-checklist">
              <div class="spec-row">
                <span class="spec-key">AI Neural Face Restore (GFPGAN)</span>
                <span class="spec-status ai-active">ENHANCED ✨</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">AI Background: CSC Sky Blue Standard</span>
                <span class="spec-status ai-active">APPLIED ✓</span>
              </div>
              <div class="spec-row">
                <span class="spec-key">Govt Specs: 197×276 px · 200 DPI · 38 KB</span>
                <span class="spec-status">PASS ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Footer -->
    <div class="bottom-footer">
      <span class="site-domain">https://www.filewalatool.com</span>
      <span>46+ In-Browser AI &amp; Document Tools</span>
      <span class="engine-tech">Powered by WebAssembly &amp; WebGPU · Zero Server</span>
    </div>
  </div>
</body>
</html>`;

const tempHtmlPath = path.resolve(__dirname, 'temp-og.html');
const outputPath = path.resolve(__dirname, '../public/og-image.png');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

try {
  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
  console.log('Rendering 2D Flat White Background AI OG image...');
  execSync(
    `"${edgePath}" --headless=new --screenshot="${outputPath}" --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 "${fileUrl}"`,
    { stdio: 'pipe' }
  );
  const stat = fs.statSync(outputPath);
  console.log(`Successfully generated 1200x630 White AI OG image at ${outputPath} (${stat.size} bytes)`);
} catch (err) {
  console.error('Render error:', err.message);
} finally {
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
}
