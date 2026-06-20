import fs from 'fs';
const data = fs.readFileSync('src/pages/central/central_staff_profiles.jsx', 'utf8');
console.log(data.includes('setProfiles('));
