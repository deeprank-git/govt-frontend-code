const SECTIONS = [
  {
    title: "Information We Collect",
    content: (
      <>
        <h3 className="font-semibold text-foreground mb-2 mt-4">Information You Provide</h3>
        <ul className="space-y-2">
          <li><span className="font-medium text-foreground">Account details:</span> Name, email address, and password when you register.</li>
          <li><span className="font-medium text-foreground">Profile information:</span> Optional details such as phone number, preferred exam category, and state of residence.</li>
          <li><span className="font-medium text-foreground">Payment information:</span> If you purchase a premium plan, billing details are processed by our payment partner. We do not store card numbers.</li>
        </ul>
        <h3 className="font-semibold text-foreground mb-2 mt-5">Information Collected Automatically</h3>
        <ul className="space-y-2">
          <li><span className="font-medium text-foreground">Usage data:</span> Pages visited, tests attempted, questions answered, time spent, and scores.</li>
          <li><span className="font-medium text-foreground">Device and log data:</span> IP address, browser type, operating system, referring URLs, and access timestamps.</li>
          <li><span className="font-medium text-foreground">Cookies and local storage:</span> We use browser storage to keep you logged in and remember preferences. See Section 5 for details.</li>
        </ul>
      </>
    ),
  },
  {
    title: "How We Use Your Information",
    content: (
      <ul className="space-y-2">
        <li>To create and manage your account and authenticate you securely.</li>
        <li>To provide, operate, and improve our mock tests, question banks, and analytics features.</li>
        <li>To personalise your study experience and recommend relevant exams or content.</li>
        <li>To send transactional emails such as account verification, password reset, and test results.</li>
        <li>To send promotional communications about new features or exams — you may opt out at any time.</li>
        <li>To monitor platform security, detect fraud, and enforce our Terms of Service.</li>
        <li>To comply with legal obligations.</li>
      </ul>
    ),
  },
  {
    title: "Sharing of Information",
    content: (
      <>
        <p className="mb-3">We do not sell your personal data. We share information only in these limited circumstances:</p>
        <ul className="space-y-2">
          <li><span className="font-medium text-foreground">Service providers:</span> Third-party vendors (cloud hosting, payment processors, email delivery, analytics) who process data on our behalf under data-processing agreements.</li>
          <li><span className="font-medium text-foreground">Legal requirements:</span> When required by law, court order, or government authority.</li>
          <li><span className="font-medium text-foreground">Business transfers:</span> In the event of a merger, acquisition, or asset sale, your data may be transferred. We will notify you before it becomes subject to a different privacy policy.</li>
          <li><span className="font-medium text-foreground">With your consent:</span> Any other sharing will only occur with your explicit consent.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Data Retention",
    content: (
      <>
        <p className="mb-3">We retain your account data for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it for legal or audit purposes.</p>
        <p>Aggregated, anonymised usage statistics (e.g., question difficulty metrics) may be retained indefinitely as they cannot identify you.</p>
      </>
    ),
  },
  {
    title: "Cookies and Tracking",
    content: (
      <>
        <p className="mb-3">We use the following types of browser storage:</p>
        <ul className="space-y-2">
          <li><span className="font-medium text-foreground">Essential (localStorage):</span> Authentication tokens and session state required for the platform to function. These cannot be disabled without breaking core features.</li>
          <li><span className="font-medium text-foreground">Functional cookies:</span> Remembering your UI preferences such as language and theme.</li>
          <li><span className="font-medium text-foreground">Analytics cookies:</span> Anonymous usage metrics to help us understand how the platform is used. You may opt out via your browser settings or by contacting us.</li>
        </ul>
        <p className="mt-3">We do not use advertising or cross-site tracking cookies.</p>
      </>
    ),
  },
  {
    title: "Data Security",
    content: (
      <>
        <p className="mb-3">We implement industry-standard security measures including:</p>
        <ul className="space-y-2">
          <li>HTTPS encryption for all data in transit.</li>
          <li>Hashed and salted password storage — passwords are never stored in plain text.</li>
          <li>Access controls ensuring staff can only access data necessary for their role.</li>
          <li>Regular security reviews of our infrastructure.</li>
        </ul>
        <p className="mt-3">No method of transmission over the internet is 100% secure. While we strive to protect your personal data, we cannot guarantee absolute security.</p>
      </>
    ),
  },
  {
    title: "Your Rights",
    content: (
      <>
        <p className="mb-3">Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
        <ul className="space-y-2">
          <li><span className="font-medium text-foreground">Access:</span> Request a copy of the personal data we hold about you.</li>
          <li><span className="font-medium text-foreground">Correction:</span> Ask us to correct inaccurate or incomplete data.</li>
          <li><span className="font-medium text-foreground">Deletion:</span> Request deletion of your account and associated personal data.</li>
          <li><span className="font-medium text-foreground">Portability:</span> Receive your data in a structured, machine-readable format.</li>
          <li><span className="font-medium text-foreground">Objection:</span> Object to processing of your data for marketing purposes.</li>
        </ul>
        <p className="mt-3">To exercise any of these rights, email us at <span className="font-medium text-foreground">support@testopy.in</span>. We will respond within 30 days.</p>
      </>
    ),
  },
  {
    title: "Children's Privacy",
    content: (
      <p>Testopy is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</p>
    ),
  },
  {
    title: "Third-Party Links",
    content: (
      <p>Our platform may contain links to third-party websites such as official exam bodies and government portals. We are not responsible for the privacy practices of those sites and encourage you to review their policies.</p>
    ),
  },
  {
    title: "Changes to This Policy",
    content: (
      <p>We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top and, for material changes, notify you by email or a prominent notice on the platform. Your continued use of Testopy after the effective date constitutes acceptance of the updated policy.</p>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
          Legal Document
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 1, 2026</p>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          Welcome to Testopy. We operate a government exam preparation platform offering mock tests,
          previous year papers, current affairs, and exam analytics. This policy explains what information
          we collect, how we use it, and your rights. By using Testopy, you agree to the practices
          described below.
        </p>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {SECTIONS.map((section, i) => (
          <div key={i} className="py-6 flex gap-4 sm:gap-6">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground mb-3">{section.title}</h2>
              <div className="text-[14.5px] leading-7 text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
                {section.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contact callout */}
      <div className="mt-2 rounded-xl bg-muted/60 border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-1">11. Contact Us</h2>
        <p className="text-[14.5px] text-muted-foreground mb-3">If you have any questions or requests regarding this Privacy Policy, reach out to us:</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:support@testopy.in"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            support@testopy.in
          </a>
          <span className="hidden sm:inline text-muted-foreground">·</span>
        </div>
      </div>
    </div>
  );
}
