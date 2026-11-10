try {
  process.loadEnvFile();
} catch (e) {}

const PARTNER_TOKEN = process.env.STARLITE_PARTNER_TOKEN;
const PARTNER_COOKIE = process.env.STARLITE_PARTNER_COOKIE;
const authHeader = PARTNER_TOKEN.startsWith('Bearer ') ? PARTNER_TOKEN : `Bearer ${PARTNER_TOKEN}`;
const headers = {
  'Authorization': authHeader,
  'Cookie': PARTNER_COOKIE || '',
  'Accept': 'application/json'
};

const PARTNER_STATION_IDS = {
  "Wadu": "22e3ea03b120584cc7f5f1fc72571f12",
  "Randublatung": "a3371976f338ec30d563cf5ff1bb5ad0",
  "Sulur": "2573f4a2019695eae43dc3ab424fbfcd",
  "Kradenan": "35f1e173a7ed98c3d1fce9353e1e9d91",
  "Brumbung": "a03dd0e8d8f2e878e58c684fbaa64483",
  "Alastua": "e4029158beceeec4420c71ced1ebca9b",
  "Tawang": "972f9a002e04a16e6c423df80e80969c",
  "Kaliwungu": "035f51aa3d54e5e284dd202a04b932c4",
  "Kalibodri": "d027f79d3c452111efc3949dec89a18f",
  "Weleri": "f94232b09359b914871ee59b276711f9",
  "Krengseng": "6e574c1aea5332ef76ef425d07739588"
};

const ids = ['TI565', 'TI576', 'TI648', 'TM404', 'TN129', 'TX404', 'TX450'];
const endpoints = ['active', 'new', 'suspend', 'dismantle'];

async function searchAll() {
  for (const id of ids) {
    console.log(`\n================ Searching ${id} ================`);
    let found = false;

    // 1. Try with sales_partner_id for each station
    for (const [st, pId] of Object.entries(PARTNER_STATION_IDS)) {
      if (found) break;
      for (const ep of endpoints) {
        if (found) break;
        const url = `https://api-mitra.starliteindonesia.com/mitra/customer/${ep}?search=${id}&sales_partner_id=${pId}`;
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const json = await res.json();
          const items = json?.data || [];
          if (items.length > 0) {
            console.log(`✅ FOUND ${id} in [${ep}] at station [${st}]:`);
            console.log(JSON.stringify(items[0], null, 2));
            found = true;
          }
        } catch (e) {}
      }
    }

    // 2. Try WITHOUT sales_partner_id
    if (!found) {
      for (const ep of endpoints) {
        if (found) break;
        const url = `https://api-mitra.starliteindonesia.com/mitra/customer/${ep}?search=${id}`;
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const json = await res.json();
          const items = json?.data || [];
          if (items.length > 0) {
            console.log(`✅ FOUND ${id} in [${ep}] (no partnerId):`);
            console.log(JSON.stringify(items[0], null, 2));
            found = true;
          }
        } catch (e) {}
      }
    }

    if (!found) {
      console.log(`❌ ${id} not found via search param in any endpoint/station.`);
    }
  }
}

searchAll();
