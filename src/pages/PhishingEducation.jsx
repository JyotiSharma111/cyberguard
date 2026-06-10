/**
 * Phishing Education Page
 * Shows when a user clicks a phishing simulation link.
 * URL: /?phishing_education=<campaignId>&recipient=<recipientId>
 */
import React from 'react'

export default function PhishingEducation() {
  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Warning banner */}
        <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 12,
          padding: '24px 28px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
            This was a phishing simulation
          </div>
          <div style={{ fontSize: 14, color: '#b91c1c', lineHeight: 1.6 }}>
            You clicked a link in a simulated phishing email sent by your organisation
            as part of a security awareness exercise. No data was collected and no harm was done.
          </div>
        </div>

        {/* What happened */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            What just happened?
          </div>
          {[
            ['📧', 'You received a simulated phishing email', 'It was designed to look like a legitimate message from IT, a courier, or a colleague.'],
            ['🖱️', 'You clicked the link inside it', 'In a real attack, this click could have installed malware or stolen your login credentials.'],
            ['✅', 'You are safe — this was a test', 'Your organisation uses CyberGuard to run regular phishing simulations to help staff recognise attacks.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* How to spot phishing */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
          padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 12 }}>
            🛡️ How to spot phishing emails next time
          </div>
          {[
            'Check the sender's actual email address — not just the display name',
            'Hover over links before clicking to see the real destination URL',
            'Urgency and pressure ("act now", "expires today") are classic phishing tactics',
            'Requests for passwords, payments, or personal details via email are almost always suspicious',
            'When in doubt — call the person directly using a number you already have',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#1e40af' }}>
              <span style={{ flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* What to do next */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
          padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
            ✅ What to do if you receive a suspicious email for real
          </div>
          <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.7 }}>
            Do not click any links. Do not reply. Forward it to your IT team or security contact
            and mark it as phishing in your email client.
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          This simulation was conducted by your organisation using CyberGuard security awareness tools.
          <br/>Questions? Contact your IT team.
        </div>

      </div>
    </div>
  )
}
