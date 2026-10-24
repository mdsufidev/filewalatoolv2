<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />
  
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>XML Sitemap | FileWalaTool</title>
        <style>
          :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --badge-green: #dcfce7;
            --badge-green-text: #15803d;
            --badge-blue: #dbeafe;
            --badge-blue-text: #1d4ed8;
            --badge-purple: #f3e8ff;
            --badge-purple-text: #7e22ce;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.5;
            padding: 32px 16px;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: #ffffff;
            padding: 32px;
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .header p {
            color: #94a3b8;
            font-size: 15px;
            max-width: 800px;
          }
          .stats-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #334155;
          }
          .stat-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
          }
          .stat-item strong {
            color: #38bdf8;
            font-size: 16px;
          }
          .search-box {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .search-box input {
            flex: 1;
            padding: 12px 18px;
            border: 1px solid var(--border);
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            background: #ffffff;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .search-box input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          }
          .table-card {
            background: var(--card-bg);
            border-radius: 16px;
            border: 1px solid var(--border);
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 14px;
          }
          thead th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 600;
            padding: 14px 18px;
            border-bottom: 1px solid var(--border);
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.05em;
          }
          tbody tr {
            border-bottom: 1px solid var(--border);
            transition: background-color 0.15s ease;
          }
          tbody tr:hover {
            background-color: #f8fafc;
          }
          tbody td {
            padding: 14px 18px;
            vertical-align: middle;
          }
          .url-link {
            color: var(--primary);
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
          }
          .url-link:hover {
            color: var(--primary-dark);
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-weekly {
            background: var(--badge-blue);
            color: var(--badge-blue-text);
          }
          .badge-monthly {
            background: var(--badge-green);
            color: var(--badge-green-text);
          }
          .badge-yearly {
            background: var(--badge-purple);
            color: var(--badge-purple-text);
          }
          .priority-bar {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }
          .progress-track {
            width: 48px;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
            display: inline-block;
          }
          .progress-fill {
            height: 100%;
            background: #2563eb;
            border-radius: 3px;
          }
          .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 13px;
            color: var(--text-muted);
          }
          .footer a {
            color: var(--primary);
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media (max-width: 768px) {
            tbody td, thead th {
              padding: 10px 12px;
            }
            .hide-mobile {
              display: none;
            }
          }
        </style>
        <script>
          function filterUrls() {
            var input = document.getElementById("sitemapFilter");
            var filter = input.value.toLowerCase();
            var table = document.getElementById("sitemapTable");
            var tr = table.getElementsByTagName("tr");
            var count = 0;

            for (var i = 1; i &lt; tr.length; i++) {
              var td = tr[i].getElementsByTagName("td")[1];
              if (td) {
                var txtValue = td.textContent || td.innerText;
                if (txtValue.toLowerCase().indexOf(filter) &gt; -1) {
                  tr[i].style.display = "";
                  count++;
                } else {
                  tr[i].style.display = "none";
                }
              }
            }
            document.getElementById("visibleCount").innerText = count;
          }
        </script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>
              <span>📁</span> FileWalaTool XML Sitemap
            </h1>
            <p>
              This is the official search engine XML sitemap for <strong>https://www.filewalatool.com</strong>.
              All utilities are 100% client-side and free. Indexed for Google Search, Bing, DuckDuckGo, and AI Answer Engines (AEO/GEO).
            </p>
            <div class="stats-bar">
              <div class="stat-item">
                Total Indexed URLs: <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)" /></strong>
              </div>
              <div class="stat-item">
                Domain: <strong>www.filewalatool.com</strong>
              </div>
              <div class="stat-item">
                Format: <strong>sitemaps.org 0.9</strong>
              </div>
              <div class="stat-item">
                Developer: <strong>mdsufidev</strong>
              </div>
            </div>
          </div>

          <div class="search-box">
            <input type="text" id="sitemapFilter" onkeyup="filterUrls()" placeholder="Filter or search tool URLs (e.g. compress, pdf, pan, resize)..." />
            <div style="font-size: 13px; color: #64748b; white-space: nowrap;">
              Showing <span id="visibleCount" style="font-weight: 700; color: #0f172a;"><xsl:value-of select="count(sitemap:urlset/sitemap:url)" /></span> of <xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> URLs
            </div>
          </div>

          <div class="table-card">
            <table id="sitemapTable">
              <thead>
                <tr>
                  <th style="width: 48px;">#</th>
                  <th>Page / Tool Location (URL)</th>
                  <th style="width: 120px;">Change Frequency</th>
                  <th style="width: 110px;">Priority</th>
                  <th style="width: 130px;" class="hide-mobile">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td style="color: #94a3b8; font-weight: 600;"><xsl:value-of select="position()" /></td>
                    <td>
                      <a class="url-link" href="{sitemap:loc}" onclick="if (window.location.hostname !== 'www.filewalatool.com' &amp;&amp; window.location.hostname !== 'filewalatool.com') { try { var p = new URL(this.href).pathname; window.location.href = p; return false; } catch(e){} }">
                        <xsl:value-of select="sitemap:loc" />
                      </a>
                    </td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="sitemap:changefreq = 'weekly'">
                          <span class="badge badge-weekly">Weekly</span>
                        </xsl:when>
                        <xsl:when test="sitemap:changefreq = 'monthly'">
                          <span class="badge badge-monthly">Monthly</span>
                        </xsl:when>
                        <xsl:when test="sitemap:changefreq = 'yearly'">
                          <span class="badge badge-yearly">Yearly</span>
                        </xsl:when>
                        <xsl:otherwise>
                          <span class="badge badge-monthly"><xsl:value-of select="sitemap:changefreq" /></span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td>
                      <div class="priority-bar">
                        <span><xsl:value-of select="sitemap:priority" /></span>
                        <div class="progress-track hide-mobile">
                          <div class="progress-fill" style="width: {sitemap:priority * 100}%;"></div>
                        </div>
                      </div>
                    </td>
                    <td class="hide-mobile" style="color: #64748b; font-size: 13px;">
                      <xsl:choose>
                        <xsl:when test="sitemap:lastmod">
                          <xsl:value-of select="sitemap:lastmod" />
                        </xsl:when>
                        <xsl:otherwise>
                          <span>-</span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>
              Generated for <a href="https://www.filewalatool.com/">FileWalaTool</a> · 100% Client-Side Privacy-First Utilities.
              Developed by <a href="https://github.com/mdsufidev" target="_blank">Mohammad Sufiyan (@mdsufidev)</a>.
            </p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
