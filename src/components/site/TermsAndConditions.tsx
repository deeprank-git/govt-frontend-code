const SECTIONS = [
  {
    title: "Acceptance of Terms",
    content: (
      <p>
        By accessing or using Testopy ("the Platform"), you confirm that you have read, understood, and
        agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please
        discontinue use of the Platform immediately. These Terms apply to all users including students,
        visitors, and administrators.
      </p>
    ),
  },
  {
    title: "Eligibility",
    content: (
      <>
        <p className="mb-3">To use Testopy, you must:</p>
        <ul className="space-y-2">
          <li>Be at least 18 years of age.</li>
          <li>Provide accurate and complete registration information.</li>
          <li>Not have been previously suspended or removed from the Platform.</li>
        </ul>
        <p className="mt-3">
          By creating an account, you represent that you meet these eligibility requirements.
        </p>
      </>
    ),
  },
  {
    title: "Account Responsibilities",
    content: (
      <>
        <p className="mb-3">When you create an account on Testopy, you are responsible for:</p>
        <ul className="space-y-2">
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>All activity that occurs under your account.</li>
          <li>Notifying us immediately at <span className="font-medium text-foreground">support@testopy.in</span> if you suspect unauthorised access.</li>
          <li>Keeping your profile information accurate and up to date.</li>
        </ul>
        <p className="mt-3">
          Testopy is not liable for any loss or damage arising from your failure to protect your account credentials.
        </p>
      </>
    ),
  },
  {
    title: "Use of the Platform",
    content: (
      <>
        <p className="mb-3">You agree to use Testopy only for lawful purposes. You must not:</p>
        <ul className="space-y-2">
          <li>Copy, reproduce, or distribute any content from the Platform without prior written permission.</li>
          <li>Use automated scripts, bots, or scrapers to access the Platform.</li>
          <li>Attempt to gain unauthorised access to any part of the Platform or its infrastructure.</li>
          <li>Upload, post, or share content that is unlawful, offensive, defamatory, or infringes any third-party rights.</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
          <li>Interfere with or disrupt the integrity or performance of the Platform.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Intellectual Property",
    content: (
      <>
        <p className="mb-3">
          All content on Testopy — including but not limited to mock test questions, previous year paper
          compilations, current affairs articles, explanations, graphics, and software — is owned by or
          licensed to Testopy and is protected by applicable intellectual property laws.
        </p>
        <p>
          You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform
          for personal, non-commercial educational purposes only. This licence does not permit redistribution,
          resale, or creation of derivative works based on our content.
        </p>
      </>
    ),
  },
  {
    title: "Subscriptions and Payments",
    content: (
      <>
        <ul className="space-y-2">
          <li>Certain features of Testopy may require a paid subscription.</li>
          <li>All fees are stated in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Payments are processed securely by our third-party payment partner. We do not store your card details.</li>
          <li>Subscriptions automatically renew unless cancelled before the renewal date.</li>
          <li>Refunds are subject to our refund policy communicated at the time of purchase.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Disclaimer of Warranties",
    content: (
      <>
        <p className="mb-3">
          Testopy is provided on an "as is" and "as available" basis without warranties of any kind, either
          express or implied. We do not warrant that:
        </p>
        <ul className="space-y-2">
          <li>The Platform will be uninterrupted, error-free, or free of viruses or other harmful components.</li>
          <li>The content is complete, accurate, or up to date at all times.</li>
          <li>Use of the Platform will guarantee success in any examination.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Limitation of Liability",
    content: (
      <p>
        To the fullest extent permitted by law, Testopy and its directors, employees, and affiliates shall
        not be liable for any indirect, incidental, special, consequential, or punitive damages — including
        loss of data, revenue, or exam performance — arising out of or in connection with your use of the
        Platform, even if we have been advised of the possibility of such damages. Our total liability for
        any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.
      </p>
    ),
  },
  {
    title: "Third-Party Links and Services",
    content: (
      <p>
        The Platform may contain links to third-party websites, exam bodies, or government portals. These
        links are provided for convenience only. Testopy does not endorse, control, or assume responsibility
        for the content or practices of any third-party sites. Your interactions with third-party services
        are governed by their respective terms and privacy policies.
      </p>
    ),
  },
  {
    title: "Termination",
    content: (
      <>
        <p className="mb-3">
          We reserve the right to suspend or terminate your account at any time, with or without notice,
          if we believe you have violated these Terms or engaged in conduct that is harmful to other users,
          the Platform, or third parties.
        </p>
        <p>
          You may delete your account at any time by contacting us at{" "}
          <span className="font-medium text-foreground">support@testopy.in</span>. Upon termination, your
          right to use the Platform ceases immediately.
        </p>
      </>
    ),
  },
  {
    title: "Governing Law",
    content: (
      <p>
        These Terms are governed by and construed in accordance with the laws of India. Any disputes
        arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction
        of the courts located in India.
      </p>
    ),
  },
  {
    title: "Changes to These Terms",
    content: (
      <p>
        We may revise these Terms and Conditions from time to time. When we do, we will update the
        "Last updated" date at the top of this page and, for material changes, notify you via email or
        a prominent notice on the Platform. Your continued use of Testopy after any changes take effect
        constitutes your acceptance of the revised Terms.
      </p>
    ),
  },
];

export function TermsAndConditions() {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3">
          Legal Document
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 1, 2026</p>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          Please read these Terms and Conditions carefully before using Testopy. They govern your access
          to and use of our platform and constitute a legally binding agreement between you and Testopy.
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
        <h2 className="text-base font-semibold text-foreground mb-1">13. Contact Us</h2>
        <p className="text-[14.5px] text-muted-foreground mb-3">
          If you have any questions about these Terms and Conditions, please contact us:
        </p>
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
