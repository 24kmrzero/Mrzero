import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-queue-secret",
};

type QueueRow = {
  id: string;
  recipient_email: string;
  recipient_user_id: string | null;
  template_key: string;
  subject: string;
  payload: Record<string, unknown>;
  attempts: number;
  status: string;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function template(row: QueueRow) {
  const payload = row.payload || {};
  const course = escapeHtml(payload.course || "your course");
  const status = escapeHtml(payload.status || "updated");
  const session = escapeHtml(payload.session || "Live class");
  const startsAt = payload.starts_at ? new Date(String(payload.starts_at)).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }) : "Schedule available in your Student Panel";


  const sessions = Array.isArray(payload.sessions) ? payload.sessions as Array<Record<string, unknown>> : [];
  const sessionSchedule = sessions.length ? `<div style="margin-top:18px"><strong style="color:#ffc107">Class Schedule & Online Class Access</strong>${sessions.map((item) => {
    const title = escapeHtml(item.title || `Session ${item.session_number || ''}`);
    const topic = item.topic ? `<div style="color:#aaa;font-size:13px;margin-top:3px">${escapeHtml(item.topic)}</div>` : "";
    const starts = item.starts_at ? new Date(String(item.starts_at)).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "Date to be announced";
    const duration = escapeHtml(item.duration_minutes || 90);
    const classUrl = String(item.class_url || item.meet_url || "");
    const join = classUrl ? `<a href="${escapeHtml(classUrl)}" style="display:inline-block;margin-top:10px;background:#ffc107;color:#090909;text-decoration:none;font-weight:800;padding:9px 14px;border-radius:8px">Open Online Class</a>` : `<div style="margin-top:8px;color:#999">Online class link will be added soon.</div>`;
    return `<div style="margin-top:12px;padding:14px;border:1px solid #3e3412;border-radius:10px;background:#0c0c0c"><strong>${title}</strong><div style="margin-top:5px;color:#ccc">${escapeHtml(starts)} PKT · ${duration} minutes</div>${topic}${join}</div>`;
  }).join("")}</div>` : "";

  let heading = row.subject;
  let body = "Your 24K Excellence account has an update.";
  if (row.template_key === "course_enrollment") {
    heading = "Course Enrollment Confirmed";
    body = `Your enrollment in <strong>${course}</strong> is confirmed. Your current class schedule and online class access are below.${sessionSchedule}`;
  } else if (row.template_key === "payment_received") {
    heading = "Payment Receipt Received";
    body = `We received your payment proof for <strong>${course}</strong>. Admin review is pending.`;
  } else if (row.template_key === "payment_under_review") {
    heading = "Payment Under Review";
    body = `Your payment for <strong>${course}</strong> is under review.`;
  } else if (row.template_key === "payment_approved") {
    heading = "Payment Approved";
    body = `Your payment for <strong>${course}</strong> has been approved. Course and online class access are now unlocked.${sessionSchedule}`;
  } else if (row.template_key === "payment_declined") {
    const note = payload.admin_note ? `<br><br><strong>Admin note:</strong> ${escapeHtml(payload.admin_note)}` : "";
    heading = "Payment Declined";
    body = `Your payment for <strong>${course}</strong> was declined.${note}`;
  } else if (row.template_key === "payment_resubmission_required") {
    const note = payload.admin_note ? `<br><br><strong>Admin note:</strong> ${escapeHtml(payload.admin_note)}` : "";
    heading = "New Payment Receipt Required";
    body = `Please upload a new payment receipt for <strong>${course}</strong>.${note}`;
  } else if (row.template_key === "announcement") {
    heading = String(payload.title || row.subject);
    body = escapeHtml(payload.message || "A new announcement is available in your Student Panel.").replaceAll("\n", "<br>");
  } else if (row.template_key === "live_class") {
    heading = "Live Class Information";
    body = `<strong>${session}</strong><br>${escapeHtml(startsAt)} PKT<br><br>Open your Student Panel near class time to join securely.`;
  } else {
    body = `Your account status is now <strong>${status}</strong>. Open your Student Panel for details.`;
  }

  const siteUrl = Deno.env.get("SITE_URL") || "https://www.24kmrzero.com";
  return `<!doctype html><html><body style="margin:0;background:#080808;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:28px 18px"><div style="border:1px solid #5b4912;background:#111;border-radius:16px;overflow:hidden"><div style="padding:22px;background:linear-gradient(135deg,#17130a,#080808);border-bottom:1px solid #5b4912"><div style="font-size:12px;letter-spacing:.18em;color:#ffc107;font-weight:800">24K EXCELLENCE</div><h1 style="margin:9px 0 0;font-size:25px;color:#fff">${escapeHtml(heading)}</h1></div><div style="padding:24px;line-height:1.7;color:#d6d6d6">${body}<div style="margin-top:24px"><a href="${escapeHtml(siteUrl)}/student-dashboard.html" style="display:inline-block;background:#ffc107;color:#090909;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:9px">Open Student Panel</a></div></div><div style="padding:16px 24px;border-top:1px solid #272727;color:#888;font-size:12px">Trading involves financial risk. Content is for educational purposes and does not guarantee profit.</div></div></div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    let serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
    if (!serviceRole) {
      try {
        const named = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
        serviceRole = Object.values(named)[0] as string | undefined;
      } catch { /* legacy secret below will be used when available */ }
    }
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "24K Excellence <no-reply@24kmrzero.com>";
    const queueSecret = Deno.env.get("EMAIL_QUEUE_SECRET");
    if (!supabaseUrl || !serviceRole) throw new Error("Supabase function secrets are incomplete.");
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured.");

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const suppliedSecret = req.headers.get("x-queue-secret");
    let allowed = Boolean(queueSecret && suppliedSecret && suppliedSecret === queueSecret);

    if (!allowed) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: profile } = await admin.from("profiles").select("role,status").eq("id", userData.user.id).maybeSingle();
      allowed = profile?.role === "admin" && profile?.status === "active";
    }

    if (!allowed) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit || 25), 1), 100);
    const retryFailed = body?.retry_failed === true;
    const statuses = retryFailed ? ["pending", "failed"] : ["pending"];

    const { data: rows, error: fetchError } = await admin
      .from("email_queue")
      .select("id,recipient_email,recipient_user_id,template_key,subject,payload,attempts,status")
      .in("status", statuses)
      .lte("scheduled_at", new Date().toISOString())
      .lt("attempts", 5)
      .order("scheduled_at", { ascending: true })
      .limit(limit);
    if (fetchError) throw fetchError;

    let sent = 0;
    let failed = 0;
    for (const row of (rows || []) as QueueRow[]) {
      const { data: claimed } = await admin
        .from("email_queue")
        .update({ status: "processing", attempts: Number(row.attempts || 0) + 1, last_error: null })
        .eq("id", row.id)
        .in("status", statuses)
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: emailFrom, to: [row.recipient_email], subject: row.subject, html: template(row) }),
        });
        const responseText = await response.text();
        if (!response.ok) throw new Error(`Resend ${response.status}: ${responseText.slice(0, 500)}`);
        await admin.from("email_queue").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
        sent++;
      } catch (error) {
        await admin.from("email_queue").update({ status: "failed", last_error: String(error instanceof Error ? error.message : error).slice(0, 1000) }).eq("id", row.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ message: `Email queue processed: ${sent} sent, ${failed} failed.`, sent, failed, checked: rows?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error instanceof Error ? error.message : error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
