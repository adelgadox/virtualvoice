export const metadata = {
  title: "Privacy Policy — VirtualVoice",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: April 2026</p>

      <section className="space-y-6 text-gray-700 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">1. Overview</h2>
          <p>
            VirtualVoice is an AI-powered social media management tool that helps content creators
            manage and respond to comments on their Instagram and Facebook accounts. This policy
            explains how we collect, use, and protect your data.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">2. Data We Collect</h2>
          <p>We collect the following data through the Meta API:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Public comments posted on your Instagram and Facebook Page posts</li>
            <li>Comment author usernames and platform IDs</li>
            <li>Instagram and Facebook Page access tokens (stored securely)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">3. How We Use Your Data</h2>
          <p>
            Data collected through the Meta API is used exclusively to generate AI-powered response
            suggestions for your review. We do not sell or share your data with third parties.
            Approved responses are published back to Instagram or Facebook on your behalf.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">4. Data Retention</h2>
          <p>
            Comments and generated responses are stored in our database to improve future
            AI-generated responses through a feedback loop. You may request deletion of your data
            at any time.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">5. Meta Platform Data</h2>
          <p>
            We access Instagram and Facebook data through the official Meta Graph API. We comply
            with Meta{"'"}s Platform Terms and Developer Policies. We only request permissions
            necessary to read comments and publish replies.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">6. Security</h2>
          <p>
            Access tokens are stored encrypted in our database. All API communication uses HTTPS.
            We do not store passwords or sensitive personal information beyond what is required
            for authentication.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">7. Contact</h2>
          <p>
            For questions about this privacy policy or to request data deletion, contact us at{" "}
            <a href="mailto:antony-delgado@hotmail.com" className="text-blue-600 hover:underline">
              antony-delgado@hotmail.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
