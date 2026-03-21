"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-6 inline-flex items-center gap-1"
          >
            ← {t("backToHome")}
          </Link>

          <h1 className="text-3xl font-bold text-white mt-4 mb-2">{t("privacyTitle")}</h1>
          <p className="text-sm text-gray-500 mb-8">{t("privacyLastUpdated")}</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
              <p>We collect the following information when you use Synapse:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Account data:</strong> name, email address, hashed password, selected region</li>
                <li><strong>Usage data:</strong> chat sessions, ratings, report history, Trust Score</li>
                <li><strong>Payment data:</strong> USDT transaction IDs, wallet addresses (we do not store private keys)</li>
                <li><strong>Technical data:</strong> IP address, browser type, device info (for WebRTC connections)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">2. How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>To provide and improve the Service</li>
                <li>To match you with relevant partners based on interests and region</li>
                <li>To calculate and maintain your Trust Score</li>
                <li>To process payments and manage subscriptions</li>
                <li>To enforce community guidelines and moderate content</li>
                <li>To send important service notifications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">3. Video & Audio</h2>
              <p>Synapse uses peer-to-peer WebRTC technology for video and audio calls. <strong>Video and audio streams are transmitted directly between users and are NOT recorded, stored, or monitored by our servers.</strong> Our servers only handle signaling (connection setup) — the actual media never passes through our infrastructure unless a TURN relay is required for connectivity.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">4. Data Storage & Security</h2>
              <p>Your data is stored in encrypted PostgreSQL databases. Passwords are hashed using bcrypt with salt. All connections use TLS/SSL encryption. We implement rate limiting, JWT authentication, and other security measures to protect your data.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">5. Data Sharing</h2>
              <p>We do NOT sell, rent, or share your personal data with third parties, except:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>When required by law or legal process</li>
                <li>To protect the safety of users (e.g., reporting illegal activity to authorities)</li>
                <li>With service providers essential to running the platform (hosting, CDN)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">6. Cookies & Local Storage</h2>
              <p>We use essential cookies for authentication (session tokens) and localStorage for user preferences (language, theme). We do not use tracking cookies or third-party analytics.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Object to processing of your data</li>
              </ul>
              <p>To exercise these rights, contact us through the admin panel or support channels.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">8. Data Retention</h2>
              <p>Account data is retained as long as your account is active. Chat session metadata is retained for 90 days for moderation purposes. Report data is retained for 1 year. You may request full deletion at any time.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">9. Children&apos;s Privacy</h2>
              <p>Synapse is intended for users aged 18 and older. We do not knowingly collect data from individuals under 18. If we discover that a user is under 18, their account will be terminated immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">10. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. We will notify users of material changes through the platform. Continued use after changes constitutes acceptance.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
