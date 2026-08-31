const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec";

const finalBulkData = [{
    idPelanggan: "J0078",
    namaPelanggan: "Sugeng Joko Prantoro",
    stasiun: "Tawang",
    aktivasi: "Kendala",
    ikr: "Kendala",
    issueKendala: "Update Massal Kendala",
    reporterKendala: "Sistem Massal",
    tanggalKendala: "2026-06-26",
    catatan: "Update Massal Kendala"
}];

async function test() {
    try {
        console.log("Sending POST request to Apps Script...");
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updateMassalPelanggan', payload: finalBulkData })
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log("Raw Response:");
        console.log(text);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

test();
