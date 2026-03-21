"use client";

import { useAdminI18n } from "@/lib/admin-i18n";

function Section({ id, titleKey, children }: { id: string; titleKey: string; children: React.ReactNode }) {
  const { t } = useAdminI18n();
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
        {t(titleKey)}
      </h2>
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
        {children}
      </div>
    </section>
  );
}

function P({ textKey }: { textKey: string }) {
  const { t } = useAdminI18n();
  return <p className="text-gray-300 text-sm leading-relaxed">{t(textKey)}</p>;
}

function SubTitle({ textKey }: { textKey: string }) {
  const { t } = useAdminI18n();
  return <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mt-4 mb-2">{t(textKey)}</h3>;
}

function BulletList({ items }: { items: string[] }) {
  const { t } = useAdminI18n();
  return (
    <ul className="space-y-2 ml-1">
      {items.map((key, i) => (
        <li key={i} className="flex gap-3 text-sm text-gray-300">
          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  const { t } = useAdminI18n();
  return (
    <ol className="space-y-2 ml-1">
      {items.map((key, i) => (
        <li key={i} className="flex gap-3 text-sm text-gray-300">
          <span className="text-indigo-400 font-mono shrink-0">{i + 1}.</span>
          <span>{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

function FaqItem({ qKey, aKey }: { qKey: string; aKey: string }) {
  const { t } = useAdminI18n();
  return (
    <div className="border border-gray-700/50 rounded-xl p-4">
      <p className="text-sm font-medium text-white mb-2">{t(qKey)}</p>
      <p className="text-sm text-gray-400">{t(aKey)}</p>
    </div>
  );
}

export default function GuidePage() {
  const { t } = useAdminI18n();

  const tocItems = [
    { id: "dashboard", key: "guide.dashboard.title" },
    { id: "users", key: "guide.users.title" },
    { id: "reports", key: "guide.reports.title" },
    { id: "analytics", key: "guide.analytics.title" },
    { id: "settings", key: "guide.settings.title" },
    { id: "payments", key: "guide.payments.title" },
    { id: "faq", key: "guide.faq.title" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("guide.title")}</h1>
        <p className="text-gray-400 text-sm mt-1">{t("guide.subtitle")}</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("guide.toc")}</h2>
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tocItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800/50"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {t(item.key)}
            </a>
          ))}
        </nav>
      </div>

      {/* 1. Dashboard */}
      <Section id="dashboard" titleKey="guide.dashboard.title">
        <P textKey="guide.dashboard.desc" />
        <SubTitle textKey="guide.dashboard.metrics" />
        <BulletList items={[
          "guide.dashboard.totalUsers",
          "guide.dashboard.activeNow",
          "guide.dashboard.chatsToday",
          "guide.dashboard.pendingReports",
        ]} />
        <SubTitle textKey="guide.dashboard.health" />
        <P textKey="guide.dashboard.healthDesc" />
        <SubTitle textKey="guide.dashboard.activity" />
        <P textKey="guide.dashboard.activityDesc" />
      </Section>

      {/* 2. Users */}
      <Section id="users" titleKey="guide.users.title">
        <P textKey="guide.users.desc" />
        <SubTitle textKey="guide.users.search" />
        <P textKey="guide.users.searchDesc" />
        <SubTitle textKey="guide.users.actions" />
        <BulletList items={[
          "guide.users.warn",
          "guide.users.ban",
          "guide.users.unban",
        ]} />
        <P textKey="guide.users.details" />
      </Section>

      {/* 3. Reports */}
      <Section id="reports" titleKey="guide.reports.title">
        <P textKey="guide.reports.desc" />
        <SubTitle textKey="guide.reports.workflow" />
        <NumberedList items={[
          "guide.reports.workflowStep1",
          "guide.reports.workflowStep2",
          "guide.reports.workflowStep3",
          "guide.reports.workflowStep4",
        ]} />
        <SubTitle textKey="guide.reports.severity" />
        <BulletList items={[
          "guide.reports.severityLow",
          "guide.reports.severityMedium",
          "guide.reports.severityHigh",
          "guide.reports.severityCritical",
        ]} />
        <SubTitle textKey="guide.reports.auto" />
        <P textKey="guide.reports.autoDesc" />
        <SubTitle textKey="guide.reports.reply" />
        <P textKey="guide.reports.replyDesc" />
      </Section>

      {/* 4. Analytics */}
      <Section id="analytics" titleKey="guide.analytics.title">
        <P textKey="guide.analytics.desc" />
        <SubTitle textKey="guide.analytics.charts" />
        <BulletList items={[
          "guide.analytics.chartsUsers",
          "guide.analytics.chartsChats",
          "guide.analytics.chartsReports",
          "guide.analytics.chartsRegion",
          "guide.analytics.chartsReasons",
        ]} />
      </Section>

      {/* 5. Settings */}
      <Section id="settings" titleKey="guide.settings.title">
        <P textKey="guide.settings.desc" />
        <SubTitle textKey="guide.settings.automod" />
        <P textKey="guide.settings.automodDesc" />
        <SubTitle textKey="guide.settings.chat" />
        <P textKey="guide.settings.chatDesc" />
        <SubTitle textKey="guide.settings.security" />
        <P textKey="guide.settings.securityDesc" />
        <SubTitle textKey="guide.settings.features" />
        <P textKey="guide.settings.featuresDesc" />
        <SubTitle textKey="guide.settings.words" />
        <P textKey="guide.settings.wordsDesc" />
        <SubTitle textKey="guide.settings.regions" />
        <P textKey="guide.settings.regionsDesc" />
      </Section>

      {/* 6. Payments */}
      <Section id="payments" titleKey="guide.payments.title">
        <P textKey="guide.payments.desc" />
        <SubTitle textKey="guide.payments.how" />
        <NumberedList items={[
          "guide.payments.howStep1",
          "guide.payments.howStep2",
          "guide.payments.howStep3",
          "guide.payments.howStep4",
          "guide.payments.howStep5",
        ]} />
        <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-xl p-4 mt-2">
          <p className="text-sm text-indigo-300">{t("guide.payments.wallet")}</p>
        </div>
        <SubTitle textKey="guide.payments.troubleshoot" />
        <P textKey="guide.payments.troubleshootDesc" />
      </Section>

      {/* 7. FAQ */}
      <Section id="faq" titleKey="guide.faq.title">
        <div className="space-y-3">
          <FaqItem qKey="guide.faq.q1" aKey="guide.faq.a1" />
          <FaqItem qKey="guide.faq.q2" aKey="guide.faq.a2" />
          <FaqItem qKey="guide.faq.q3" aKey="guide.faq.a3" />
          <FaqItem qKey="guide.faq.q4" aKey="guide.faq.a4" />
          <FaqItem qKey="guide.faq.q5" aKey="guide.faq.a5" />
          <FaqItem qKey="guide.faq.q6" aKey="guide.faq.a6" />
        </div>
      </Section>
    </div>
  );
}
