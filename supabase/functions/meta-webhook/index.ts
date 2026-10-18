/**
 * קליטת לידים מ-Meta Lead Ads (פייסבוק/אינסטגרם).
 * הועבר מ-base44/functions/metaWebhook — אותה לוגיקה ואותו מיפוי שדות.
 *
 * GET  — אימות ה-webhook מול Meta (hub.challenge)
 * POST — אירוע leadgen: שולפים את פרטי הליד מה-Graph API ושומרים אותו
 *
 * שים לב: הפונקציה הזו חייבת להיות פתוחה (ללא אימות JWT) כי Meta קוראת לה,
 * ולכן היא נפרסת עם --no-verify-jwt. השמירה עצמה נעשית בהרשאות שירות.
 *
 * סודות: META_VERIFY_TOKEN (ברירת מחדל knauf-meta-webhook), META_PAGE_ACCESS_TOKEN
 */

import { serviceClient } from '../_shared/db.ts';

function mapClientType(value: string): string {
  if (!value) return 'אחר';
  const v = value.toLowerCase();
  if (v.includes('קבלן') || v.includes('contractor')) return 'קבלן';
  if (v.includes('אדריכל') || v.includes('architect')) return 'אדריכל';
  if (v.includes('מעצב') || v.includes('designer')) return 'מעצב פנים';
  if (v.includes('מהנדס') || v.includes('engineer')) return 'מהנדס';
  if (v.includes('יזם') || v.includes('developer')) return 'יזם';
  if (v.includes('מפקח') || v.includes('inspector')) return 'מפקח';
  return 'אחר';
}

function mapProjectSize(value: string): string {
  if (!value) return '';
  if (value.includes('גדול') || value.includes('1000') || value.toLowerCase().includes('large')) {
    return 'גדול - מעל 1000 מ"ר';
  }
  if (value.includes('קטן') || value.toLowerCase().includes('small')) {
    return 'קטן - עד 1000 מ"ר';
  }
  return value;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('META_VERIFY_TOKEN') || 'knauf-meta-webhook';

    if (mode === 'subscribe' && token === verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const change = body?.entry?.[0]?.changes?.[0];
      if (change?.field !== 'leadgen') return Response.json({ ok: true, skipped: true });

      const leadgenId = change?.value?.leadgen_id;
      const formId = change?.value?.form_id;
      const pageId = change?.value?.page_id;
      if (!leadgenId || !pageId) {
        return Response.json({ ok: false, error: 'Missing leadgen_id or page_id' }, { status: 400 });
      }

      const pageAccessToken = Deno.env.get('META_PAGE_ACCESS_TOKEN');
      if (!pageAccessToken) {
        return Response.json({ ok: false, error: 'META_PAGE_ACCESS_TOKEN not set' }, { status: 500 });
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,form_id&access_token=${pageAccessToken}`,
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok || metaData.error) {
        return Response.json({ ok: false, error: metaData.error?.message }, { status: 500 });
      }

      const client = serviceClient();

      // התאמת קמפיין לפי form_id
      const resolvedFormId = metaData.form_id || formId || '';
      let campaignName = 'Meta Lead Ad';
      let campaignId: string | null = null;

      if (resolvedFormId) {
        const { data: campaigns } = await client.from('campaigns').select('*').eq('form_id', resolvedFormId);
        if (campaigns && campaigns.length > 0) {
          campaignName = campaigns[0].name;
          campaignId = campaigns[0].id;
        }
      }

      const fields: Record<string, string> = {};
      for (const item of metaData.field_data || []) {
        fields[item.name] = item.values?.[0] || '';
      }

      const { error } = await client.from('leads').insert({
        full_name: fields['full_name'] || fields['שם'] || fields['name'] || '',
        phone: fields['phone_number'] || fields['טלפון'] || fields['phone'] || '',
        email: fields['email'] || fields['אימייל'] || '',
        company: fields['company_name'] || fields['שם חברה'] || fields['company'] || '',
        role: mapClientType(fields['סוג לקוח'] || fields['client_type'] || ''),
        project_handling: mapProjectSize(fields['סוג פרויקט'] || fields['project_type'] || ''),
        campaign_name: campaignName,
        campaign_id: campaignId,
        lead_source: 'meta',
        assigned_to: 'קרן שי',
        assigned_email: 'keren.shay@knauf.com',
        status: 'טרם טופל',
      });
      if (error) throw new Error(error.message);

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
