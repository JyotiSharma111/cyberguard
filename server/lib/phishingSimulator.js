/**
 * Phishing Simulation Engine
 * Sends safe test phishing emails via Resend.
 * Tracks opens and clicks via tracking pixel + redirect links.
 * Stores results in Supabase.
 */

import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// Phishing simulation templates
export const PHISHING_TEMPLATES = [
  {
    id:       'it-password-reset',
    name:     'IT Password Reset',
    category: 'Credential harvesting',
    difficulty:'easy',
    subject:  'Action required: Your password expires in 24 hours',
    preview:  'Your account password is about to expire. Click here to reset it.',
    body: (org, trackLink, trackPixel) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#1d4ed8;padding:20px 24px">
          <div style="color:#fff;font-size:18px;font-weight:600">IT Support — ${org}</div>
        </div>
        <div style="padding:24px">
          <p style="font-size:15px;color:#111827;margin-bottom:16px">Your account password is set to expire in <strong>24 hours</strong>.</p>
          <p style="color:#374151;margin-bottom:20px">To avoid losing access to your email and files, please reset your password immediately using the button below.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${trackLink}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Reset Password Now</a>
          </div>
          <p style="color:#6b7280;font-size:12px">If you believe this is an error, contact IT support. This link expires in 24 hours.</p>
          ${trackPixel}
        </div>
      </div>`,
    educationMessage: 'This was a simulated phishing email. Real IT departments never ask you to click email links to reset passwords. Always go directly to the IT portal URL or call IT support.'
  },
  {
    id:       'ceo-wire-transfer',
    name:     'CEO Wire Transfer Request',
    category: 'Business Email Compromise',
    difficulty:'medium',
    subject:  'Urgent wire transfer needed — confidential',
    preview:  'Hi, I need you to process an urgent wire transfer today.',
    body: (org, trackLink, trackPixel) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <p style="margin-bottom:16px">Hi,</p>
        <p style="margin-bottom:16px">I'm in a meeting and need you to process an urgent payment before close of business today. This is time-sensitive and confidential — please don't discuss with anyone until it's done.</p>
        <p style="margin-bottom:16px">Amount: £8,500 to a new supplier. I'll send account details shortly but please confirm you can process this today by clicking the link below.</p>
        <p style="margin-bottom:20px"><a href="${trackLink}" style="color:#1d4ed8">Confirm I can process this payment →</a></p>
        <p style="color:#374151;margin-bottom:4px">Thanks,</p>
        <p style="color:#374151">CEO, ${org}</p>
        ${trackPixel}
      </div>`,
    educationMessage: 'This was a simulated phishing email. CEO fraud / BEC attacks are responsible for billions in losses. Always verify payment requests by calling the requestor directly using a known phone number — never rely solely on email.'
  },
  {
    id:       'parcel-delivery',
    name:     'Missed Parcel Delivery',
    category: 'Smishing / general phishing',
    difficulty:'easy',
    subject:  'Your parcel could not be delivered — reschedule now',
    preview:  'We attempted to deliver your parcel today. Action required.',
    body: (org, trackLink, trackPixel) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#dc2626;padding:16px 24px">
          <div style="color:#fff;font-size:16px;font-weight:600">📦 Royal Mail — Delivery Notification</div>
        </div>
        <div style="padding:24px">
          <p style="font-size:15px;color:#111827;margin-bottom:16px">We attempted to deliver a parcel to your address today but were unable to complete the delivery.</p>
          <p style="color:#374151;margin-bottom:20px">A small redelivery fee of £1.99 is required to reschedule. Your parcel will be returned to sender in 48 hours.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${trackLink}" style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Pay £1.99 and Reschedule</a>
          </div>
          <p style="color:#6b7280;font-size:12px">Tracking number: GB${Math.random().toString(36).slice(2,10).toUpperCase()}</p>
          ${trackPixel}
        </div>
      </div>`,
    educationMessage: 'This was a simulated phishing email. Parcel delivery scams are extremely common. Real delivery companies never ask for payment via email links. Always check the sender address and go directly to the carrier\'s official website.'
  },
  {
    id:       'sharepoint-doc',
    name:     'Shared Document Notification',
    category: 'Credential harvesting',
    difficulty:'medium',
    subject:  '[Name] has shared a document with you',
    preview:  'A document has been shared with you via Microsoft SharePoint.',
    body: (org, trackLink, trackPixel) => `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px">
        <div style="padding:24px 24px 8px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #f3f4f6">
          <div style="width:32px;height:32px;background:#0078d4;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">M</div>
          <div style="font-size:13px;color:#374151">Microsoft SharePoint</div>
        </div>
        <div style="padding:24px">
          <p style="font-size:15px;color:#111827;margin-bottom:8px"><strong>A colleague</strong> has shared a document with you</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin:16px 0">
            <div style="font-weight:600;color:#111827">📄 Q4 Salary Review 2024.xlsx</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Shared from ${org} SharePoint</div>
          </div>
          <div style="text-align:center;margin:20px 0">
            <a href="${trackLink}" style="background:#0078d4;color:#fff;padding:11px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">Open in SharePoint</a>
          </div>
          ${trackPixel}
        </div>
      </div>`,
    educationMessage: 'This was a simulated phishing email. Attackers commonly fake SharePoint and OneDrive share notifications to steal Microsoft credentials. Check the sender email address carefully — real Microsoft emails always come from @microsoft.com or @sharepointonline.com domains.'
  },
]

export async function sendPhishingSimulation({ 
  campaignId, domainId, recipient, template, trackingBaseUrl, fromName, fromEmail 
}) {
  const resend = getResend()
  if (!resend) return { ok: false, error: 'Resend not configured — check RESEND_API_KEY in .env.local' }

  const trackClickUrl  = `${trackingBaseUrl}/api/phishing/track/click/${campaignId}/${recipient.id}`
  const trackOpenPixel = `<img src="${trackingBaseUrl}/api/phishing/track/open/${campaignId}/${recipient.id}" width="1" height="1" style="display:none" />`

  const html = template.body(recipient.org ?? fromName, trackClickUrl, trackOpenPixel)

  // Resend only allows sending from verified domains.
  // Fall back to onboarding@resend.dev (always works on free tier) if custom domain not set up.
  const safeFrom = process.env.RESEND_FROM ?? 'onboarding@resend.dev'

  try {
    const result = await resend.emails.send({
      from:    `${fromName} <${safeFrom}>`,
      to:      [recipient.email],
      subject: template.subject,
      html,
    })
    if (result.error) {
      console.error('[phishing] Resend error:', result.error)
      return { ok: false, error: result.error.message ?? JSON.stringify(result.error) }
    }
    console.log(`[phishing] Sent to ${recipient.email} — id: ${result.data?.id}`)
    return { ok: true, emailId: result.data?.id }
  } catch (err) {
    console.error('[phishing] Send failed:', err.message)
    return { ok: false, error: err.message }
  }
}
