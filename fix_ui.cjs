const fs = require('fs');

const missingUI = `                    </div>
                  )}
                </div>

                <div className="flex-1 relative">
                  <div 
                    onClick={() => setIsOverviewStationDropdownOpen(!isOverviewStationDropdownOpen)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-600 truncate">{overviewStationFilter}</span>
                    <Icon name="map-pin" size={12} className="text-slate-400 shrink-0" />
                  </div>
                  {isOverviewStationDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {['Semua Stasiun', 'ALASTUA', 'BRUMBUNG', 'KALIBODRI', 'KALIWUNGU', 'KRADENAN', 'KRENGSENG', 'RANDUBLATUNG', 'SEMARANG TAWANG', 'SULUR', 'WADU', 'WELERI'].map(st => (
                        <div 
                          key={st}
                          onClick={() => { setOverviewStationFilter(st); setIsOverviewStationDropdownOpen(false); }}
                          className={\`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors \${overviewStationFilter === st ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}\`}
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg w-10 h-10 flex items-center justify-center text-blue-600 shrink-0 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors">
                  <Icon name="filter" size={14} />
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Icon name="check-circle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.aktivasiSelesai}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">AKTIVASI SELESAI</p>
                  </div>
                </div>
                
                <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Icon name="clock" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.outstanding}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">OUTSTANDING</p>
                  </div>
                </div>

                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <Icon name="trending-up" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.rataRata}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">RATA-RATA/HARI</p>
                  </div>
                </div>

                <div className="bg-white border border-rose-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                    <Icon name="alert-triangle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-slate-800 leading-none">{overviewStats.tingkatKesulitan}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">TINGKAT KESULITAN</p>
                  </div>
                </div>
              </div>

              {/* Tren Aktivasi Chart */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[13px]">Tren Aktivasi</h3>
                    <p className="text-[9px] text-slate-400">Periode {overviewDateFilter}</p>
                  </div>
                </div>

                <div className="h-32 flex items-end justify-between gap-1.5 mt-6 relative">
                  {/* Horizontal Grid lines */}
                  <div className="absolute w-full h-full flex flex-col justify-between z-0 pb-1">
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-slate-200 w-full h-0"></div>
                  </div>

                  {/* SVG, Dots and Bars */}
                  {(() => {
                    const maxVal = Math.max(...overviewStats.trenAktivasi.map(t => t.val), 1);
                    const n = overviewStats.trenAktivasi.length;
                    const points = overviewStats.trenAktivasi.map((pt, i) => {
                      const x = (i * (100 / n)) + (100 / (2 * n));
                      const h = (pt.val / maxVal) * 100;
                      const y = 100 - (h === 0 ? 0 : h); 
                      return { x, y, val: pt.val, h, label: pt.label };
                    });

                    let pathD = "";
                    points.forEach((pt, i) => {
                      if (i === 0) {
                        pathD += \`M \${pt.x},\${pt.y} \`;
                      } else {
                        const prev = points[i-1];
                        const cp1x = prev.x + (pt.x - prev.x) / 2;
                        const cp1y = prev.y;
                        const cp2x = cp1x;
                        const cp2y = pt.y;
                        pathD += \`C \${cp1x},\${cp1y} \${cp2x},\${cp2y} \${pt.x},\${pt.y} \`;
                      }
                    });

                    return (
                      <>
                        <svg className="absolute w-full h-full top-0 left-0 z-30 pointer-events-none drop-shadow-sm" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>

                        <div className="absolute w-full h-full top-0 left-0 z-40 pointer-events-none">
                          {points.map((pt, i) => {
                            const isActive = pt.val > 0 && pt.val === Math.max(...overviewStats.trenAktivasi.map(t => t.val));
                            return (
                              <div key={\`dot-\${i}\`}>
                                {pt.val > 0 && (
                                  <span
                                    className="absolute text-[9px] font-bold text-blue-600 -translate-x-1/2 -translate-y-full drop-shadow-sm"
                                    style={{ left: \`\${pt.x}%\`, top: \`calc(\${pt.y}% - 6px)\` }}
                                  >
                                    {pt.val}
                                  </span>
                                )}
                                <div
                                  className={\`absolute rounded-full -translate-x-1/2 -translate-y-1/2 \${isActive ? 'w-2.5 h-2.5 bg-blue-500 border-2 border-white shadow-sm' : 'w-1.5 h-1.5 bg-white border-[1.5px] border-blue-500'}\`}
                                  style={{ left: \`\${pt.x}%\`, top: \`\${pt.y}%\` }}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
`;

let content = fs.readFileSync('src/mobile.jsx', 'utf8');

const anchor = `                        </div>
                      ))}
                        </div>`;

const endAnchor = `                        {points.map((pt, i) => (`;

const startIndex = content.indexOf(anchor);
const endIndex = content.indexOf(endAnchor);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex + 62) + "\n" + missingUI + "\n" + content.slice(endIndex);
  fs.writeFileSync('src/mobile.jsx', content);
  console.log("Restored!");
} else {
  console.log("Anchor not found");
}
