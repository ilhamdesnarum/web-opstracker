const fs = require('fs');

let content = fs.readFileSync('src/mobile.jsx', 'utf8');

// 1. Remove the dynamic dateOptions logic
content = content.replace(/  const dateOptions = useMemo\(\(\) => \{[\s\S]*?\}, \[data\.pelangganData\]\);\n\n  const overviewStats = useMemo\(\(\) => \{/, "  const overviewStats = useMemo(() => {");

// 2. Replace the dropdown rendering logic
const newDropdown = `{['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua Waktu'].map(f => (
                        <div 
                          key={f}
                          onClick={() => { setOverviewDateFilter(f); setIsOverviewDateDropdownOpen(false); }}
                          className={\`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors \${overviewDateFilter === f ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}\`}
                        >
                          {f}
                        </div>
                      ))}
                      <div className="relative px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors text-slate-600 hover:bg-slate-50 flex items-center justify-between">
                        <span>Pilih Bulan Kustom...</span>
                        <Icon name="chevron-right" size={12} className="text-slate-400" />
                        <input 
                          type="month"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m] = e.target.value.split('-');
                              const monthNamesLocal = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                              const label = \`\${monthNamesLocal[parseInt(m, 10)-1]} \${y}\`;
                              setOverviewDateFilter(label);
                              setIsOverviewDateDropdownOpen(false);
                            }
                          }}
                        />
                      </div>`;

content = content.replace(/\{dateOptions\.map\(f => \([\s\S]*?\}\)\}/, newDropdown);

fs.writeFileSync('src/mobile.jsx', content);
console.log("Done");
