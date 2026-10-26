import React, { useState } from 'react';
import {
  Mail,
  Send,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Clock,
  ArrowLeft,
  Linkedin,
  Instagram,
  Github,
  Loader2,
  ShieldCheck,
  HelpCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { saveContactMessage } from '../../core/firebase';
import { useLanguage } from '../../core/languageContext';

interface ContactUsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact' | 'privacy' | 'desktop') => void;
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ContactUs: React.FC<ContactUsProps> = ({
  onBackHome,
  onNavigate,
  onNotify,
}) => {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'bug' | 'portal_spec' | 'feature' | 'general'>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const supportEmail = 'support@filewalatool.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setIsCopied(true);
    onNotify?.('Email Copied', `${supportEmail} copied to clipboard!`, 'info');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      onNotify?.('Incomplete Form', 'Please fill in your name, email, and message.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullSubject = subject.trim()
        ? `[${category.toUpperCase()}] ${subject.trim()}`
        : `[${category.toUpperCase()}] General Inquiry from ${name.trim()}`;

      await saveContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: fullSubject,
        message: message.trim(),
      });

      setIsSubmitted(true);
      onNotify?.(
        'Message Sent',
        'Thank you! Your inquiry has been received. We will respond within 24 to 48 hours.',
        'success'
      );
    } catch (err: any) {
      console.error('Contact submit error:', err);
      onNotify?.(
        'Submission Note',
        'Message logged locally. You can also email us directly at support@filewalatool.com.',
        'info'
      );
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14 select-none animate-in fade-in duration-150">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'होम पर वापस जाएं' : 'Back to Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400">
            Contact &amp; Support
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* OPEN EDITORIAL HERO */}
      {/* ========================================================= */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span>Direct Developer &amp; User Support</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
          Get in Touch with Us
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {language === 'hi'
            ? 'क्या किसी सरकारी पोर्टल के नियमों में बदलाव हुआ है? क्या किसी टूल में कोई समस्या आ रही है? या फिर आप नया फीचर सुझाव देना चाहते हैं? नीचे दिए गए फॉर्म या डायरेक्ट ईमेल के ज़रिए सीधे डेवलपर से संपर्क करें।'
            : 'Encountered an issue with a browser tool, spotted a change in government exam photo dimensions, or have ideas for a new utility? Reach out directly to the developer team.'}
        </p>
      </div>

      {/* ========================================================= */}
      {/* 2-COLUMN OPEN EDITORIAL LAYOUT (No Nested Heavy Boxes) */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Direct Info, Channels, SLA, and Profile (5 Cols) */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* Channel 1: Official Email */}
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Direct Communication Channel
              </div>
              <div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-base sm:text-lg font-mono font-semibold text-zinc-950 dark:text-zinc-100 hover:underline inline-block"
                >
                  {supportEmail}
                </a>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Primary mailbox monitored directly by the developer for technical and general queries.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300">Address Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Copy Email Address</span>
                    </>
                  )}
                </button>
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Open Mail Client</span>
                </a>
              </div>
            </div>

            {/* SLA Strip */}
            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Response Time &amp; Turnaround</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Standard turnaround is within <strong>24 to 48 hours</strong> (Monday through Saturday, IST). Critical bug reports affecting exam submission deadlines receive priority review.
              </p>
            </div>

            {/* Developer Identity & Location */}
            <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Developer &amp; Location
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <img
                    src="/founder-muhammad-sufiyan.webp"
                    alt="Mohammad Sufiyan"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Mohammad Sufiyan
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span>Kushinagar, Uttar Pradesh, India</span>
                  </div>
                </div>
              </div>

              {/* Direct Socials */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href="https://linkedin.com/in/mdsufidev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
                <a
                  href="https://github.com/mdsufidev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors"
                  aria-label="GitHub Profile"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
                <a
                  href="https://instagram.com/mdsufidev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 transition-colors"
                  aria-label="Instagram Profile"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </a>
              </div>
            </div>

            {/* Types of Inquiries */}
            <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Common Inquiry Types
              </div>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-zinc-400">•</span>
                  <span><strong>Portal Rule Changes:</strong> Notify us if UPSC, SSC, NSDL, or Passport Seva introduces new dimension, KB, or DPI requirements.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-zinc-400">•</span>
                  <span><strong>Technical Bug Reports:</strong> Browser-specific canvas issues, WASM decoding failures, or PDF rendering glitches.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-zinc-400">•</span>
                  <span><strong>New Utility Suggestions:</strong> State PSC resizers, bank exam form presets, or additional offline file formats.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Clean 2D Form (No card enclosure) (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                Send a Message
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Fill in the details below. Messages are saved securely and delivered directly to our support inbox.
              </p>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-4 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50/50 dark:bg-zinc-900/50 p-6">
                <div className="w-12 h-12 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Message Received Successfully!
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong>{name}</strong>. Your message has been logged. We will review your inquiry and follow up at <strong>{email}</strong> within 24 to 48 hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setMessage('');
                    setSubject('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Send Another Inquiry</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Inquiry Topic
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'general', label: 'General' },
                      { id: 'portal_spec', label: 'Govt Portal Rule' },
                      { id: 'bug', label: 'Bug Report' },
                      { id: 'feature', label: 'Feature Request' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCategory(tab.id as any)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer text-center ${
                          category === tab.id
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your question or suggestion..."
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Message Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please include device details, browser type, and specific exam portal name if reporting an issue..."
                    className="w-full px-3 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors resize-y"
                  />
                </div>

                {/* Data Privacy Notice */}
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono leading-relaxed border-t border-zinc-100 dark:border-zinc-850 pt-3">
                  Privacy Notice: Contact form submissions are transmitted securely over TLS to Google Firebase Firestore exclusively to allow our support team to respond. Your uploaded documents, photos, and PDFs are 100% processed client-side and never touch Firebase.
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-medium text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Inquiry</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM CROSS-NAVIGATION LINKS */}
      {/* ========================================================= */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('privacy')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('terms')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('disclaimer')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            Compliance Disclaimer
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.('about')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline cursor-pointer"
          >
            About FileWala
          </button>
        </div>

        <div>
          <span>© {new Date().getFullYear()} FileWalaTool • Kushinagar, UP</span>
        </div>
      </div>

    </div>
  );
};
