export interface OfficialPortalSpec {
  portalName: string;
  sourceUrl: string;
  documentDate: string;
  accessDate: string;
  applicableForms: string;
  dimensions: string;
  fileSizeRange: string;
  dpi: string;
  format: string;
  specialRules: string;
  fileWalaPreset: string;
}

export interface PracticalStep {
  title: string;
  desc: string;
}

export interface CommonMistake {
  title: string;
  mistake: string;
  fix: string;
}

export interface GovToolFaq {
  question: string;
  answer: string;
}

export interface RelatedToolLink {
  name: string;
  url: string;
  desc: string;
}

export interface GovToolContentData {
  toolId: string;
  toolName: string;
  whatItDoes: string;
  targetAudience: string[];
  steps: PracticalStep[];
  officialMatrix: OfficialPortalSpec[];
  recommendationNotice?: string;
  applicantReminder: string;
  commonMistakes: CommonMistake[];
  supportedFormats: string;
  limitations: string[];
  faqs: GovToolFaq[];
  relatedTools: RelatedToolLink[];
  disclaimer: string;
}

export const GOV_TOOLS_CONTENT: Record<string, GovToolContentData> = {
  'pan-photo-resize': {
    toolId: 'pan-photo-resize',
    toolName: 'PAN Card Photo Resizer & DPI Formatter',
    whatItDoes:
      'Calibrates passport portraits to the exact dimensional, resolution, and byte-weight requirements of the Indian Permanent Account Number (PAN) application portals (Protean NSDL and UTIITSL). Embeds the mandatory 200 DPI resolution tag into the JPEG header and constrains file weight strictly between 20 KB and 50 KB in local browser RAM.',
    targetAudience: [
      'Indian citizens applying for fresh PAN cards (Form 49A)',
      'Foreign citizens and NRI applicants (Form 49AA)',
      'Applicants submitting PAN correction or photo re-upload requests',
      'CSC center, cyber café, and tax consultant operators preparing client applications'
    ],
    steps: [
      {
        title: 'Upload Passport Portrait',
        desc: 'Drag & drop any JPEG, PNG, or WebP photo up to 50MB. The file loads directly into your browser memory and is never uploaded to any server.'
      },
      {
        title: 'Choose Portal Preset',
        desc: 'Select Protean (NSDL) for 197 × 276 pixels (3.5 × 2.5 cm, 20–50 KB) or UTIITSL for 213 × 213 pixels (< 30 KB, 300 DPI).'
      },
      {
        title: 'Align Face in Guidelines',
        desc: 'Use the interactive zoom slider and pan controls to center your face within the guide box, ensuring facial features cover 70% to 80% of the frame.'
      },
      {
        title: 'Download Compliant JPEG',
        desc: 'Click Download Formatted Photo. The output image is strictly bounded below 50 KB with a binary 200 DPI or 300 DPI JFIF header embedded.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Protean eGov Technologies (formerly NSDL)',
        sourceUrl: 'https://tinpan.proteantech.in/',
        documentDate: 'Annual Notification 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Form 49A (Domestic) & Form 49AA (Foreign Citizens)',
        dimensions: '3.5 cm × 2.5 cm (197 × 276 pixels @ 200 DPI)',
        fileSizeRange: 'Strictly between 20 KB and 50 KB',
        dpi: 'Exactly 200 DPI (Embedded JFIF Header)',
        format: 'JPEG / JPG only',
        specialRules: 'Plain light or white background; frontal view with both ears visible; neutral expression.',
        fileWalaPreset: 'Protean (NSDL) Standard (197×276 px, 20–50 KB, 200 DPI)'
      },
      {
        portalName: 'UTIITSL Government PAN Portal',
        sourceUrl: 'https://www.pan.utiitsl.com/',
        documentDate: 'Annual Instructions 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'UTIITSL Online PAN Application (New & Correction)',
        dimensions: '213 × 213 pixels (Square 1:1 Aspect Ratio)',
        fileSizeRange: 'Strictly less than 30 KB',
        dpi: '300 DPI',
        format: 'JPEG / JPG only',
        specialRules: 'Pure white background; clear frontal lighting without shadows behind head.',
        fileWalaPreset: 'UTIITSL Standard (213×213 px, 15–30 KB, 300 DPI)'
      }
    ],
    recommendationNotice:
      'Official standards require specific dimensions and DPI. We recommend wearing dark-colored clothing (such as dark blue, black, or maroon) to ensure clear contrast against the mandatory white background.',
    applicantReminder:
      'Always verify the scanning instructions shown on your specific PAN application portal before submitting, as guidelines can occasionally vary between individual service modes (such as physical paper submission vs e-KYC).',
    commonMistakes: [
      {
        title: 'Aspect Ratio Mismatch',
        mistake: 'Uploading a square 213×213 px photo to NSDL or a rectangular 200×230 px photo to UTIITSL.',
        fix: 'Select the preset specifically matched to your application agency (Protean vs UTIITSL).'
      },
      {
        title: 'Exceeding 50 KB by Single Bytes',
        mistake: 'Uploading a photo weighing 50.4 KB or 51 KB.',
        fix: 'FileWala automatically enforces an upper limit of 45 KB to leave a safe margin.'
      },
      {
        title: 'Missing 200 DPI JFIF Header',
        mistake: 'Saving from phone cameras, which record images at 72 DPI.',
        fix: 'FileWala writes binary 200 DPI JFIF tags directly into the JPEG byte stream.'
      },
      {
        title: 'Patterned or Dark Backgrounds',
        mistake: 'Taking photos against outdoor walls or colorful home curtains.',
        fix: 'Use a plain white or off-white wall with balanced frontal light.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, JPG, PNG, WebP up to 50MB. Output: Baseline JPEG with JFIF 200 DPI or 300 DPI metadata.',
    limitations: [
      'Cannot sharpen severely blurred original photos; please provide a sharp initial picture.',
      'All image processing executes in client browser memory (RAM); devices with very low free RAM should close other tabs.'
    ],
    faqs: [
      {
        question: 'Why was my photo rejected with an "Invalid File Size" or "Incorrect DPI" error?',
        answer:
          'Government portals like Protean and UTIITSL check internal binary headers. A photo smaller than 20 KB or lacking the 200 DPI JFIF marker is automatically rejected. FileWala writes the exact 200 DPI marker and regulates the file size into the 20 KB – 50 KB bracket.'
      },
      {
        question: 'Is my photo uploaded to any server or database?',
        answer:
          'No. 100% of the image cropping, zoom transformation, DPI embedding, and compression executes entirely inside your browser using HTML5 Canvas and Web APIs. Your photo never leaves your device.'
      },
      {
        question: 'Can I upload a photo taken from a smartphone?',
        answer:
          'Yes! Use the zoom slider and pan drag controls to crop your face from a high-resolution smartphone photo. The tool formats it to 197×276 px (NSDL Protean) or 213×213 px (UTIITSL) according to your chosen agency.'
      },
      {
        question: 'What is the difference between NSDL and UTIITSL PAN photo requirements?',
        answer:
          'Protean NSDL requires a rectangular aspect ratio of 3.5×2.5 cm (197×276 px) at 200 DPI between 20 KB and 50 KB. UTIITSL requires a square aspect ratio of 213×213 px at 300 DPI strictly under 30 KB. Submitting the wrong ratio will cause an automated portal rejection.'
      },
      {
        question: 'What clothing and background should I use for a PAN card photo?',
        answer:
          'Both portals require a plain white or light off-white background with even lighting. Wear dark-colored clothing for contrast. Avoid white clothing that blends into the background, and remove sunglasses or glare-reflecting spectacles.'
      }
    ],
    relatedTools: [
      { name: 'PAN Signature Resizer', url: '/signature-resize', desc: 'Format official 354×157 px signature under 50 KB at 200 DPI' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress Aadhaar, voter ID, and certificates under 100 KB or 200 KB' },
      { name: 'Passport Photo Resizer', url: '/passport-photo', desc: 'Create 350×450 px passport photos for Passport Seva Kendra' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Income Tax Department of India, Protean eGov Technologies Limited (NSDL), or UTIITSL. Portal specifications are aggregated from public guidelines for applicant assistance. Always review instructions on your active application form.'
  },

  'signature-resize': {
    toolId: 'signature-resize',
    toolName: 'PAN Card Signature Resizer & Whitener',
    whatItDoes:
      'Scales, cleans, whitens, and compresses candidate signatures to comply with Protean NSDL and UTIITSL PAN portal upload criteria. Features an automated background whitening algorithm that eliminates paper grain and ambient shadows to pure white (#FFFFFF) while preserving crisp ink strokes.',
    targetAudience: [
      'PAN card applicants submitting Form 49A or 49AA',
      'Citizens submitting signature updates for existing PAN cards',
      'Tax professionals, chartered accountants, and CSC centers'
    ],
    steps: [
      {
        title: 'Sign on Plain White Paper',
        desc: 'Sign clearly using a black or dark-blue ballpoint pen inside a small unruled rectangular area.'
      },
      {
        title: 'Upload Mobile Photo of Signature',
        desc: 'Take a clear, shadow-free photo with your phone and upload it. File processing runs 100% in local memory.'
      },
      {
        title: 'Apply Paper Whitening',
        desc: 'Use the Paper Whitening slider to remove background shadows and grey cast, turning paper into clean white.'
      },
      {
        title: 'Download Compliant Signature',
        desc: 'Click Download Signature. The exported file is strictly bounded (354×157 px, < 50 KB) with 200 DPI metadata.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Protean (NSDL) Portal',
        sourceUrl: 'https://tinpan.proteantech.in/',
        documentDate: 'Annual Notification 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Form 49A & 49AA Online Signature Upload',
        dimensions: '2.0 cm × 4.5 cm (corresponds to 354 × 157 pixels)',
        fileSizeRange: 'Strictly between 10 KB and 50 KB',
        dpi: 'Exactly 200 DPI',
        format: 'JPEG / JPG only',
        specialRules: 'Signed with black or dark-blue ink on plain white paper; signature must not touch outer borders.',
        fileWalaPreset: 'Protean (NSDL) Signature (354×157 px, 10–50 KB, 200 DPI)'
      },
      {
        portalName: 'UTIITSL Government Portal',
        sourceUrl: 'https://www.pan.utiitsl.com/',
        documentDate: 'Annual Instructions 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'UTIITSL Online PAN Application',
        dimensions: '2.0 cm × 4.0 cm (or 400 × 200 pixels)',
        fileSizeRange: 'Strictly less than 60 KB',
        dpi: '600 DPI (or 200–600 DPI)',
        format: 'JPEG / JPG only',
        specialRules: 'Black ink preferred; pure white canvas background.',
        fileWalaPreset: 'UTIITSL Signature (400×200 px, 10–60 KB, 600 DPI)'
      }
    ],
    recommendationNotice:
      'We recommend signing with a standard dark ballpoint pen rather than a gel or felt pen, as gel ink can smudge and cause jagged binary compression artifacts.',
    applicantReminder:
      'Sign in your normal cursive handwriting style. Never sign in block capital letters, as signatures written in all-caps will be rejected by verification officers.',
    commonMistakes: [
      {
        title: 'Signing on Lined Notebook Paper',
        mistake: 'Using ruled paper with blue or grey horizontal lines.',
        fix: 'Sign strictly on blank, unruled white printer paper.'
      },
      {
        title: 'Ambient Shadows on Paper',
        mistake: 'Taking a photo directly beneath ceiling lights that cast hand/phone shadows.',
        fix: 'Use FileWala’s Paper Whitening slider to boost background threshold to pure #FFFFFF.'
      },
      {
        title: 'Using Unapproved Ink Colors',
        mistake: 'Signing with red, green, or purple ink, or faint pencil.',
        fix: 'Use only black or dark-blue ink.'
      },
      {
        title: 'Signatures Touching the Border',
        mistake: 'Cropping so tightly that the signature letters touch the image edges.',
        fix: 'Leave a clean 5% white margin around the top, bottom, and sides of your signature.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, PNG, WebP up to 50MB. Output: 200 DPI baseline JPEG.',
    limitations: [
      'Cannot remove notebook lines that cut through signature strokes without distorting the signature.',
      'Severely underexposed or blurred phone camera photos may lose thin stroke tails.'
    ],
    faqs: [
      {
        question: 'Can I use a signature cropped from a mobile camera photo?',
        answer:
          'Absolutely. Use the zoom slider to enlarge your signature, position it inside the crop box, and increase the Paper Whitening slider to eliminate background grayness or table shadows.'
      },
      {
        question: 'What pen color is accepted by government portals?',
        answer:
          'Protean (NSDL) and UTIITSL accept black or dark-blue ink signatures. Red, green, or pencil markings will be rejected by verification officers.'
      },
      {
        question: 'Why does government portal upload error on "Signature DPI"?',
        answer:
          'Government scanners look for a 200 DPI JFIF APP0 header inside the JPEG binary. FileWala embeds this exact header so the portal verification script validates it automatically.'
      },
      {
        question: 'Why are signatures on lined or ruled paper rejected?',
        answer:
          'Horizontal notebook lines cut through the signature strokes. Automated OCR scanners and card printers cannot distinguish between ink strokes and paper lines, which causes automatic rejection.'
      },
      {
        question: 'Can I sign in block or capital letters?',
        answer:
          'No. Official government instructions strictly require running handwriting. Signatures written in all-capital block letters (e.g., "RAHUL SHARMA") will be flagged as invalid during scrutiny.'
      }
    ],
    relatedTools: [
      { name: 'PAN Photo Resizer', url: '/pan-photo-resize', desc: 'Format official 197×276 px (NSDL) or 213×213 px (UTIITSL) photo' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress Aadhaar, passbooks, and certificates under 100 KB' },
      { name: 'Passport Signature Resizer', url: '/passport-signature-resize', desc: 'Format signature for Passport Seva (400×200 px, 300 DPI)' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Income Tax Department of India, Protean eGov Technologies Limited, or UTIITSL. Guidelines are provided for candidate convenience. Always review the instructions on your application portal.'
  },

  'passport-photo': {
    toolId: 'passport-photo-resize',
    toolName: 'Passport Seva Photo Resizer (630×810 px Digital / 35×45 mm Print)',
    whatItDoes:
      'Calibrates passport and visa photographs according to the Ministry of External Affairs (MEA) Passport Seva Kendra biometric standards. Provides interactive head-to-chin visual framing guides, background contrast enhancement, and 300 DPI JPEG encoding strictly under 250 KB (10–250 KB range).',
    targetAudience: [
      'Citizens applying for fresh Indian passports or renewals via Passport Seva Kendra (PSK)',
      'Applicants for Tatkaal passport processing and police clearance certificates (PCC)',
      'Overseas Citizens of India (OCI) and Indian e-Visa applicants'
    ],
    steps: [
      {
        title: 'Upload Frontal Portrait',
        desc: 'Select a front-facing portrait taken in good light against a plain wall. File loads in browser RAM with zero cloud uploads.'
      },
      {
        title: 'Align Biometric Guide',
        desc: 'Position the top guideline on the crown of your head and the bottom guideline on your chin to lock 70%–80% face coverage.'
      },
      {
        title: 'Fine-Tune Lighting & Color',
        desc: 'Adjust brightness and contrast sliders to ensure natural skin tones and a clean white background.'
      },
      {
        title: 'Download 300 DPI JPEG',
        desc: 'Save your calibrated JPEG (630 × 810 px digital upload or 350 × 450 px physical print), strictly between 10 KB and 250 KB with 300 DPI JFIF metadata.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Ministry of External Affairs (MEA) Passport Seva',
        sourceUrl: 'https://www.passportindia.gov.in/psp',
        documentDate: 'Current Guidelines 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Passport Application Form, Reissue, Tatkaal & OCI',
        dimensions: 'Digital Upload: 630 × 810 pixels (7:9 ratio); Physical Print: 35 mm × 45 mm (350 × 450 pixels)',
        fileSizeRange: 'Strictly between 10 KB and 250 KB',
        dpi: '300 DPI recommended',
        format: 'JPEG / JPG only',
        specialRules: '70%–80% facial coverage (31–36 mm from chin to top of hair); pure white background; neutral expression; both ears visible.',
        fileWalaPreset: 'Passport Seva Digital Upload (630×810 px, 10–250 KB, 300 DPI)'
      },
      {
        portalName: 'Indian Visa Online Portal',
        sourceUrl: 'https://indianvisaonline.gov.in',
        documentDate: 'Current Guidelines 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Indian e-Visa, Regular Visa & Conference Visa',
        dimensions: '2 × 2 inches (51 × 51 mm / 600 × 600 pixels)',
        fileSizeRange: '10 KB to 300 KB',
        dpi: '300 DPI',
        format: 'JPEG / JPG only',
        specialRules: 'Square aspect ratio; full face directly facing camera.',
        fileWalaPreset: 'Indian Visa (Square) (600×600 px, 20–300 KB, 300 DPI)'
      }
    ],
    recommendationNotice:
      'Avoid wearing white or very pale shirts that blend with the background. Wear medium or dark-toned collared shirts to clearly define your shoulders.',
    applicantReminder:
      'Photograph must be recent (taken within the last 6 months). For Passport Seva Kendra visits, physical printouts must match the uploaded digital file.',
    commonMistakes: [
      {
        title: 'Improper Facial Ratio',
        mistake: 'Head occupying less than 60% (too far) or more than 85% (cropped forehead/chin).',
        fix: 'Use FileWala’s biometric alignment overlay to align crown and chin precisely.'
      },
      {
        title: 'Flash Glare on Spectacles',
        mistake: 'White flash reflection covering pupils or eyelids.',
        fix: 'Remove spectacles or adjust lighting so there is zero glare.'
      },
      {
        title: 'Shadows on Background Wall',
        mistake: 'Dark head silhouettes cast on the wall behind the candidate.',
        fix: 'Step 2–3 feet away from the background wall to avoid cast shadows.'
      },
      {
        title: 'Off-Center Head Tilt',
        mistake: 'Tilting the head sideways or looking away from the camera lens.',
        fix: 'Look directly into the camera lens with eyes level and mouth closed.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, PNG, WebP up to 50MB. Output: 300 DPI baseline JPEG.',
    limitations: [
      'Cannot edit closed eyes or open mouth smiles into neutral expressions.',
      'Cannot remove hair covering the ears; a clean portrait must be taken.'
    ],
    faqs: [
      {
        question: 'What are the official Passport Seva photo specifications?',
        answer:
          'Ministry of External Affairs (MEA) Passport Seva requires a color photograph formatted either as 630×810 px (10–250 KB) for online digital portal upload or 35 mm × 45 mm (350×450 px) for physical submissions, plain white background, frontal view with 70%–80% head coverage, strictly between 10 KB and 250 KB in JPEG format at 300 DPI.'
      },
      {
        question: 'Why does the Passport portal reject my uploaded photo?',
        answer:
          'Rejections usually happen due to dark/colored backgrounds, incorrect aspect ratio, red-eye, or file sizes exceeding 250 KB. This tool guarantees exact 630x810 px digital upload or 350x450 px dimensions, white background padding, and 300 DPI JFIF metadata headers strictly under 250 KB.'
      },
      {
        question: 'Are spectacles allowed in Indian passport photos?',
        answer:
          'Plain tinted lenses or glare-reflecting spectacles are strictly not allowed. Clear prescription glasses are acceptable only if eyes are visible with zero glare.'
      },
      {
        question: 'Can I wear traditional religious headwear in my passport photo?',
        answer:
          'Yes, religious headwear (such as turbans or hijabs) is permitted, provided the full facial oval from the bottom of the chin to the top of the forehead and both edges of the face are clearly visible without shadows.'
      },
      {
        question: 'What color clothing should I wear for a passport photo?',
        answer:
          'Wear dark or medium-contrast clothing such as navy blue, black, or grey. Avoid white or light cream shirts, as they will blend into the mandatory white background and cause biometric boundary failure.'
      }
    ],
    relatedTools: [
      { name: 'Passport Signature Resizer', url: '/passport-signature-resize', desc: 'Format signature for Passport Seva (400×200 px, 300 DPI)' },
      { name: 'PAN Photo Resizer', url: '/pan-photo-resize', desc: 'Format 197×276 px or 213×213 px photo for NSDL / UTIITSL PAN cards' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress birth certificate, Aadhaar, and marksheets under 200 KB' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Ministry of External Affairs (MEA), Government of India, or any Passport Seva Kendra (PSK). Specifications are aggregated from official MEA publications for candidate assistance.'
  },

  'passport-signature-resize': {
    toolId: 'passport-signature-resize',
    toolName: 'Passport Seva Signature Resizer (400×200 px, 300 DPI)',
    whatItDoes:
      'Calibrates and cleans signature scans for Indian Passport Seva Kendra online submissions. Enforces the 4.0 × 2.0 cm (400 × 200 px) dimension ratio, locks file size between 10 KB and 100 KB, purifies background paper to clean white, and embeds 300 DPI resolution metadata.',
    targetAudience: [
      'Adult applicants submitting online passport renewal or fresh applications',
      'Parents/guardians signing on behalf of minor applicants',
      'Passport assistance desks and facilitation centers'
    ],
    steps: [
      {
        title: 'Draw a 4×2 cm Box',
        desc: 'Draw an outline of approximately 4.0 × 2.0 cm on plain unruled white paper and sign inside using dark ink.'
      },
      {
        title: 'Upload Signature Scan',
        desc: 'Select your photo or scan. Processing executes client-side with zero data leaving your device.'
      },
      {
        title: 'Clean Background Noise',
        desc: 'Use the Paper Whitening slider to turn off-white scanner/phone shadows into pure white while boosting ink contrast.'
      },
      {
        title: 'Download Passport Signature',
        desc: 'Download your 400 × 200 px JPEG under 100 KB with genuine 300 DPI JFIF metadata embedded.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Passport Seva Kendra (MEA)',
        sourceUrl: 'https://www.passportindia.gov.in/psp',
        documentDate: 'Current Guidelines 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Online Passport Application Form',
        dimensions: '4.0 cm width × 2.0 cm height (400 × 200 pixels at 300 DPI)',
        fileSizeRange: 'Strictly between 10 KB and 100 KB',
        dpi: '300 DPI',
        format: 'JPEG / JPG only',
        specialRules: 'Signed with black or dark-blue ballpoint pen on plain white paper; signature must not touch outer borders.',
        fileWalaPreset: 'Passport Seva Standard (400×200 px, 10–100 KB, 300 DPI)'
      }
    ],
    recommendationNotice:
      'Sign inside the designated area. If your signature touches or extends beyond the outer crop border, it may be rejected during verification.',
    applicantReminder:
      'Ensure the signature matches the one in your supporting identity documents (such as your PAN card, Aadhaar, or previous passport).',
    commonMistakes: [
      {
        title: 'File Size Below 10 KB',
        mistake: 'Compressing thumbnails down to 6–8 KB, which fails portal validation.',
        fix: 'FileWala locks byte weight safely between 25 KB and 75 KB.'
      },
      {
        title: 'Block Letters',
        mistake: 'Writing candidate name in separate capital letters.',
        fix: 'Sign in regular cursive handwriting.'
      },
      {
        title: 'Colored Gel Pens',
        mistake: 'Using red, green, or glitter pens.',
        fix: 'Use only standard black or dark-blue ballpoint pen.'
      },
      {
        title: 'Clipped Letter Tails',
        mistake: 'Cropping so tightly that loops of letters like "g", "y", or "j" get cut off.',
        fix: 'Leave adequate white padding on all sides.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, PNG, WebP up to 50MB. Output: 300 DPI baseline JPEG.',
    limitations: [
      'Cannot remove notebook lines that intersect the signature without distorting ink strokes.',
      'Extremely faint pencil signatures cannot be brought to full black without introducing noise.'
    ],
    faqs: [
      {
        question: 'What ink color is acceptable for Passport Seva signatures?',
        answer:
          'The Ministry of External Affairs mandates black or dark-blue ballpoint/gel ink on an unruled, pure white sheet of paper. Signatures with faint pencil, sketchy markers, or colored pens will be rejected.'
      },
      {
        question: 'How does the background whitening feature work?',
        answer:
          'Physical paper scans usually have grey cast or ambient shadow. The tool uses pixel threshold analysis directly inside your browser to convert shaded grey background paper into pure 255,255,255 white while keeping ink strokes sharp.'
      },
      {
        question: 'What is the required file size for Passport Seva signatures?',
        answer:
          'Signatures must be in JPEG/JPG format, under 100 KB (strictly between 10 KB and 100 KB), formatted with a 300 DPI resolution header.'
      },
      {
        question: 'What should I do if my signature was rejected for low file size?',
        answer:
          'The Passport Seva portal enforces a strict 10 KB floor. If an image is 8 KB, it is rejected. FileWala’s engine targets the safe 30–60 KB range so your file easily passes both the minimum and maximum boundaries.'
      },
      {
        question: 'Can a minor applicant sign their own passport application?',
        answer:
          'Minors who can sign should provide their signature. For minor children who cannot sign, their left thumb impression (for boys) or right thumb impression (for girls) is placed inside the signature box.'
      }
    ],
    relatedTools: [
      { name: 'Passport Photo Resizer', url: '/passport-photo', desc: 'Format official 350×450 px passport photo at 300 DPI' },
      { name: 'PAN Signature Resizer', url: '/signature-resize', desc: 'Format 354×157 px signature for PAN card' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress birth certificate, Aadhaar, and marksheets under 100 KB' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Ministry of External Affairs (MEA), Government of India, or any Passport Seva Kendra (PSK). Specifications are aggregated from official MEA instructions for applicant assistance.'
  },

  'upsc-photo-maker': {
    toolId: 'upsc-photo-maker',
    toolName: 'UPSC Photo Maker with Candidate Name & Date Stamp (DOP)',
    whatItDoes:
      'Formats candidate photographs for the Union Public Service Commission (UPSC) One Time Registration (OTR) and examination applications (CSE, NDA, CDS, CMS, IES). Automatically adds the mandatory white bottom banner inscribed with the candidate full name and Date of Photo (DOP), formats to 350 × 350 px, and constrains file weight between 20 KB and 300 KB.',
    targetAudience: [
      'UPSC Civil Services Examination (IAS, IPS, IFS) aspirants',
      'NDA, CDS, and CAPF recruitment applicants',
      'Candidates completing UPSC One Time Registration (OTR) profile updates'
    ],
    steps: [
      {
        title: 'Upload Recent Portrait',
        desc: 'Select a recent photo (not older than 10 days from notification commencement). All rendering executes in browser RAM.'
      },
      {
        title: 'Enter Name and Date of Photo (DOP)',
        desc: 'Type your full name in uppercase and pick the date the photo was taken. The tool renders a clean white strip with crisp dark lettering.'
      },
      {
        title: 'Position Face Frame',
        desc: 'Zoom and pan to ensure your face covers approximately three-fourths (75%) of the frame as required by UPSC rules.'
      },
      {
        title: 'Download OTR Compliant JPEG',
        desc: 'Click Download UPSC Photo. The output is calibrated to 350 × 350 px, strictly between 20 KB and 300 KB with 200 DPI metadata.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Union Public Service Commission (UPSC OTR)',
        sourceUrl: 'https://upsconline.nic.in/',
        documentDate: 'Civil Services Notification 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'UPSC OTR & Civil Services (CSE, NDA, CDS, CMS, IES)',
        dimensions: 'Minimum 350 × 350 pixels up to maximum 1000 × 1000 pixels (1:1 Square)',
        fileSizeRange: 'Strictly between 20 KB and 300 KB',
        dpi: '200 to 300 DPI',
        format: 'JPG / JPEG only',
        specialRules: 'Mandatory candidate Name & Date of Photo (DOP) printed on bottom strip; photo taken within 10 days; face covers ~75% of frame.',
        fileWalaPreset: 'UPSC OTR Standard (350×350 px, 20–300 KB, 200 DPI)'
      }
    ],
    recommendationNotice:
      'Make sure your appearance (hairstyle, facial hair/clean-shaven, spectacles) in the uploaded photo matches your appearance during the live photo capture on the UPSC portal.',
    applicantReminder:
      'Photograph must not be older than 10 days from the opening of the application portal. Ensure the name spelling strictly matches your Class 10 certificate.',
    commonMistakes: [
      {
        title: 'Missing Name & Date Banner',
        mistake: 'Uploading a plain photo without candidate name and DOP.',
        fix: 'Use FileWala’s integrated text banner generator to stamp both fields automatically.'
      },
      {
        title: 'Old Date of Photo',
        mistake: 'Entering a date several months in the past.',
        fix: 'Ensure the date is within 10 days of the exam application start.'
      },
      {
        title: 'Appearance Mismatch with Live Capture',
        mistake: 'Uploading an old clean-shaven photo while having a full beard during webcam live capture.',
        fix: 'Ensure consistent facial appearance between uploaded photo and live capture.'
      },
      {
        title: 'Face Too Far Away',
        mistake: 'Showing full torso and shoulders with face covering less than 50% of photo.',
        fix: 'Zoom in so face occupies approx 75% of the frame.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, PNG, WebP up to 50MB. Output: 350×350 px JPEG with crisp rendered text banner and 200 DPI JFIF tags.',
    limitations: [
      'Candidate is responsible for entering their correct legal name and date.',
      'Cannot remove sunglasses or hats from an uploaded selfie; take a clean portrait first.'
    ],
    faqs: [
      {
        question: 'Is the Name and Date of Photograph (DOP) mandatory for UPSC?',
        answer:
          'Yes. Per the latest UPSC Civil Services (CSE, CDS, NDA, CDS) guidelines, the photograph uploaded during One Time Registration (OTR) and form submission must clearly display the candidate\'s name and the date on which the photograph was taken.'
      },
      {
        question: 'How recent should the UPSC photograph date be?',
        answer:
          'The photograph should not be more than 10 days old from the date of online application submission, with candidate name in block capital letters and date clearly visible on a clean bottom bar.'
      },
      {
        question: 'What are the required pixel dimensions and file size bounds?',
        answer:
          'UPSC requires the photograph to be 350x350 px (or between 350 to 1000 px square), file size between 20 KB to 300 KB in JPEG format with a clear 200-300 DPI resolution header.'
      },
      {
        question: 'How does the UPSC live photo capture rule affect my uploaded photo?',
        answer:
          'UPSC mandates taking a live webcam/phone photograph during application submission that is cross-verified with your uploaded OTR photo. Your appearance (haircut, spectacles, beard or clean-shaven look) must be consistent across both.'
      },
      {
        question: 'What is the UPSC Triple Signature rule?',
        answer:
          'For signatures on UPSC applications, candidates sign three times vertically (one below another) on a clean white unruled sheet using black ink, and scan all three into a single image file between 20 KB and 300 KB.'
      }
    ],
    relatedTools: [
      { name: 'SSC Photo & Signature Resizer', url: '/ssc-photo-signature', desc: 'Format SSC signature (10–20 KB) and legacy photos' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress graduation marksheets and caste certificates under 100/200 KB' },
      { name: 'PAN Signature Resizer', url: '/signature-resize', desc: 'Format 354×157 px signature with clean white background' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Union Public Service Commission (UPSC). Portal guidelines are compiled from official UPSC examination notices for candidate convenience. Always verify the rules on the active notification.'
  },

  'ssc-photo-signature': {
    toolId: 'ssc-resizer',
    toolName: 'SSC Signature & Photo Resizer (Strict 10–20 KB & 20–50 KB)',
    whatItDoes:
      'Resizes and compresses signatures (and legacy photos) to meet the Staff Selection Commission\'s rigid byte boundaries for CGL, CHSL, MTS, and GD Constable exams. Applies an automated binary search compression loop to lock signatures strictly between 10 KB and 20 KB (140×60 px) and clarifies the new portal live webcam capture rules.',
    targetAudience: [
      'SSC CGL, CHSL, MTS, GD Constable, CPO, and Stenographer applicants',
      'State Staff Selection Board applicants (HSSC, BSSC, WBSSC, etc.)',
      'Cyber café operators and coaching institute computer labs'
    ],
    steps: [
      {
        title: 'Select Mode',
        desc: 'Choose SSC Signature Mode (10–20 KB) for current ssc.gov.in applications, or SSC Photo Mode (20–50 KB) for state/legacy portals.'
      },
      {
        title: 'Upload Signature Scan',
        desc: 'Upload a phone scan of your signature on white paper. The file loads in client RAM with zero server exposure.'
      },
      {
        title: 'Position & Clean Frame',
        desc: 'Fit your signature in the 140 × 60 px box. Apply paper whitening to remove shadows and table yellowness.'
      },
      {
        title: 'Download Strict Byte File',
        desc: 'Save your file. FileWala mathematically constrains file size between 13 KB and 18 KB to avoid boundary rejection.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'Staff Selection Commission (SSC Official Portal)',
        sourceUrl: 'https://ssc.gov.in',
        documentDate: 'CGL / CHSL / MTS Notices 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'SSC CGL, CHSL, MTS, GD Constable, CPO, Steno',
        dimensions: 'Signature: approx 140 × 60 px (4.0 × 2.0 cm); Legacy Photo: 350 × 450 px (3.5 × 4.5 cm)',
        fileSizeRange: 'Signature: strictly 10 KB to 20 KB; Legacy Photo: strictly 20 KB to 50 KB',
        dpi: '200 DPI',
        format: 'JPEG / JPG only',
        specialRules: 'New SSC Portal: Candidate photos captured LIVE via webcam/MySSC app. Signatures uploaded strictly 10–20 KB in cursive handwriting (no block capital letters).',
        fileWalaPreset: 'SSC Signature (140×60 px, strictly 10–20 KB, 200 DPI)'
      }
    ],
    recommendationNotice:
      'On the new SSC portal (ssc.gov.in), pre-scanned photo files are no longer accepted for standard exams; you must use the live camera capture. Signatures, however, must still be prepared and uploaded as a digital file.',
    applicantReminder:
      'Signatures must be in running handwriting. If you write your name in separate block capital letters, your SSC application will be rejected during scrutiny.',
    commonMistakes: [
      {
        title: 'File Size Out of Range',
        mistake: 'Uploading a signature weighing 9.8 KB or 20.2 KB.',
        fix: 'FileWala uses binary search compression to place file size safely at 14–17 KB.'
      },
      {
        title: 'Signing in Capital Letters',
        mistake: 'Writing signature in block letters (e.g., "MOHIT SINGH").',
        fix: 'Sign in your natural cursive handwriting.'
      },
      {
        title: 'Camera Glare during Live Photo',
        mistake: 'Wearing spectacles with glare during webcam capture.',
        fix: 'Remove spectacles during live photo capture on ssc.gov.in.'
      },
      {
        title: 'Miniature Signature in Large Frame',
        mistake: 'Cropping so wide that the signature takes up only 20% of the box.',
        fix: 'Crop closely so signature occupies 80% of the box width.'
      }
    ],
    supportedFormats: 'Inputs: JPEG, PNG, WebP up to 50MB. Output: Baseline JPEG strictly within 10–20 KB byte boundaries.',
    limitations: [
      'Prepares signature files; for the live photo on ssc.gov.in, use your webcam/phone inside the SSC portal.',
      'Cannot remove ruled notebook lines without altering signature strokes.'
    ],
    faqs: [
      {
        question: 'What are the official SSC photo requirements on the new portal?',
        answer:
          'Under the updated portal (ssc.gov.in), candidate photographs are captured LIVE via webcam or the official MySSC mobile application. Stand in front of a plain light wall in good lighting without spectacles or caps.'
      },
      {
        question: 'What are the official SSC signature requirements?',
        answer:
          'SSC signature must be strictly between 10 KB to 20 KB in JPEG format, dimensions approx 140x60 px (4.0 cm x 2.0 cm), signed with black or dark blue ink on clear white paper in running handwriting.'
      },
      {
        question: 'Why does the SSC portal give a "File size out of range" error?',
        answer:
          'The SSC server strictly checks byte bounds. Photos under 20 KB or above 50 KB, and signatures under 10 KB or above 20 KB are instantly rejected. This tool uses iterative binary search to guarantee file sizes stay strictly inside the allowed boundaries.'
      },
      {
        question: 'Can I sign in block or capital letters for SSC?',
        answer:
          'No. Official SSC examination notices explicitly state that signatures in all-capital letters will be treated as invalid and will lead to application rejection.'
      },
      {
        question: 'How do I pass the SSC live photo capture without rejection?',
        answer:
          'Sit facing natural light or a lamp, keep the camera at eye level, remove all spectacles (even prescription glasses to prevent flash glare), look straight at the lens with a neutral expression, and ensure a plain white wall behind you.'
      }
    ],
    relatedTools: [
      { name: 'UPSC Photo Maker', url: '/upsc-photo-maker', desc: 'Format photo with Name and Date of Photo (DOP) for UPSC OTR' },
      { name: 'Gov Document Compressor', url: '/kb-resizer', desc: 'Compress certificates and marksheets under 100/200 KB' },
      { name: 'PAN Signature Resizer', url: '/signature-resize', desc: 'Format 354×157 px signature with clean white canvas' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by the Staff Selection Commission (SSC). Guidelines are aggregated from official examination notifications for candidate reference. Always verify instructions on your active application form.'
  },

  'kb-resizer': {
    toolId: 'gov-compressor',
    toolName: 'Gov Document Compressor (Strict <50KB, <100KB, <200KB & <500KB)',
    whatItDoes:
      'Compresses scanned certificates, marksheets, caste certificates, and identity documents strictly below government portal ceilings (under 50KB, 100KB, 200KB, or 500KB). Features adaptive high-pass text sharpening and background noise elimination so that official seals, roll numbers, signatures, and stamps remain crisp while cutting 80%+ of file weight.',
    targetAudience: [
      'EPFO Unified Portal members uploading passbooks and cancelled cheques (< 100 KB)',
      'State PSC applicants (UPPSC, BPSC, MPPSC, WBPSC) uploading certificates (< 200 KB)',
      'Banking exam candidates (IBPS, SBI PO/Clerk) uploading declaration and marksheets',
      'Citizens submitting driving license and vehicle registration documents on Sarathi/Parivahan'
    ],
    steps: [
      {
        title: 'Select Target Size Preset',
        desc: 'Choose Under 100 KB (for EPFO, passbooks), Under 200 KB (for State PSCs), or custom KB threshold.'
      },
      {
        title: 'Upload Document (PDF or Image)',
        desc: 'Upload marksheet, caste certificate, or ID scan. Files process client-side in browser RAM.'
      },
      {
        title: 'Verify Text Legibility',
        desc: 'Check the live preview to verify that all certificate numbers, seals, and signatures remain sharp and readable.'
      },
      {
        title: 'Download Optimized Document',
        desc: 'Save your compressed file, guaranteed to weigh less than your specified portal ceiling.'
      }
    ],
    officialMatrix: [
      {
        portalName: 'EPFO Unified Member Portal',
        sourceUrl: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
        documentDate: 'Member Portal Guidelines 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'EPF Claims, Passbook & Cancelled Cheque Upload',
        dimensions: 'PDF or JPG/JPEG format',
        fileSizeRange: 'Strictly under 100 KB (some pathways allow up to 500 KB)',
        dpi: '150 to 200 DPI',
        format: 'PDF / JPEG',
        specialRules: 'Account number, IFSC code, and account holder name must be clearly legible on cheque/passbook.',
        fileWalaPreset: 'Under 100 KB Preset (targets 60–90 KB)'
      },
      {
        portalName: 'Uttar Pradesh Public Service Commission (UPPSC)',
        sourceUrl: 'https://uppsc.up.nic.in',
        documentDate: 'Exam Notices 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'Combined State / Upper Subordinate & Engineering Exam',
        dimensions: 'PDF or JPG/JPEG format',
        fileSizeRange: 'Strictly under 200 KB (50–200 KB)',
        dpi: '200 DPI',
        format: 'PDF / JPEG',
        specialRules: 'Caste, domicile, marksheet and degree certificate seals and signatures must be legible.',
        fileWalaPreset: 'Under 200 KB Preset (targets 120–180 KB)'
      },
      {
        portalName: 'Bihar Public Service Commission (BPSC)',
        sourceUrl: 'https://bpsc.bihar.gov.in',
        documentDate: 'Integrated CCE Guidelines 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'BPSC CCE Prelims & Mains Document Upload',
        dimensions: 'PDF format (under 100 KB)',
        fileSizeRange: 'Strictly under 100 KB',
        dpi: '150 to 200 DPI',
        format: 'PDF only',
        specialRules: 'Clear PDF scan of graduation marksheet, caste, disability and domicile certificates.',
        fileWalaPreset: 'Under 100 KB Preset (targets 60–90 KB)'
      },
      {
        portalName: 'Banking Recruitment (IBPS, SBI)',
        sourceUrl: 'https://www.ibps.in',
        documentDate: 'CRP Recruitment Notices 2026',
        accessDate: '2026 Guidelines',
        applicableForms: 'PO, Clerk, SO Online Applications',
        dimensions: 'Declaration: 50–100 KB; Left Thumb: 20–50 KB (or 10–20 KB in clerical)',
        fileSizeRange: 'Strictly within specified byte bounds',
        dpi: '200 DPI',
        format: 'JPG / JPEG only',
        specialRules: 'Left thumb impression on white paper with black/blue ink; declaration in candidate handwriting.',
        fileWalaPreset: 'Custom KB slider targeting exact portal bounds'
      }
    ],
    recommendationNotice:
      'Always zoom in to 100% on your downloaded document to verify that your roll number, certificate number, and issuing authority seal are clearly legible before uploading.',
    applicantReminder:
      'Never compress a document to the point where numbers or names become unreadable. Verification officers will reject illegible certificates regardless of file size compliance.',
    commonMistakes: [
      {
        title: 'Using Generic Lossy Compressors',
        mistake: 'Blurring out fine certificate numbers and government seals.',
        fix: 'FileWala uses adaptive high-pass contrast filtering to keep text black and background clean.'
      },
      {
        title: 'Multi-Page PDF File Size Bloat',
        mistake: 'Compressing a 4-page PDF where one high-res page blows past the limit.',
        fix: 'FileWala distributes the byte budget across all pages evenly.'
      },
      {
        title: 'Uploading Dark Yellow Scanner Output',
        mistake: 'Leaving yellow paper texture that consumes 80% of file weight.',
        fix: 'Background noise is cleaned to pure white, saving byte weight for text clarity.'
      }
    ],
    supportedFormats: 'Inputs: PDF, JPEG, PNG, WebP up to 50MB. Output: Compact PDF or JPEG under specified target KB.',
    limitations: [
      'If the original scanned file is already blurred or smudged, compression cannot invent missing text.',
      'Extremely large multi-page PDFs (over 100 pages) should be compressed page by page.'
    ],
    faqs: [
      {
        question: 'How does FileWala compress documents without making text blurry?',
        answer:
          'Scanned certificates and marksheets usually contain scanner grain and dirty paper backgrounds that waste 80% of file size. FileWala cleans the background to pure white and enhances the contrast of letters and numbers. Because pure white takes almost zero bytes in compression, full quality is dedicated to the text, keeping every letter and digit razor-sharp.'
      },
      {
        question: 'How do I compress my marksheet or Aadhaar proof under 100 KB?',
        answer:
          'Select the "Under 100 KB" preset above, upload your PDF or image, and click "Compress Document". The tool automatically calculates the optimal compression to keep the file strictly between 20 KB and 100 KB.'
      },
      {
        question: 'Is my Aadhaar card or PAN safe to compress here?',
        answer:
          'Yes, 100%. All compression operations run locally inside your web browser using HTML5 Canvas and WebAssembly. No files or personal data are ever uploaded to any server or third party.'
      },
      {
        question: 'Can I compress multi-page PDF documents?',
        answer:
          'Yes. Multi-page PDFs are rendered and optimized page-by-page client-side. The file size budget is evenly balanced across all pages to meet portal size limits.'
      },
      {
        question: 'What are the document size limits for EPFO, State PSC, and IBPS?',
        answer:
          'EPFO member passbooks require files under 100 KB (or under 500 KB on select pathways). State PSCs generally specify 100 KB to 200 KB for caste and marksheet proofs. IBPS requires 50–100 KB for handwritten declarations and 20–50 KB for thumb impressions.'
      }
    ],
    relatedTools: [
      { name: 'PAN Photo Resizer', url: '/pan-photo-resize', desc: 'Format official 197×276 px (NSDL) or 213×213 px (UTIITSL) photo' },
      { name: 'PAN Signature Resizer', url: '/signature-resize', desc: 'Format 354×157 px signature under 50 KB' },
      { name: 'UPSC Photo Maker', url: '/upsc-photo-maker', desc: 'Format photo with Name and Date of Photo (DOP) for UPSC OTR' },
      { name: 'SSC Photo & Signature Resizer', url: '/ssc-photo-signature', desc: 'Format SSC signature (10–20 KB) and legacy photos' },
      { name: 'Compress Image', url: '/compress-image', desc: 'Compress general PNG, JPEG, and WebP images' },
      { name: 'All Government Tools', url: '/document-tools', desc: 'Browse the complete Indian government document resizer suite' }
    ],
    disclaimer:
      'FileWala is an independent open utility and is not affiliated with, endorsed by, or operated by EPFO, IBPS, any State Public Service Commission, or any government portal. Specifications are compiled from publicly available application guidelines for candidate convenience. Always check instructions on your active form.'
  }
};
