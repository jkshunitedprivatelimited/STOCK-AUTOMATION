/*
 * Bulk Franchise Registration Script
 *
 * HOW TO USE:
 * 1. Ensure 'xlsx' library is installed (you already did this)
 * 2. Prepare an excel file named 'users.xlsx' in this directory.
 * 3. The excel file must have a header row with your provided structure:
 *    S.No | Email | T Vanamm | T Leaf | Full Name | Phone Number | Outlet Branch Name | Outlet Street Address | State | City | Pincode | Nearest Bus Stop
 * 4. Run the script in your terminal using: node bulk_register.js
 */

import { createClient } from '@supabase/supabase-js';
import pkg from 'xlsx';
const { readFile, utils } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ES modules to load local .env correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Uses 'users.xlsx' from the current root directory
const EXCEL_FILE_PATH = path.join(__dirname, "users.xlsx");

// Auto generate password: first four of name + random 4 digits (or fallback)
const generatePassword = (name, phone) => {
  const base = name ? name.toString().replace(/\s/g, '').slice(0, 4) : "JKSH";
  const suffix = phone ? phone.toString().slice(-4) : Math.floor(1000 + Math.random() * 9000);
  return `${base}@${suffix}`;
};

async function bulkRegister() {
  console.log(`Starting bulk registration from: ${EXCEL_FILE_PATH}\n`);
  
  let workbook;
  try {
    workbook = readFile(EXCEL_FILE_PATH);
  } catch (err) {
    console.error(`❌ Error reading Excel file: ${err.message}`);
    console.error(`Please make sure you have named your excel file 'users.xlsx' and placed it in the root folder alongside this script.`);
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const users = utils.sheet_to_json(worksheet, { defval: "" }); // Convert empty cells to empty strings

  if (users.length === 0) {
    console.log("No users found in the excel sheet.");
    return;
  }

  console.log(`Found ${users.length} users in the spreadsheet. Syncing latest Database ID counters...`);

  // Initialize counters by checking existing user Profiles
  let tvCounter = 0;
  let tlCounter = 0;

  const { data: tvProfiles } = await supabase.from('profiles').select('franchise_id').eq('company', 'T VANAMM');
  const { data: tlProfiles } = await supabase.from('profiles').select('franchise_id').eq('company', 'T LEAF');

  if (tvProfiles) {
    tvProfiles.forEach(item => {
      const match = item.franchise_id?.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > tvCounter) tvCounter = num;
      }
    });
  }

  if (tlProfiles) {
    tlProfiles.forEach(item => {
      const match = item.franchise_id?.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > tlCounter) tlCounter = num;
      }
    });
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // 1. Map columns from your specific table
    const emailStr = user['Email']?.toString().trim();
    const fullNameStr = user['Full Name']?.toString().trim();
    const phoneStr = user['Phone Number']?.toString().trim();
    
    let company = null;
    let franchise_id = null;

    if (user['T Vanamm'] && user['T Vanamm'].toString().toLowerCase().includes('yes')) {
      tvCounter++;
      company = 'T VANAMM';
      franchise_id = `TV-${tvCounter}`;
    } else if (user['T Leaf'] && user['T Leaf'].toString().toLowerCase().includes('yes')) {
      tlCounter++;
      company = 'T LEAF';
      franchise_id = `TL-${tlCounter}`;
    }

    const generatedPassword = generatePassword(fullNameStr, phoneStr);

    // Validate required fields
    if (!company || !franchise_id || !emailStr) {
      console.log(`⚠️ Skipping row ${i+2}: Missing essential fields (Requires 'Yes' in either 'T Vanamm' or 'T Leaf', and 'Email').`);
      continue;
    }

    try {
      console.log(`\n▶️ Creating franchise for: ${company} [${franchise_id}] - ${emailStr}`);

      // 1. Build Payload exactly as React frontend does
      const metadataPayload = {
        name: fullNameStr,
        phone: phoneStr,
        company: company,
        franchise_id: franchise_id,
        branch_location: user['Outlet Branch Name']?.toString().trim(),
        address: user['Outlet Street Address']?.toString().trim(),
        city: user['City']?.toString().trim().toUpperCase(),
        state: user['State']?.toString().trim(),
        pincode: user['Pincode']?.toString().trim(),
        nearest_bus_stop: user['Nearest Bus Stop']?.toString().trim(),
        role: 'franchise' // Required by edge function
      };

      // 2. Invoke the Edge Function to create user & profile
      const { data: resData, error } = await supabase.functions.invoke('register-user', {
        body: {
          email: emailStr.toLowerCase(),
          password: generatedPassword, 
          metadata: metadataPayload
        }
      });

      if (error) {
        let msg = error.message;
        if (error.context) {
          try {
             const body = await error.context.json();
             if (body?.error) msg = body.error;
          } catch(e) {}
        }
        throw new Error(`Edge Function Auth Error: ${msg}`);
      }

      if (resData?.error) {
         if (resData.error.includes("already registered") || resData.error.includes("already exists")) {
            console.log(`⚠️ User ${emailStr} is already registered. Syncing menu anyway...`);
         } else {
            throw new Error(`API Error: ${resData.error}`);
         }
      } else {
         console.log(`✅ Success: User created. (Password set to: ${generatedPassword})`);
      }

      // 3. Menu Sync (Forced to TRUE for everyone as requested)
      console.log(`🔄 Syncing central menu (TV-1) to ${franchise_id} ...`);
      const { error: syncError } = await supabase.rpc('clone_franchise_menu', {
        target_id: franchise_id,
        central_id: 'TV-1'
      });

      if (syncError) {
        console.error(`❌ Menu sync failed for ${franchise_id}: ${syncError.message}`);
      } else {
        console.log(`✅ Menu successfully synced!`);
      }

    } catch (err) {
      console.error(`❌ Failed to process user ${emailStr}:`, err.message);
    }
  }
  
  console.log("\n🎉 Bulk user registration completed.");
}

bulkRegister();
