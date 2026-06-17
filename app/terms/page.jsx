import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F1' }}>
      <div style={{ background: '#1A1A1A', borderBottom: '3px solid #8B5E3C', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: '800', fontSize: '20px' }}>EnGedi Africa</Link>
        <Link href="/" style={{ color: '#999999', textDecoration: 'none', fontSize: '13px' }}>← Back to Home</Link>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>Terms & Conditions</h1>
        <p style={{ color: '#999999', fontSize: '14px', marginBottom: '48px' }}>Last updated: June 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using the EnGedi Africa platform at engediafrica.com, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our platform. These terms apply to all users including Project Owners, Artisans, Suppliers, Professionals, Service Providers, and Equipment Providers.'
          },
          {
            title: '2. Who We Are',
            body: 'EnGedi Africa is a construction marketplace platform that connects project owners with artisans, suppliers, professionals, and service providers across Nigeria and Africa. We provide the platform and infrastructure — we are not a party to the contracts or transactions made between users.'
          },
          {
            title: '3. User Accounts',
            body: 'You must register for an account to use most features of EnGedi Africa. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must provide accurate and truthful information during registration. You must be at least 18 years old to create an account.'
          },
          {
            title: '4. User Conduct',
            body: 'You agree not to use EnGedi Africa to engage in fraudulent activity, post false information or fake reviews, impersonate another person or business, violate any applicable Nigerian or international law, or harass, abuse, or harm other users. We reserve the right to suspend or terminate any account that violates these rules.'
          },
          {
            title: '5. Verification',
            body: 'EnGedi Africa offers a voluntary verification programme. Verified users have submitted government-issued ID and other relevant documents. While we make reasonable efforts to verify submissions, EnGedi Africa does not guarantee the accuracy of any user-provided information. The EnGedi Verified badge indicates document submission and review — not a guarantee of quality or performance.'
          },
          {
            title: '6. Payments',
            body: 'Payments on the EnGedi Africa platform are processed through Paystack, a licensed payment processor. EnGedi Africa charges a commission on transactions facilitated through the platform. All prices are displayed in Nigerian Naira (NGN). EnGedi Africa is not responsible for failed transactions caused by your bank, card issuer, or Paystack.'
          },
          {
            title: '7. Escrow',
            body: 'Where escrow payment is offered, funds are held by EnGedi Africa until both parties confirm satisfactory completion of the service or delivery. EnGedi Africa reserves the right to mediate disputes and release funds based on its assessment of the evidence provided by both parties.'
          },
          {
            title: '8. Reviews and Ratings',
            body: 'Users may leave reviews and ratings after a completed transaction. Reviews must be honest, fair, and based on genuine experience. EnGedi Africa reserves the right to remove reviews that are abusive, fraudulent, or violate our community standards.'
          },
          {
            title: '9. Intellectual Property',
            body: 'All content on the EnGedi Africa platform including logos, design, text, and software is the property of EnGedi Africa and is protected by Nigerian and international copyright law. You may not reproduce, distribute, or create derivative works without our written permission.'
          },
          {
            title: '10. Limitation of Liability',
            body: 'EnGedi Africa is a marketplace platform and is not liable for the quality, safety, legality, or delivery of goods and services listed by users. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability to you shall not exceed the amount you paid to us in the three months preceding any claim.'
          },
          {
            title: '11. Changes to Terms',
            body: 'We may update these Terms and Conditions from time to time. We will notify users of significant changes via email or a notice on the platform. Your continued use of EnGedi Africa after changes are posted constitutes your acceptance of the updated terms.'
          },
          {
            title: '12. Governing Law',
            body: 'These Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.'
          },
          {
            title: '13. Contact',
            body: 'If you have any questions about these Terms and Conditions, please contact us at hello@engediafrica.com or call +234 913 445 9307.'
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A', marginBottom: '12px' }}>{section.title}</h2>
            <p style={{ fontSize: '15px', color: '#666666', lineHeight: '1.8', margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1.5px solid #EEE6DA', paddingTop: '32px', marginTop: '48px' }}>
          <Link href="/privacy-policy" style={{ color: '#8B5E3C', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Read our Privacy Policy →</Link>
        </div>
      </div>

      <div style={{ background: '#1A1A1A', borderTop: '3px solid #8B5E3C', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#999999', fontSize: '14px', margin: 0 }}>© 2026 EnGedi Africa. hello@engediafrica.com</p>
      </div>
    </div>
  )
}