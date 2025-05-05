'use client';

export function PrivacyPolicyClientContent() {
  return (
    <section className="pt-4">
      <p className="text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString('en-GB')}
      </p>
    </section>
  );
}