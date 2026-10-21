import type { Metadata } from "next";
import Link from "next/link";
import PublicPageFrame from "@/components/PublicPageFrame";

export const metadata: Metadata = {
  title: "Privacy Policy | FLOMIRA",
  description:
    "Privacy Policy for FLOMIRA website and mobile applications, including Google Drive backup integration and user data protection.",
};

export default function PrivacyPage() {
  const lastUpdated = "October 21, 2026";

  return (
    <PublicPageFrame>
      <div className="shop-page">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-4">Trust, transparency, and data care</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">
            FLOMIRA is committed to safeguarding your privacy across our web
            storefront and mobile applications. This policy details how we
            collect, use, and protect your information.
          </p>
          <p className="mt-4 text-sm text-[#cba0a5]">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="max-w-4xl space-y-8 text-base leading-relaxed">
          {/* Section 1: Introduction */}
          <section className="surface p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">1. Overview & Scope</h2>
            <p className="muted mt-3">
              This Privacy Policy applies to the <strong>FLOMIRA</strong> web
              platform (<a href="https://flomira.onrender.com" className="underline text-white">flomira.onrender.com</a>)
              and the <strong>FLOMIRA</strong> mobile bakery management
              application (<code className="text-xs bg-black/30 px-1.5 py-0.5 rounded">com.example.demoflomira</code>).
              By using our services, you consent to the practices described in
              this policy.
            </p>
          </section>

          {/* Section 2: Google Drive API & User Data Policy (CRITICAL FOR GOOGLE AUDIT) */}
          <section className="surface border border-rose-500/20 p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <h2 className="text-2xl font-semibold text-white">
                2. Google API Services & Google Drive User Data
              </h2>
            </div>
            <p className="muted mt-3">
              The FLOMIRA mobile application integrates with Google Drive via
              Google Sign-In to provide backup and restore capabilities for
              bakery store administrators. We adhere to the highest privacy and
              security standards regarding Google API data.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-black/20 p-4">
                <h3 className="font-semibold text-white">
                  A. Requested Scopes
                </h3>
                <p className="muted mt-1 text-sm">
                  FLOMIRA requests the following specific Google OAuth scope:
                  <br />
                  <code className="text-xs bg-black/40 px-2 py-1 rounded text-rose-300 block mt-2">
                    https://www.googleapis.com/auth/drive.file
                  </code>
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <h3 className="font-semibold text-white">
                  B. How Google Drive Data is Used
                </h3>
                <ul className="muted mt-2 list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong>File-Specific Isolation:</strong> The scope requested (
                    <code>drive.file</code>) only grants access to files and
                    folders created directly by FLOMIRA. FLOMIRA cannot read,
                    modify, or access any other files, folders, or personal documents
                    in your Google Drive.
                  </li>
                  <li>
                    <strong>Dedicated Backup Storage:</strong> FLOMIRA creates a
                    dedicated folder titled <em>&ldquo;Flomira Backups&rdquo;</em> in your
                    Google Drive to store backup snapshots (containing your product
                    lists, ingredients, order logs, and recipe costing details).
                  </li>
                  <li>
                    <strong>Restore Functionality:</strong> When requested by the
                    user, FLOMIRA downloads these backup files from your dedicated
                    folder to restore bakery data onto your device.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <h3 className="font-semibold text-white">
                  C. Data Retention, Sharing & Transfer Restrictions
                </h3>
                <ul className="muted mt-2 list-disc pl-5 space-y-2 text-sm">
                  <li>
                    <strong>No Third-Party Sharing:</strong> Google user data
                    obtained through Google APIs is <strong>never</strong> shared,
                    transferred, sold, or disclosed to third parties, external
                    advertisers, or data brokers.
                  </li>
                  <li>
                    <strong>No AI/ML Training:</strong> Google user data is not
                    used for training generalized artificial intelligence or machine
                    learning models.
                  </li>
                  <li>
                    <strong>Direct Connection:</strong> All communication occurs
                    directly between your mobile device and Google&apos;s servers over
                    encrypted HTTPS protocols.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <h3 className="font-semibold text-white">
                  D. Google Limited Use Compliance Statement
                </h3>
                <p className="muted mt-2 text-sm font-medium text-white/90">
                  FLOMIRA&apos;s use and transfer to any other app of information
                  received from Google APIs will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-rose-300 hover:text-white"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-4">
                <h3 className="font-semibold text-white">
                  E. Revocation & User Control
                </h3>
                <p className="muted mt-1 text-sm">
                  You retain full control over your Google account. You may
                  disconnect Google Drive at any time inside the app under{" "}
                  <em>Settings &rarr; Backup &amp; Restore &rarr; Disconnect</em>,
                  or revoke access completely via your{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-rose-300 hover:text-white"
                  >
                    Google Account Security Settings
                  </a>
                  . You can manually delete any backup file from your Google Drive
                  whenever you wish.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Web Storefront Data */}
          <section className="surface p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">3. Information Collected on the Web Storefront</h2>
            <p className="muted mt-3">
              On our web storefront preview (<a href="https://flomira.onrender.com" className="underline text-white">flomira.onrender.com</a>):
            </p>
            <ul className="muted mt-3 list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Saved Drafts &amp; Cart:</strong> Cart selections and planning
                drafts are stored strictly on your local device browser profile using
                browser local storage. They are not transmitted to external tracking
                services.
              </li>
              <li>
                <strong>Order Inquiries:</strong> When submitting an order inquiry or
                custom design request, the details provided (name, phone number,
                delivery preference, and notes) are used solely to communicate with
                you regarding your cake order.
              </li>
              <li>
                <strong>No Online Payments Stored:</strong> FLOMIRA does not process
                or store credit card numbers or financial credentials on this website.
              </li>
            </ul>
          </section>

          {/* Section 4: Security */}
          <section className="surface p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">4. Data Security</h2>
            <p className="muted mt-3">
              We employ industry-standard administrative, technical, and physical
              safeguards to protect your data. All communication between client
              devices and cloud services is encrypted using Transport Layer Security
              (TLS/HTTPS).
            </p>
          </section>

          {/* Section 5: Children's Privacy */}
          <section className="surface p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">5. Children&apos;s Privacy</h2>
            <p className="muted mt-3">
              Our services are not directed to individuals under the age of 13. We do
              not knowingly collect personal information from children. If we become
              aware that a child has provided us with personal information, we take
              immediate steps to delete such data.
            </p>
          </section>

          {/* Section 6: Contact Information */}
          <section className="surface p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">6. Contact &amp; Developer Information</h2>
            <p className="muted mt-3">
              If you have any questions, requests, or concerns regarding this
              Privacy Policy or our data practices, please reach out directly:
            </p>
            <div className="mt-4 rounded-lg bg-black/20 p-4 space-y-1 text-sm">
              <p><strong>Application:</strong> FLOMIRA</p>
              <p><strong>Developer / Owner:</strong> Redooy</p>
              <p>
                <strong>Contact Email:</strong>{" "}
                <a
                  href="mailto:rwarieal@gmail.com"
                  className="underline text-rose-300 hover:text-white"
                >
                  rwarieal@gmail.com
                </a>
              </p>
              <p>
                <strong>Website:</strong>{" "}
                <a
                  href="https://flomira.onrender.com"
                  className="underline text-rose-300 hover:text-white"
                >
                  https://flomira.onrender.com
                </a>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="button-secondary">Return to home</Link>
              <Link href="/contact" className="button-primary">Contact us</Link>
            </div>
          </section>
        </div>
      </div>
    </PublicPageFrame>
  );
}
