import { PrivacyPolicyClientContent } from '@/components/privacy-policy/client-content';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700">
            This Privacy Policy describes how wcms ("we", "our", or "us") collects, uses, and protects
            your personal information when you use our warehouse management system.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Account information (name, email, password)</li>
            <li>Usage data (system interactions, preferences)</li>
            <li>Device information (browser type, IP address)</li>
            <li>Order and inventory management data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>To provide and maintain our service</li>
            <li>To notify you about changes to our service</li>
            <li>To provide customer support</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="text-gray-700">
            We implement appropriate security measures to protect your personal information.
            However, no method of transmission over the Internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="text-gray-700">
            You have the right to access, update, or delete your personal information.
            Contact us if you wish to exercise any of these rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-700">
            If you have any questions about this Privacy Policy, please contact us at:
            privacy@wcms.example.com
          </p>
        </section>

        <PrivacyPolicyClientContent />
      </div>
    </div>
  );
}