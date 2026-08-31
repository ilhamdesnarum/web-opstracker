const fs = require('fs');

let content = fs.readFileSync('src/mobile.jsx', 'utf8');

// 1. Insert dateOptions
const dateOptionsLogic = `
  const dateOptions = useMemo(() => {
    const options = ['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua Waktu'];
    if (!data.pelangganData) return options;
    
    const monthSet = new Set();
    data.pelangganData.forEach(p => {
      const tAkt = p.tglAktivasi || p.timestampAktivasi;
      if (tAkt) {
        const d = new Date(standardizeDate(tAkt));
        if (!isNaN(d.getTime())) {
          const mKey = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
          monthSet.add(mKey);
        }
      }
    });
    
    const monthNamesLocal = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    Array.from(monthSet).sort().reverse().forEach(mKey => {
      const [y, m] = mKey.split('-');
      const label = \`\${monthNamesLocal[parseInt(m, 10)-1]} \${y}\`;
      if (!options.includes(label)) {
        options.push(label);
      }
    });
    
    return options;
  }, [data.pelangganData]);

  const overviewStats = useMemo(() => {`;

content = content.replace("  const overviewStats = useMemo(() => {", dateOptionsLogic);

// 2. Update the fallback avg inside overviewStats
const newOverviewDateFilterCheck = `    } else if (overviewDateFilter === 'Semua Waktu') {
      startStr = '';
      endStr = '';
      rangeDays = 30; // fallback avg
      trenAktivasi = []; // will be populated dynamically
    } else {
      // Spesifik Bulan ("Agustus 2026")
      const parts = overviewDateFilter.split(' ');
      if (parts.length === 2) {
        const mIndex = monthNamesLocal.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const y = parseInt(parts[1], 10);
        if (mIndex !== -1 && y) {
          startStr = \`\${y}-\${String(mIndex + 1).padStart(2, '0')}-01\`;
          endStr = getLocalDateStr(new Date(y, mIndex + 1, 0));
          rangeDays = new Date(y, mIndex + 1, 0).getDate();
          trenAktivasi = [
            { label: 'W1', val: 0 }, { label: 'W2', val: 0 }, { label: 'W3', val: 0 },
            { label: 'W4', val: 0 }, { label: 'W5', val: 0 }
          ];
        }
      }
    }`;

content = content.replace(/    \} else if \(overviewDateFilter === 'Semua Waktu'\) \{\s*startStr = '';\s*endStr = '';\s*rangeDays = 30; \/\/ fallback avg\s*trenAktivasi = \[\]; \/\/ will be populated dynamically\s*\}/, newOverviewDateFilterCheck);

// 3. Update the tracking for custom month 
const dynamicMonthsLogic = `          }
          else if (overviewDateFilter === 'Bulan Ini' || overviewDateFilter.match(/^[A-Za-z]+ \\d{4}$/)) {
            const dateNum = tDate.getDate();
            if (dateNum <= 7) trenAktivasi[0].val++;
            else if (dateNum <= 14) trenAktivasi[1].val++;
            else if (dateNum <= 21) trenAktivasi[2].val++;
            else if (dateNum <= 28) trenAktivasi[3].val++;
            else trenAktivasi[4].val++;
          }`;

content = content.replace(/          \}\s*else if \(overviewDateFilter === 'Bulan Ini'\) \{\s*const dateNum = tDate\.getDate\(\);\s*if \(dateNum <= 7\) trenAktivasi\[0\]\.val\+\+;\s*else if \(dateNum <= 14\) trenAktivasi\[1\]\.val\+\+;\s*else if \(dateNum <= 21\) trenAktivasi\[2\]\.val\+\+;\s*else if \(dateNum <= 28\) trenAktivasi\[3\]\.val\+\+;\s*else trenAktivasi\[4\]\.val\+\+;\s*\}/, dynamicMonthsLogic);

// 4. Update the dropdown rendering
const renderDropdownLogic = `{dateOptions.map(f => (
                        <div 
                          key={f}
                          onClick={() => { setOverviewDateFilter(f); setIsOverviewDateDropdownOpen(false); }}
                          className={\`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors \${overviewDateFilter === f ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}\`}
                        >
                          {f}
                        </div>
                      ))}`;

content = content.replace(/\{\['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua Waktu'\]\.map\(f => \([\s\S]*?\}\)\}/, renderDropdownLogic);

// Make the dropdown container scrollable
content = content.replace(/className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"/g, 'className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-[250px] overflow-y-auto"');

fs.writeFileSync('src/mobile.jsx', content);
console.log('Done!');
