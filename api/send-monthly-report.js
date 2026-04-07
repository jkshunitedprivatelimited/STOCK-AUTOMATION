import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // --- Config ---
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const gmailUser = process.env.GMAIL_USER || 'jkshunitedpvtltd@gmail.com';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    if (!gmailAppPassword) {
      throw new Error('Missing GMAIL_APP_PASSWORD environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Gmail SMTP Transporter ---
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // --- Calculate previous month's date range ---
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const monthName = firstDayLastMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const fromDate = firstDayLastMonth.toISOString();
    const toDate = firstDayThisMonth.toISOString();

    console.log(`Generating monthly report for: ${monthName} (${fromDate} to ${toDate})`);

    // --- Optional: test mode ---
    let testFranchiseId = null;
    try {
      testFranchiseId = req.body?.test_franchise_id || null;
    } catch { /* no body = production mode */ }

    // --- 1. Fetch franchise owners ---
    let query = supabase
      .from('profiles')
      .select('franchise_id, name, email, company')
      .not('email', 'is', null);

    if (testFranchiseId) {
      query = query.eq('franchise_id', testFranchiseId);
      console.log(`🧪 TEST MODE: Only sending to franchise_id = ${testFranchiseId}`);
    } else {
      query = query.eq('role', 'franchise');
    }

    const { data: franchises, error: fError } = await query;

    if (fError) throw new Error('Failed to fetch profiles: ' + JSON.stringify(fError));
    if (!franchises || franchises.length === 0) {
      return res.status(200).json({
        message: testFranchiseId
          ? `No franchise found with ID: ${testFranchiseId}`
          : 'No franchise owners found',
      });
    }

    const results = [];

    // --- 2. For each franchise, generate CSV and send email ---
    for (const franchise of franchises) {
      if (!franchise.franchise_id || !franchise.email) {
        results.push({ franchise_id: franchise.franchise_id || 'unknown', status: 'skipped', error: 'Missing email or franchise_id' });
        continue;
      }

      try {
        // Query bills for last month
        const { data: bills, error: bError } = await supabase
          .from('bills_generated')
          .select('*')
          .eq('franchise_id', franchise.franchise_id)
          .gte('created_at', fromDate)
          .lt('created_at', toDate)
          .order('created_at', { ascending: true });

        if (bError) throw new Error(bError.message);

        const safeBills = bills || [];
        const billIds = safeBills.map(b => b.id);

        // Query all items for these bills
        let allItems = [];
        if (billIds.length > 0) {
          const { data: items, error: iError } = await supabase
            .from('bills_items_generated')
            .select('*')
            .in('bill_id', billIds);

          if (iError) throw new Error(iError.message);
          allItems = items || [];
        }

        // --- CALCULATION LOGIC ---
        const totalBills = safeBills.length;
        const totalAmount = safeBills.reduce((sum, b) => sum + Number(b.total ?? 0), 0);
        const upiAmount = safeBills.filter(b => b.payment_mode?.toLowerCase() === 'upi').reduce((sum, b) => sum + Number(b.total ?? 0), 0);
        const cashAmount = safeBills.filter(b => b.payment_mode?.toLowerCase() === 'cash').reduce((sum, b) => sum + Number(b.total ?? 0), 0);
        const totalDiscount = safeBills.reduce((sum, b) => sum + Number(b.discount ?? 0), 0);

        // Group by Date for Day-wise summary
        const dayMap = new Map();

        safeBills.forEach(b => {
          const dateStr = new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, { count: 0, total: 0, upi: 0, cash: 0, discount: 0 });
          }
          const day = dayMap.get(dateStr);
          day.count++;
          day.total += Number(b.total ?? 0);
          day.discount += Number(b.discount ?? 0);
          if (b.payment_mode?.toLowerCase() === 'upi') day.upi += Number(b.total ?? 0);
          if (b.payment_mode?.toLowerCase() === 'cash') day.cash += Number(b.total ?? 0);
        });

        // --- BUILD CSV ---
        let csv = `"COMPANY NAME:","${(franchise.company || franchise.name).replace(/"/g, '""')}"\n`;
        csv += `"FRANCHISE ID:","${franchise.franchise_id}"\n`;
        csv += `"REPORT PERIOD:","${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(new Date(toDate).getTime() - 1).toLocaleDateString('en-IN')}"\n`;
        csv += `"GENERATED ON:","${new Date().toLocaleDateString('en-IN')}"\n\n`;

        // 1. Overall Summary
        csv += `"OVERALL MONTHLY SUMMARY"\n`;
        csv += `"Total Revenue (INR):","${totalAmount.toFixed(2)}"\n`;
        csv += `"Total Bills:","${totalBills}"\n`;
        csv += `"UPI Payments (INR):","${upiAmount.toFixed(2)}"\n`;
        csv += `"Cash Payments (INR):","${cashAmount.toFixed(2)}"\n`;
        csv += `"Total Discounts (INR):","${totalDiscount.toFixed(2)}"\n\n`;

        // 2. Day-wise Summary
        csv += `"DAY-WISE SUMMARY"\n`;
        csv += `"Date","Total Bills","UPI Revenue","Cash Revenue","Daily Total","Daily Discounts"\n`;
        Array.from(dayMap.entries()).forEach(([date, stats]) => {
          csv += `"${date}","${stats.count}","${stats.upi.toFixed(2)}","${stats.cash.toFixed(2)}","${stats.total.toFixed(2)}","${stats.discount.toFixed(2)}"\n`;
        });
        csv += `\n`;

        // 3. Detailed Itemized Ledger
        csv += `"DETAILED CONSOLIDATED AUDIT TRAIL"\n`;
        csv += `"S.No","Date","Time","Bill Number","Payment Mode","Item Name","Qty","Price (INR)","Item Total (INR)","Bill Discount (INR)","Bill Final Amount (INR)"\n`;

        if (safeBills.length > 0) {
          safeBills.forEach((bill, index) => {
            const dateObj = new Date(bill.created_at);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const discount = Number(bill.discount ?? 0).toFixed(2);
            const finalTotal = Number(bill.total ?? 0).toFixed(2);
            const mode = String(bill.payment_mode || 'N/A').toUpperCase();
            const txnId = String(bill.id).replace(/"/g, '""');

            const billItems = allItems.filter(item => item.bill_id === bill.id);

            if (billItems.length === 0) {
              csv += `"${index + 1}","${dateStr}","${timeStr}","${txnId}","${mode}","N/A","0","0.00","0.00","${discount}","${finalTotal}"\n`;
            } else {
              billItems.forEach((item, i) => {
                const itemName = String(item.item_name || 'Unknown').replace(/"/g, '""');
                const qty = item.qty || 0;
                const price = Number(item.price ?? 0).toFixed(2);
                const itemTotal = Number(item.total ?? (qty * Number(price))).toFixed(2);

                if (i === 0) {
                  csv += `"${index + 1}","${dateStr}","${timeStr}","${txnId}","${mode}","${itemName}","${qty}","${price}","${itemTotal}","${discount}","${finalTotal}"\n`;
                } else {
                  csv += `"" ,"" ,"" ,"" ,"" ,"${itemName}","${qty}","${price}","${itemTotal}","" ,"" \n`;
                }
              });
            }
          });
        }

        // --- Send email via Gmail SMTP ---
        const mailOptions = {
          from: `JKSH United <${gmailUser}>`,
          to: franchise.email,
          subject: `Monthly Sales Report — ${monthName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #006437;">Monthly Sales Report</h2>
              <p>Hi <strong>${franchise.name}</strong>,</p>
              <p>Please find attached your sales report for <strong>${monthName}</strong>.</p>
              <table style="border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Total Bills</td><td style="padding: 8px 16px;">${totalBills}</td></tr>
                <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Total Revenue</td><td style="padding: 8px 16px;">₹${totalAmount.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">UPI</td><td style="padding: 8px 16px;">₹${upiAmount.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Cash</td><td style="padding: 8px 16px;">₹${cashAmount.toFixed(2)}</td></tr>
              </table>
              <p style="color: #6b7280; font-size: 12px;">This is an automated report from JKSH United. For detailed transactions, please check the attached CSV file.</p>
            </div>
          `,
          attachments: [
            {
              filename: `Sales_Report_${monthName.replace(/\s/g, '_')}_${franchise.franchise_id}.csv`,
              content: csv,
              contentType: 'text/csv',
            },
          ],
        };

        await transporter.sendMail(mailOptions);

        results.push({ franchise_id: franchise.franchise_id, status: 'sent' });
        console.log(`✅ Report sent to ${franchise.email} (${franchise.franchise_id})`);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ franchise_id: franchise.franchise_id, status: 'failed', error: msg });
        console.error(`❌ Failed for ${franchise.franchise_id}: ${msg}`);
      }
    }

    return res.status(200).json({ month: monthName, results });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('CRITICAL ERROR:', message);
    return res.status(500).json({ error: message });
  }
}
