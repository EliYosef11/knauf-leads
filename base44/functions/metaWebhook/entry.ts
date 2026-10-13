import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Meta Lead Ads Webhook Handler
// Verify Token: knauf-meta-webhook
// This function handles both:
//   GET  - Meta webhook verification (challenge handshake)
//   POST - Incoming lead events from Facebook/Instagram Lead Ads

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // --- GET: Meta webhook verification ---
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

    // --- POST: Incoming lead event ---
    if (req.method === 'POST') {
        const body = await req.json();

        const base44 = createClientFromRequest(req);

        // Only process leadgen events
        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        if (change?.field !== 'leadgen') {
            return Response.json({ ok: true, skipped: true });
        }

        const leadgenId = change?.value?.leadgen_id;
        const formId = change?.value?.form_id;
        const pageId = change?.value?.page_id;

        if (!leadgenId || !pageId) {
            return Response.json({ ok: false, error: 'Missing leadgen_id or page_id' }, { status: 400 });
        }

        // Fetch lead details from Meta Graph API
        const pageAccessToken = Deno.env.get('META_PAGE_ACCESS_TOKEN');
        if (!pageAccessToken) {
            return Response.json({ ok: false, error: 'META_PAGE_ACCESS_TOKEN not set' }, { status: 500 });
        }

        const metaRes = await fetch(
            `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,form_id&access_token=${pageAccessToken}`
        );
        const metaData = await metaRes.json();

        if (!metaRes.ok || metaData.error) {
            return Response.json({ ok: false, error: metaData.error?.message }, { status: 500 });
        }

        // Match campaign by form_id
        const resolvedFormId = metaData.form_id || formId || '';
        let campaignName = 'Meta Lead Ad';
        let campaignId = '';

        if (resolvedFormId) {
            const campaigns = await base44.asServiceRole.entities.Campaign.filter({ form_id: resolvedFormId });
            if (campaigns.length > 0) {
                campaignName = campaigns[0].name;
                campaignId = campaigns[0].id;
            }
        }

        // Parse field_data from Meta into a key-value map
        const fields = {};
        for (const item of (metaData.field_data || [])) {
            fields[item.name] = item.values?.[0] || '';
        }

        // Map Meta fields to our Lead entity
        const leadData = {
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
        };

        // Save to database
        await base44.asServiceRole.entities.Lead.create(leadData);

        return Response.json({ ok: true });
    }

    return new Response('Method Not Allowed', { status: 405 });
});

function mapClientType(value) {
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

function mapProjectSize(value) {
    if (!value) return '';
    if (value.includes('גדול') || value.includes('1000') || value.toLowerCase().includes('large')) {
        return 'גדול - מעל 1000 מ"ר';
    }
    if (value.includes('קטן') || value.toLowerCase().includes('small')) {
        return 'קטן - עד 1000 מ"ר';
    }
    return value;
}