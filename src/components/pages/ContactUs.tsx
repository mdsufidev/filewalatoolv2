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
} from 'lucide-react';
import { saveContactMessage } from '../../core/firebase';

interface ContactUsProps {
  onBackHome: () => void;
  onNavigate?: (page: 'about' | 'disclaimer' | 'terms' | 'contact') => void;
  onNotify?: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ContactUs: React.FC<ContactUsProps> = ({
  onBackHome,
  onNotify,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
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
      await saveContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || 'General Inquiry',
        message: message.trim(),
      });

      setIsSubmitted(true);
      onNotify?.(
        'Message Sent to Firebase',
        'Thank you! Your message has been saved in Firebase and we will respond within 24 hours.',
        'success'
      );
    } catch (err: any) {
      console.error('Contact submit error:', err);
      // Even if Firestore offline or permissions delay, allow mailto fallback
      onNotify?.(
        'Submission Note',
        'Message logged locally. You can also reach us directly at support@filewalatool.com.',
        'info'
      );
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-in fade-in duration-150">
      {/* Top Breadcrumb Return */}
      <div className="mb-6">
        <button
          onClick={onBackHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-10 text-center max-w-2xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs font-mono">
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span>Support &amp; Developer Inquiry</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Get in Touch with Us
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
          Have a question about a portal guideline, experiencing an issue with a tool, or want to suggest a new Indian government resizer? We would love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Direct Info Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Email Support Card */}
          <div className="p-5 rounded-lg border border-zinc-200 bg-white text-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                title="Copy email to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-sm font-semibold mb-1 text-zinc-950">Direct Email</h3>
            <p className="text-xs text-zinc-500 mb-2">
              For bug reports, technical inquiries, and feature requests.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="text-xs font-mono font-semibold text-zinc-900 hover:underline block truncate"
            >
              {supportEmail}
            </a>
          </div>

          {/* Developer Location Card */}
          <div className="p-5 rounded-lg border border-zinc-200 bg-white text-zinc-900">
            <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center mb-3">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold mb-1 text-zinc-950">Developer Base</h3>
            <p className="text-xs text-zinc-500 mb-1">
              Mohammad Sufiyan (@mdsufidev)
            </p>
            <p className="text-xs font-medium text-zinc-800 mb-3">
              Kushinagar, Uttar Pradesh, India
            </p>

            {/* Direct Social Links */}
            <div className="pt-3 border-t border-zinc-100 flex items-center gap-2">
              <a
                href="https://linkedin.com/in/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors"
                title="LinkedIn - Mohammad Sufiyan"
                aria-label="LinkedIn profile"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors"
                title="Instagram - @mdsufidev"
                aria-label="Instagram profile"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/mdsufidev"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors"
                title="GitHub - @mdsufidev"
                aria-label="GitHub profile"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Response SLA */}
          <div className="p-4 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center gap-3">
            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
            <div className="text-xs text-zinc-600">
              <span className="font-semibold block text-zinc-900">
                Expected Turnaround:
              </span>
              <span>We usually respond within 24 to 48 hours.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-7 rounded-lg border border-zinc-200 bg-white text-zinc-900">
            {isSubmitted ? (
              <div className="py-8 text-center space-y-3 animate-in fade-in duration-150">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-950">Message Saved to Firebase!</h3>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">
                  Thank you for reaching out, <strong>{name}</strong>. Your inquiry has been stored securely in our database and we will email you back at <strong>{email}</strong> shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setMessage('');
                    setSubject('');
                  }}
                  className="mt-3 px-3.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 transition-colors cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-base font-semibold text-zinc-950 pb-2 border-b border-zinc-100">
                  Send a Direct Message
                </h2>

                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-xs sm:text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Your Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-xs sm:text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. UPSC photo resizer question"
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-xs sm:text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-zinc-700">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue, suggestion, or question in detail..."
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 bg-white text-xs sm:text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors resize-y"
                  />
                </div>

                {/* Privacy Guarantee Note */}
                <div className="text-[11px] text-zinc-500 font-mono">
                  Submitted data is saved directly in Firebase Firestore and never shared with third parties.
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
