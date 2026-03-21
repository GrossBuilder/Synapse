"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

export default function TermsPage() {
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

          <h1 className="text-3xl font-bold text-white mt-4 mb-2">{t("termsTitle")}</h1>
          <p className="text-sm text-gray-500 mb-8">{t("termsLastUpdated")}</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
              <p>By accessing or using Synapse (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">2. Eligibility</h2>
              <p>You must be at least <strong>18 years of age</strong> to use Synapse. By creating an account, you represent and warrant that you are at least 18 years old. Users under 18 are strictly prohibited from using the Service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">3. Account Responsibility</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">4. Prohibited Conduct</h2>
              <p>When using Synapse, you agree NOT to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Share sexually explicit, violent, or illegal content</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Impersonate another person or entity</li>
                <li>Use the Service if you are under 18 years old</li>
                <li>Attempt to circumvent safety or moderation systems</li>
                <li>Distribute malware, spam, or phishing content</li>
                <li>Record or capture other users&apos; video/audio without consent</li>
                <li>Use the Service for any illegal purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">5. Content Moderation</h2>
              <p>Synapse employs automated and manual moderation systems to enforce community guidelines. We reserve the right to warn, suspend, or permanently ban any user who violates these terms without prior notice.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">6. Trust Score & Shadow Pools</h2>
              <p>Synapse uses a reputation system (Trust Score) that affects your matching experience. Users with consistently positive behavior are rewarded with better matching. Users with violations may be placed in restricted pools.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">7. Payments & Subscriptions</h2>
              <p>Paid features (Synapse+, boosts) are processed via USDT TRC-20 cryptocurrency. All payments are final and non-refundable unless required by applicable law. Subscriptions auto-expire at the end of the billing period.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">8. Disclaimer of Warranties</h2>
              <p>The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted service, security from all threats, or the behavior of other users.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">9. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Synapse shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">10. Changes to Terms</h2>
              <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of significant changes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">11. Contact</h2>
              <p>For questions about these Terms, contact us through the platform&apos;s support channels or admin panel.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
