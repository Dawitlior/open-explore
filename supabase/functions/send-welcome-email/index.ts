import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const LOGO_URL =
  'https://id-preview--f6aa5ec0-cfaa-4675-b33f-c0d450792af4.lovable.app/__l5e/assets-v1/4655e273-265c-4219-bda5-a814aba30d98/orca-email-logo.png';
const APP_URL = 'https://id-preview--f6aa5ec0-cfaa-4675-b33f-c0d450792af4.lovable.app';

const BodySchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(120),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(name: string) {
  const n = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f4f6fa;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fa;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(6,19,38,0.08);">
        <tr>
          <td align="center" style="background-color:#061326;padding:36px 24px;">
            <img src="${LOGO_URL}" alt="ORCA Investment" width="72" height="72" style="display:block;border-radius:18px;"/>
            <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:2px;margin-top:14px;">ORCA INVESTMENT</div>
            <div style="color:#8fa3c4;font-size:12px;letter-spacing:3px;margin-top:4px;">TRADING INTELLIGENCE OS</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 16px;font-size:24px;color:#061326;text-align:right;">ברוך הבא ל-Orca, ${n}</h1>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a4658;text-align:right;">
              אנחנו שמחים שהצטרפת. החשבון שלך נפתח בהצלחה, והפלטפורמה מוכנה לשירותך —
              יומן מסחר חכם, מנוע סיכונים בזמן אמת, ותובנות AI שילווה כל החלטה שלך.
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3a4658;text-align:right;">
              הצעד הראשון שלך: פתח את התיק הראשון, ותן ל-Orca להתחיל ללמוד את סגנון המסחר שלך.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${APP_URL}" style="display:inline-block;background-color:#061326;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 36px;border-radius:10px;">כניסה לפלטפורמה</a>
              </td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e6eaf2;margin:32px 0;"/>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#8a93a6;text-align:right;" dir="ltr">
              Welcome to Orca, ${n}. Your account is ready — smart trade journal, real-time risk engine,
              and AI insights for every decision.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color:#f8fafd;padding:20px 24px;">
            <p style="margin:0;font-size:11px;color:#9aa3b5;">
              Orca Investment · מייל זה נשלח בעקבות פתיחת חשבון · אין צורך להשיב למייל זה
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { email, name } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM = Deno.env.get('RESEND_FROM') ?? 'Orca Investment <hello@orca-investment.com>';
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      console.error('Missing gateway credentials');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'ברוך הבא ל-Orca Investment — החשבון שלך מוכן',
        html: buildHtml(name),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend gateway failed [${response.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: 'Provider request failed', status: response.status, details: errorBody }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result = await response.json();
    return new Response(JSON.stringify({ ok: true, id: result?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-welcome-email error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
