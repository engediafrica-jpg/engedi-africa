import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Home</Link>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#999999', fontSize: '14px', marginBottom: '48px' }}>Last updated: June 2026</p>

        {[
          {
            title: '1. Introduction',
            body: 'EnGedi Africa ("we", "our", "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use our platform at engediafrica.com. By using EnGedi Africa, you agree to the collection and use of information as described in this policy.'
          },
          {
            title: '2. Information We Collect',
            body: 'We collect information you provide directly to us including your full name, email address, phone number, role, bio, address, profile photo, and any documents you upload for verification such as government ID, CAC certificates, or professional licenses. We also collect information automatically such as your IP address, browser type, device information, and how you interact with our platform.'
          },
          {
            title: '3. How We Use Your Information',
            body: 'We use your information to create and manage your account, provide and improve our services, verify your identity and credentials, process payments and transactions, send you important notices and updates, respond to your enquiries and support requests, and to detect and prevent fraud or abuse on the platform.'
          },
          {
            title: '4. Verification Documents',
            body: 'Documents you upload for verification — including government ID, CAC certificates, and professional licenses — are stored securely in private storage and are only accessible to authorised EnGedi Africa administrators. We do not share these documents with third parties except where required by law. Documents are used solely for the purpose of verifying your identity and credentials.'
          },
          {
            title: '5. Payment Information',
            body: 'EnGedi Africa does not store your card details or bank account numbers. All payment information is processed securely by Paystack, our payment processor. Please review Paystack\'s privacy policy at paystack.com for details on how they handle your payment data.'
          },
          {
            title: '6. Sharing Your Information',
            body: 'We do not sell your personal information. We may share your information with service providers who help us operate our platform such as Supabase for database and storage, Paystack for payments, and Resend for email delivery. We may also share information where required by Nigerian law or a court order, or to protect the rights, property, or safety of EnGedi Africa, our users, or the public.'
          },
          {
            title: '7. Public Profile Information',
            body: 'Certain profile information such as your name, role, bio, skills, city, and verification status may be visible to other users on the platform. Your email address, phone number, and verification documents are never made publicly visible.'
          },
          {
            title: '8. Data Retention',
            body: 'We retain your personal information for as long as your account is active or as needed to provide our services. If you delete your account, we will delete or anonymise your personal information within 30 days, except where we are required by law to retain it for longer.'
          },
          {
            title: '9. Your Rights',
            body: 'You have the right to access the personal information we hold about you, request correction of inaccurate information, request deletion of your account and personal data, and object to certain uses of your information. To exercise any of these rights, contact us at hello@engediafrica.com.'
          },
          {
            title: '10. Cookies',
            body: 'EnGedi Africa uses cookies and similar technologies to maintain your session, remember your preferences, and understand how users interact with our platform. You can control cookies through your browser settings, but disabling cookies may affect your ability to use certain features of the platform.'
          },
          {
            title: '11. Security',
            body: 'We take the security of your personal information seriously. We use industry-standard encryption, secure servers, and access controls to protect your data. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.'
          },
          {
            title: '12. Children',
            body: 'EnGedi Africa is not intended for use by persons under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.'
          },
          {
            title: '13. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a notice on the platform. Your continued use of EnGedi Africa after changes are posted means you accept the updated policy.'
          },
          {
            title: '14. Contact Us',
            body: 'If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please contact us at hello@engediafrica.com or call +234 913 445 9307. We will respond within 5 business days.'
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ fontSize: '15px', color: '#666666', lineHeight: '1.8', margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1.5px solid #EEE6DA', paddingTop: '32px', marginTop: '48px' }}>
          <Link href="/terms" style={{ color: '#8B5E3C', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Read our Terms & Conditions →</Link>
        </div>
      </div>

      <div style={{ background: '#1A1A1A', borderTop: '3px solid #8B5E3C', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#999999', fontSize: '14px', margin: 0 }}>© 2026 EnGedi Africa. hello@engediafrica.com</p>
      </div>
    </div>
  )
}