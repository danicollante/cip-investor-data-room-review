/* Local dMRV demonstration. Simulated roles and review state are not access control.
 * Synthetic examples never become real observations. Nothing is published remotely.
 */
'use strict';
window.CIPMonitoring = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value);
  const date = value => value ? new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(value.slice(0,10) + 'T12:00:00Z')) : 'Pending';
  const monthLabel = value => new Intl.DateTimeFormat('en-GB', {month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(value + '-01T12:00:00Z'));
  const labels = {new:'New', confirmed:'Confirmed', false_positive:'False positive', follow_up:'In follow-up'};
  const categories = {fire:'Fire detections', disturbance:'Vegetation disturbance', climate:'Climate context'};
  let snapshot = null, scenario = null, scenarioOn = false, context = null;
  let selectedMonth = null, selectedZone = 'all', reviewFilter = 'all', reviewPage = 0, map = null, generation = 0, controller = null;
  let exampleEvents = null, actualEvents = null;
  let loadedTeam = null, loadGeneration = 0;
  let actualEventsLoaded = false;

  function events() { return scenarioOn ? exampleEvents || [] : actualEvents || []; }
  function released(rows) {
    return rows.filter(row => row.published === true && ['confirmed','false_positive','follow_up'].includes(row.review_status)
      && String(row.note || '').trim() && row.reviewer && row.reviewed_at);
  }
  function selectedEvents(investor = false) {
    return (investor ? released(events()) : events()).filter(row => (!selectedMonth || row.date.startsWith(selectedMonth))
      && (selectedZone === 'all' || row.zone === selectedZone));
  }
  function source(key) { return scenarioOn ? scenario?.[key] || {status:'pending',monthly:[],reason:'Example values unavailable'} : snapshot[key]; }
  function badge(text, style='') { return `<span class="pill ${style}">${esc(text)}</span>`; }
  function missing(title, text) { return `<div class="dmrv-empty"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`; }
  function provenance(key) {
    const data = source(key);
    return `<p class="dmrv-provenance">${scenarioOn && scenario?.[key] ? 'Illustrative values · not observations' : `${esc(data.source)} · ${data.retrieved_at?'Retrieved '+date(data.retrieved_at):'Extraction pending'}`}<br><a href="${esc(snapshot[key].source_url)}" target="_blank" rel="noopener">Source documentation ↗</a></p>`;
  }
  function banner() {
    return `<section class="dmrv-banner" aria-label="Monitoring demonstration status"><div><p>Prototype · automatic, unreviewed signals · data as of 05 October 2026</p><strong>${scenarioOn ? 'DEMO · ILLUSTRATIVE SCENARIO' : 'DEMO · FROZEN SNAPSHOT'}</strong><p>${scenarioOn ? 'All scenario detections, rainfall, NDVI, visits and responses are invented examples. They do not describe conditions at Entooma Sidai.' : 'A local prototype with source status shown for every category. Pending extraction does not mean no incidents.'}</p></div><div class="dmrv-snapshot">Prepared ${date(snapshot.snapshot_date)}<br><span>${monthLabel(snapshot.period.start)} – ${monthLabel(snapshot.period.end)}</span></div></section>`;
  }
  function disclaimer() {
    return `<aside class="dmrv-disclaimer"><strong>Complementary monitoring only.</strong> Open satellite signals support investigation. They do not establish credit quantities, carbon outcomes or a Verra/VVB verification finding. The surrounding zone is a monitoring aid, not a validated leakage area.</aside>`;
  }
  function controls() {
    return `<div class="dmrv-controls"><label class="dmrv-scenario"><input id="dmrv-scenario" type="checkbox" ${scenarioOn?'checked':''}> Use illustrative scenario <span class="pill amber">Demo data</span></label><div class="actions"><a class="button small" href="#/project/entooma-sidai/methodology">Sources & methodology →</a><a class="button small" href="docs/dmrv-investor-annex.html" target="_blank" rel="noopener">Open printable annex ↗</a></div></div>`;
  }
  function timeline() {
    return `<section class="dmrv-timeline" aria-label="Monitoring period"><div><label for="dmrv-month"><strong>Time window</strong></label><output id="dmrv-month-label">${selectedMonth ? monthLabel(selectedMonth) : 'All 12 months'}</output></div><input id="dmrv-month" type="range" min="0" max="12" value="${selectedMonth ? snapshot.months.indexOf(selectedMonth)+1 : 0}" aria-valuetext="${selectedMonth ? monthLabel(selectedMonth) : 'All 12 months'}"><label for="dmrv-zone" class="sr-only">Filter monitoring zone</label><select id="dmrv-zone"><option value="all" ${selectedZone==='all'?'selected':''}>Project + surrounding zone</option><option value="inside" ${selectedZone==='inside'?'selected':''}>Inside provisional perimeter</option><option value="buffer" ${selectedZone==='buffer'?'selected':''}>10 km surrounding zone</option></select><p>Slide to a month to filter charts, events and map together. Rainfall uses a single grid point; the zone filter applies to spatial alerts and NDVI.</p></section>`;
  }
  function bars(key) {
    const data = source(key), rows = data.monthly || [];
    const filtered = selectedMonth ? rows.filter(row => row.month === selectedMonth) : rows;
    const columns = selectedZone === 'all' ? ['inside','buffer'] : [selectedZone];
    const available = rows.some(row => columns.some(column => Number.isFinite(row[column])));
    if (!available) return missing('Extraction pending', snapshot[key].reason);
    const max = Math.max(1, ...rows.flatMap(row => columns.map(column => row[column] ?? 0)));
    const unit = key === 'fire' ? 'detections' : 'ha of alert footprint';
    return `<div class="dmrv-legend"><span><i class="dmrv-dot inside"></i>Inside provisional perimeter</span><span><i class="dmrv-dot buffer"></i>Surrounding zone</span></div><div class="dmrv-bars" role="img" aria-label="Monthly ${esc(categories[key])}. Exact values are in the table below.">${filtered.map(row => `<div class="dmrv-bar-group ${selectedMonth?'selected':''}"><div class="dmrv-bar-pair">${columns.map(column => `<span class="dmrv-bar ${column}" style="height:${row[column] == null ? 0 : Math.max(row[column] ? 3 : 0, row[column]/max*100)}%" title="${esc(row.month)} · ${column}: ${row[column] == null ? 'Unavailable' : number(row[column])+' '+unit}"></span>`).join('')}</div><span>${esc(monthLabel(row.month).split(' ')[0])}</span></div>`).join('')}</div><details class="dmrv-data-table"><summary>View monthly values (${unit})</summary><table><caption class="sr-only">${esc(categories[key])} ${unit}</caption><thead><tr><th scope="col">Month</th>${columns.map(column=>`<th scope="col">${column==='inside'?'Inside':'Surrounding zone'}</th>`).join('')}</tr></thead><tbody>${filtered.map(row=>`<tr><th scope="row">${monthLabel(row.month)}</th>${columns.map(column=>`<td>${row[column] == null ? 'Unavailable' : number(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  }
  function fireChart() {
    // Keep the pre-existing illustrative series and review examples unchanged.
    if(scenarioOn)return bars('fire');
    const data=source('fire');
    if(data.monthly?.length&&!data.monthly.some(row=>row.zone))return bars('fire'); // Legacy attested CSV schema.
    const zones=selectedZone==='all'?['project','ring_10km']:[selectedZone==='inside'?'project':'ring_10km'];
    const months=selectedMonth?[selectedMonth]:snapshot.months;
    const rows=(data.monthly||[]).filter(row=>months.includes(row.month)&&zones.includes(row.zone));
    if(!rows.length)return missing('Fire extraction pending',data.reason);
    const max=Math.max(1,...rows.map(row=>row.distinct_cell_days??0));
    const x=i=>months.length===1?300:55+i*510/(months.length-1), y=v=>155-v/max*125;
    const name=zone=>zone==='project'?'Provisional perimeter':'10 km surrounding ring';
    const value=v=>v==null?'Unavailable':number(v);
    const rowFor=(month,zone)=>rows.find(row=>row.month===month&&row.zone===zone);
    const line=zone=>months.map((month,i)=>{
      const row=rowFor(month,zone),previous=i?rowFor(months[i-1],zone):null;
      return Number.isFinite(row?.distinct_cell_days)?`${i===0||!Number.isFinite(previous?.distinct_cell_days)?'M':'L'}${x(i)},${y(row.distinct_cell_days)}`:'';
    }).join(' ');
    return `<div class="dmrv-legend">${zones.map(zone=>`<span><i class="dmrv-dot ${zone==='project'?'inside':'buffer'}"></i>${name(zone)}</span>`).join('')}</div><svg class="dmrv-line-chart dmrv-fire-chart" viewBox="0 0 600 205" role="img" aria-label="Monthly distinct 375 m cell-days with detections for selected zones and time window.">${[0,.5,1].map(t=>`<line x1="55" x2="565" y1="${y(max*t)}" y2="${y(max*t)}" stroke="#e3e7dd"/><text x="43" y="${y(max*t)+4}" text-anchor="end">${number(max*t)}</text>`).join('')}<text x="55" y="14">Distinct cell-days · 375 m analysis grid</text>${zones.map(zone=>`<path data-fire-series="${zone}" d="${line(zone)}" fill="none" stroke="${zone==='project'?'#55752d':'#bd871a'}" stroke-width="2.5" ${zone==='ring_10km'?'stroke-dasharray="5 3"':''}/>${months.map((month,i)=>{const row=rowFor(month,zone);return Number.isFinite(row?.distinct_cell_days)?`<circle data-fire-zone="${zone}" cx="${x(i)}" cy="${y(row.distinct_cell_days)}" r="4" fill="${zone==='project'?'#55752d':'#bd871a'}"><title>${esc(monthLabel(month))} · ${name(zone)} · ${value(row.distinct_cell_days)} cell-days</title></circle>`:'';}).join('')}`).join('')}${months.map((month,i)=>`<text x="${x(i)}" y="184" text-anchor="middle">${esc(monthLabel(month).split(' ')[0])}</text>`).join('')}</svg><details class="dmrv-data-table" ${selectedMonth?'open':''}><summary>View fire cell-days, detection days, satellite counts and density</summary><div class="dmrv-table-scroll"><table><caption class="sr-only">Automatic unreviewed FIRMS · selected months and zones</caption><thead><tr><th scope="col">Month</th><th scope="col">Zone</th><th scope="col">Cell-days</th><th scope="col">Days with detections</th><th scope="col">Detections</th><th scope="col">S-NPP</th><th scope="col">NOAA-20</th><th scope="col">NOAA-21</th><th scope="col">Cell-days / 1,000 km²</th><th scope="col">Completeness</th></tr></thead><tbody>${rows.map(row=>`<tr data-fire-row="${esc(row.month)}-${esc(row.zone)}"><th scope="row">${monthLabel(row.month)}</th><td>${name(row.zone)}</td><td>${value(row.distinct_cell_days)}</td><td>${value(row.days_with_detection)}</td><td>${value(row.detections_total)}</td>${['SNPP','NOAA20','NOAA21'].map(sat=>`<td>${value(row.detections_by_satellite?.[sat])}</td>`).join('')}<td>${value(row.cell_days_per_1000_km2)}</td><td>${esc(row.completion_status)}${row.reason?' · '+esc(row.reason):''}</td></tr>`).join('')}</tbody></table></div></details><p class="small muted">Density uses cell-days × 1,000 / zone area in km² from this snapshot. Areas are provisional: perimeter ${number(snapshot.boundary.area_ha/100)} km²; ring ${number(snapshot.boundary.buffer_area_ha/100)} km². Cell-days count each 375 m grid cell once per UTC date across satellites and passes; the grid is an analysis convention, not a native VIIRS footprint.</p><p class="small muted">${esc(data.processing_note)} No filter by provider type or confidence.</p>`;
  }
  function rainfallChart() {
    const data = source('climate'), rows = data.monthly || [];
    if (!rows.some(row => Number.isFinite(row.precip_mm))) return missing('Rainfall extraction pending', snapshot.climate.reason);
    const filtered = selectedMonth ? rows.filter(row=>row.month===selectedMonth) : rows;
    const maximum = Math.max(1,...rows.flatMap(row=>[row.precip_mm||0,row.baseline_mm||0]));
    const x = index => 45 + index * (510 / Math.max(1, rows.length-1));
    const y = value => 155 - value / maximum * 125;
    const line = field => rows.map((row,index) => Number.isFinite(row[field]) ? `${index === 0 || !Number.isFinite(rows[index-1]?.[field]) ? 'M' : 'L'}${x(index)},${y(row[field])}` : '').join(' ');
    return `<div class="dmrv-legend"><span><i class="dmrv-dot inside"></i>Monthly rainfall</span><span><i class="dmrv-dot baseline"></i>1991–2020 seasonal mean</span></div><svg class="dmrv-line-chart" viewBox="0 0 590 200" role="img" aria-label="Monthly rainfall against the seasonal baseline. Exact values are in the table below.">${[0,.5,1].map(t=>`<line x1="45" x2="560" y1="${y(maximum*t)}" y2="${y(maximum*t)}" stroke="#e3e7dd"/><text x="36" y="${y(maximum*t)+4}" text-anchor="end">${Math.round(maximum*t)}</text>`).join('')}<path d="${line('baseline_mm')}" fill="none" stroke="#939b91" stroke-width="2" stroke-dasharray="5 5"/><path d="${line('precip_mm')}" fill="none" stroke="#55752d" stroke-width="2.5"/>${rows.map((row,index)=>`${Number.isFinite(row.precip_mm)?`<circle cx="${x(index)}" cy="${y(row.precip_mm)}" r="${row.month===selectedMonth?6:3}" fill="#55752d"/>`:''}<text x="${x(index)}" y="183" text-anchor="middle">${monthLabel(row.month).split(' ')[0]}</text>`).join('')}<text x="45" y="14">mm/month</text></svg><details class="dmrv-data-table" ${selectedMonth?'open':''}><summary>View rainfall, baseline and anomaly</summary><table><thead><tr><th scope="col">Month</th><th scope="col">Rainfall mm</th><th scope="col">Baseline mm</th><th scope="col">Anomaly</th></tr></thead><tbody>${filtered.map(row=>`<tr><th scope="row">${monthLabel(row.month)}</th><td>${row.precip_mm==null?'Unavailable':number(row.precip_mm)}</td><td>${number(row.baseline_mm)}</td><td>${row.anomaly_pct==null?'Not assessed':(row.anomaly_pct>0?'+':'')+number(row.anomaly_pct)+'%'}</td></tr>`).join('')}</tbody></table></details><p class="small muted">Grid-point climate context, not a project-wide rainfall estimate or a validated drought classification. Missing source months stay unavailable.</p>`;
  }
  function ndviChart() {
    const data=source('vegetation');
    const zones=selectedZone==='all'?['project','ring_10km']:[selectedZone==='inside'?'project':'ring_10km'];
    const months=selectedMonth?[selectedMonth]:snapshot.months;
    const rows=(data.monthly||[]).filter(row=>months.includes(row.month)&&zones.includes(row.zone));
    if(!rows.length)return missing('NDVI extraction pending',data.reason||'No compatible monthly results available.');
    const value=v=>v==null?'Unavailable':new Intl.NumberFormat('en-US',{minimumFractionDigits:4,maximumFractionDigits:4}).format(v);
    const percent=v=>v==null?'Unavailable':new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v)+'%';
    const zoneName=zone=>zone==='project'?'Provisional perimeter':'10 km surrounding ring';
    const x=i=>months.length===1?300:55+i*510/(months.length-1), y=v=>155-(v+1)*62.5;
    const rowFor=(month,zone)=>rows.find(row=>row.month===month&&row.zone===zone);
    const line=zone=>months.map((month,i)=>{
      const row=rowFor(month,zone),previous=i?rowFor(months[i-1],zone):null;
      return Number.isFinite(row?.median)?`${i===0||!Number.isFinite(previous?.median)?'M':'L'}${x(i)},${y(row.median)}`:'';
    }).join(' ');
    return `<div class="dmrv-legend">${zones.map(zone=>`<span><i class="dmrv-dot ${zone==='project'?'inside':'buffer'}"></i>${zoneName(zone)}</span>`).join('')}</div><svg class="dmrv-line-chart dmrv-ndvi-chart" viewBox="0 0 600 205" role="img" aria-label="Monthly median NDVI for selected zones and time window. Exact values and valid coverage are in the expandable table.">${[-1,-.5,0,.5,1].map(t=>`<line x1="55" x2="565" y1="${y(t)}" y2="${y(t)}" stroke="#e3e7dd"/><text x="43" y="${y(t)+4}" text-anchor="end">${t.toFixed(1)}</text>`).join('')}<text x="55" y="14">NDVI · dimensionless</text>${zones.map(zone=>`<path data-ndvi-series="${zone}" d="${line(zone)}" fill="none" stroke="${zone==='project'?'#55752d':'#bd871a'}" stroke-width="2.5" ${zone==='ring_10km'?'stroke-dasharray="5 3"':''}/>${months.map((month,i)=>{const row=rowFor(month,zone);return Number.isFinite(row?.median)?`<circle data-ndvi-zone="${zone}" cx="${x(i)}" cy="${y(row.median)}" r="4" fill="${zone==='project'?'#55752d':'#bd871a'}"><title>${esc(monthLabel(month))} · ${zoneName(zone)} · ${value(row.median)}</title></circle>`:'';}).join('')}`).join('')}${months.map((month,i)=>`<text x="${x(i)}" y="184" text-anchor="middle">${esc(monthLabel(month).split(' ')[0])}</text>`).join('')}</svg><details class="dmrv-data-table" ${selectedMonth?'open':''}><summary>View NDVI median, quartiles and valid coverage</summary><div class="dmrv-table-scroll"><table><caption class="sr-only">${scenarioOn?'Example values':'Automatic unreviewed NDVI'} · selected months and zones</caption><thead><tr><th scope="col">Month</th><th scope="col">Zone</th><th scope="col">Median</th><th scope="col">P25</th><th scope="col">P75</th><th scope="col">Valid pixels</th><th scope="col">Reason</th></tr></thead><tbody>${rows.map(row=>`<tr data-ndvi-row="${esc(row.month)}-${esc(row.zone)}"><th scope="row">${monthLabel(row.month)}</th><td>${zoneName(row.zone)}</td><td>${value(row.median)}</td><td>${value(row.p25)}</td><td>${value(row.p75)}</td><td>${percent(row.valid_pixel_pct)}</td><td>${esc(row.reason||'—')}</td></tr>`).join('')}</tbody></table></div></details><p class="small muted">${scenarioOn?'Synthetic demonstration · Example values.':'250 m aggregation · monthly temporal median per pixel · ORBIT mosaicking.'} Coverage threshold: 30% (assumption). Valid coverage means at least one valid observation per pixel during the month. No seasonal baseline.</p>`;
  }
  function vegetationCard() {
    return `<section class="panel dmrv-vegetation" aria-labelledby="dmrv-vegetation-title"><div class="dmrv-panel-title"><h3 id="dmrv-vegetation-title">Vegetation vigor (NDVI)</h3>${badge(scenarioOn?'Example values':'Automatic · unreviewed',scenarioOn?'amber':'outline')}</div>${ndviChart()}<p class="small muted">NDVI measures vegetation vigor; it does not establish biomass, carbon or grazing compliance. No seasonal baseline yet; read alongside rainfall.</p>${provenance('vegetation')}</section>`;
  }
  function sourceReadiness() {
    return `<section class="panel dmrv-source-readiness"><h3>Source readiness</h3><p class="small muted">Frozen source snapshot · extraction status only; no risk classification.</p><table><thead><tr><th scope="col">Signal</th><th scope="col">Source status</th></tr></thead><tbody>${['fire','disturbance','climate','vegetation'].map(key=>`<tr><th scope="row">${key==='vegetation'?'NDVI':key==='fire'?'Fire':categories[key]}</th><td>${esc(snapshot[key].source_readiness|| (snapshot[key].status==='pending'?'Extraction pending':'Source available · automatic, not reviewed'))}</td></tr>`).join('')}</tbody></table></section>`;
  }
  function technical() {
    const count = selectedEvents().length;
    return `<div class="section-heading"><div><h2>Monitoring workspace</h2><p>Observe signals, investigate context, and prepare a reviewed investor narrative.</p></div>${badge('CIP team · simulated','outline')}</div>${timeline()}<div class="dmrv-metrics">${['fire','disturbance','climate'].map(key=>`<article class="dmrv-metric"><span>${categories[key]}</span><strong>${scenarioOn?'Illustrative':source(key).status==='pending'?'Data pending':source(key).status==='partial'?'Partial coverage':'Source available'}</strong><small>${key==='climate'?'Automatic context · human review pending':'Raw signals · no risk classification'}</small></article>`).join('')}</div>${mapMarkup(count)}<div class="dmrv-chart-grid"><section class="panel dmrv-fire" aria-labelledby="dmrv-fire-title"><div class="dmrv-panel-title"><h3 id="dmrv-fire-title">Fire detections</h3>${badge(scenarioOn?'Example values':'Automatic · unreviewed',scenarioOn?'amber':'outline')}</div>${fireChart()}<p class="small muted">Satellite detections, not unique fires, burned area or risk. Rangeland burning can be pastoral or managed; detections are signals for review.</p>${provenance('fire')}</section><section class="panel"><div class="dmrv-panel-title"><h3>Vegetation disturbance</h3>${badge(scenarioOn?'Example values':'Integrated alerts',scenarioOn?'amber':'outline')}</div>${bars('disturbance')}<p class="small muted">Alert footprint is an investigation signal, not confirmed deforestation or a carbon-loss estimate.</p>${provenance('disturbance')}</section><section class="panel"><div class="dmrv-panel-title"><h3>Rainfall & seasonal context</h3>${badge(scenarioOn?'Example values':source('climate').status==='pending'?'Pending':'Source data',scenarioOn?'amber':'outline')}</div>${rainfallChart()}${provenance('climate')}</section>${vegetationCard()}</div>${reviewQueue()}${fieldSection()}`;
  }
  function mapMarkup(count) {
    return `<section class="map-panel dmrv-map-panel" aria-labelledby="dmrv-map-title"><div class="map-panel-head"><div><div class="eyebrow">Spatial monitoring context</div><h2 id="dmrv-map-title">Provisional perimeter & surrounding zone</h2><p>${scenarioOn?number(count)+' illustrative detections in the selected window':snapshot.fire.status==='pending'?'Source detections not loaded · extraction pending':!actualEventsLoaded?'Point data unavailable · monthly aggregates shown below':number(count)+' loaded source detections in the selected window'} · coordinates show detections, not affected polygons.</p></div>${badge('Perimeter provisional','amber')}</div><div class="dmrv-map-stage"><div id="dmrv-map" role="region" aria-label="Provisional project perimeter, 10 km surrounding monitoring ring and selected detections"></div><p id="dmrv-map-status" class="dmrv-map-status" role="status">Loading geographic context…</p></div><div class="dmrv-map-legend"><span><i class="dmrv-dot inside"></i>Perimeter on file</span><span><i class="dmrv-dot buffer"></i>10 km surrounding zone</span><span><i class="dmrv-dot fire"></i>Fire detection</span>${scenarioOn?'<span><i class="dmrv-dot disturbance"></i>Disturbance example</span>':''}<button class="button small" type="button" id="dmrv-map-reset">Reset map view</button></div></section>`;
  }
  function reviewQueue() {
    if(!scenarioOn)return `<section class="dmrv-review" aria-labelledby="dmrv-review-title"><div class="section-heading"><div><h2 id="dmrv-review-title">Review queue</h2><p>Review controls are disabled for real observations in this demo.</p></div>${badge('Automatic · unreviewed','outline')}</div>${missing('Illustrative review only','Switch on the illustrative scenario to test the review queue. Real FIRMS observations remain unreviewed; no release or review changes can be made here.')}</section>`;
    const all = selectedEvents();
    const filtered = all.filter(row=>reviewFilter==='all'||row.review_status===reviewFilter).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
    const pageCount=Math.max(1,Math.ceil(filtered.length/8));reviewPage=Math.min(reviewPage,pageCount-1);
    const rows=filtered.slice(reviewPage*8,reviewPage*8+8);
    return `<section class="dmrv-review" aria-labelledby="dmrv-review-title"><div class="section-heading"><div><h2 id="dmrv-review-title">Review queue</h2><p>${scenarioOn?'Synthetic examples for testing the review flow.':'Source detections await human interpretation.'} Changes stay in memory and reset on reload.</p></div><label><span class="sr-only">Filter by review state</span><select id="dmrv-review-filter">${[['all','All review states'],...Object.entries(labels)].map(([value,label])=>`<option value="${value}" ${reviewFilter===value?'selected':''}>${label}</option>`).join('')}</select></label></div>${!rows.length?missing(scenarioOn?'No examples in this filter':'No source events loaded',scenarioOn?'Choose another month, zone or review state.':'The real FIRMS and disturbance extractions are pending. Switch on the illustrative scenario to test review and investor presentation.'):`<div class="dmrv-event-list">${rows.map(row=>`<article class="dmrv-event"><div class="dmrv-event-head"><div><strong>${row.category==='fire'?'Fire detection':'Vegetation disturbance'}</strong><p>${date(row.date)} · ${row.zone==='inside'?'Inside provisional perimeter':'10 km surrounding zone'} · ${esc(row.id)}</p></div>${badge(labels[row.review_status],row.review_status==='new'?'amber':'outline')}</div><p>${row.note?esc(row.note):'Awaiting interpretation and a response note.'}</p><div class="dmrv-event-foot"><span>${row.sample_data?'Synthetic example':'NASA FIRMS source observation'} · ${row.published?'Included in investor demo':'Internal demo only'}</span>${row.sample_data?`<button type="button" class="button small" data-dmrv-review="${esc(row.id)}">Review example →</button>`:'<span class="small muted">Real-event review requires an approved internal workflow.</span>'}</div></article>`).join('')}</div><div class="dmrv-pagination"><span>${reviewPage*8+1}–${Math.min((reviewPage+1)*8,filtered.length)} of ${filtered.length} detections · newest first</span><div class="actions"><button type="button" class="button small" data-dmrv-page="-1" ${reviewPage===0?'disabled':''}>← Previous</button><button type="button" class="button small" data-dmrv-page="1" ${reviewPage===pageCount-1?'disabled':''}>Next →</button></div></div>`}<p class="dmrv-provenance">Provider confidence and human review state are different. “Confirmed” here means a simulated CIP review, not certification.</p></section>`;
  }
  function fieldSection() {
    return `<section class="panel dmrv-field"><div class="dmrv-panel-title"><h3>Field evidence</h3>${badge('Sample data · no KoBo connection','amber')}</div><p>Illustrative visit cards show how field evidence could support a review. No actual visits, survey counts, photos or personal locations have been imported.</p><div class="dmrv-field-cards"><article><strong>Example · rangeland visit</strong><p>Draft checklist: grazing pressure, ground cover and a consent-cleared location record.</p><span class="small muted">Planned source: KoBoToolbox</span></article><article><strong>Example · alert follow-up</strong><p>Draft checklist: local context, response taken, evidence reference and reviewer.</p><span class="small muted">Example content only · no observation date</span></article></div></section>`;
  }
  function investor() {
    const rows = released(events());
    return `<nav class="dmrv-chapters" aria-label="Integrity narrative"><a href="#/project/entooma-sidai/overview">01 · The project →</a><span aria-current="step">02 · Monitoring</span><a href="#dmrv-field-evidence" data-dmrv-anchor="dmrv-field-evidence">03 · Field</a><a href="#/project/entooma-sidai/documents">04 · Documents →</a></nav><section class="dmrv-investor-intro"><div class="eyebrow">Integrity & risk · demonstration</div><h2>Evidence of monitoring and response</h2><p>${scenarioOn?'This scenario demonstrates how reviewed signals could be explained to investors. All observations and responses below are synthetic.':'This snapshot documents the monitoring design and source readiness. No monitoring alert has been reviewed and released for investors.'}</p></section><div class="dmrv-risk-grid">${['fire','disturbance','climate'].map(key=>`<article class="panel dmrv-risk"><h3>${categories[key]}</h3><strong><i class="dmrv-dot unassessed"></i>${scenarioOn?'Illustrative review':'Not assessed'}</strong><p>${scenarioOn?key==='climate'?'Example rainfall context; no validated drought finding.':`${rows.filter(row=>row.category===key).length} reviewed example response${rows.filter(row=>row.category===key).length===1?'':'s'} included in this demo.`:'A category-level risk conclusion requires adequate source coverage and an authorized review.'}</p><small>${scenarioOn?'Example scenario · no real risk rating':source(key).retrieved_at?'Source retrieved '+date(source(key).retrieved_at)+' · conclusion pending':'Source extraction pending'}<br>Snapshot prepared ${date(snapshot.snapshot_date)}</small></article>`).join('')}</div>${sourceReadiness()}<section class="dmrv-released" aria-labelledby="dmrv-released-title"><div class="section-heading"><div><h2 id="dmrv-released-title">Reviewed responses</h2><p>Only reviewed records with an explanation and explicit inclusion appear here.</p></div>${badge(scenarioOn?'Illustrative responses':'No released observations',scenarioOn?'amber':'outline')}</div>${rows.length?rows.map(row=>`<article class="dmrv-event"><div class="dmrv-event-head"><div><strong>${esc(categories[row.category])}</strong><p>${date(row.date)} · ${row.zone==='inside'?'Inside provisional perimeter':'10 km surrounding zone'}</p></div>${badge(labels[row.review_status],'outline')}</div><p>${esc(row.note)}</p><p class="dmrv-provenance">${row.sample_data?'Synthetic observation and response':'Source observation'} · ${esc(row.reviewer)} · Review ${date(row.reviewed_at)}</p></article>`).join(''):missing('Awaiting reviewed evidence', 'No investor risk conclusion is implied. Pending data, unreviewed detections and internal notes are excluded from this presentation.')}</section><section class="panel dmrv-field" id="dmrv-field-evidence"><h3>Field evidence supports interpretation</h3><p>Future field visits would link each response to a consent-cleared observation, photo or survey. No verified field evidence has been connected to this demonstration.</p>${badge('KoBoToolbox connection planned','outline')}</section><section class="panel dmrv-document-panel"><h3>Follow the evidence</h3><p>The existing document index provides the project context and citation records. Original secure file delivery remains simulated.</p><div class="actions"><a class="button small" href="#/project/entooma-sidai/documents">Project document index →</a><a class="button small" href="#/project/entooma-sidai/documents?citation=boundary">Boundary provenance →</a><a class="button small" href="#/project/entooma-sidai/methodology">Monitoring methodology →</a></div></section>`;
  }
  function methodology({team}) {
    return `${banner()}<div class="section-heading"><div><h2>Sources & methodology</h2><p>English reference for the demonstration and the proposed operating model.</p></div><a class="button small" href="#/project/entooma-sidai/monitoring">Back to monitoring →</a></div><section class="panel dmrv-method"><h3>Evidence status</h3><p>A snapshot preparation date is not an observation date. Each source carries its own retrieval date and coverage. A missing extraction is displayed as pending; it never becomes a zero or a green risk rating.</p><p>The shapefile-derived perimeter remains provisional. The 10 km ring is calculated in a local azimuthal equidistant projection, with the project polygon removed. It is an operational screening zone, not a methodology-approved leakage boundary.</p><div class="dmrv-table-scroll"><table><caption>Sources and proposed refresh cadence</caption><thead><tr><th scope="col">Signal</th><th scope="col">Source & interpretation</th><th scope="col">Proposed cadence</th></tr></thead><tbody><tr><th scope="row">Fire</th><td><a href="https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html" target="_blank" rel="noopener">NASA FIRMS VIIRS ↗</a>. 12 months extracted, automatic, not reviewed. Retrieved 6 October 2026. Main series: distinct 375 m cell-days per UTC month and zone. Density uses provisional snapshot areas. S-NPP/NOAA-20: SP through June, NRT from July; NOAA-21: NRT throughout. No type or confidence filter. Real point events are team-only and review controls are disabled.</td><td>Daily acquisition; human triage as needed.</td></tr><tr><th scope="row">Disturbance</th><td><a href="https://globalnaturewatch.org/blog/data-and-tools/integrated-deforestation-alerts/" target="_blank" rel="noopener">Integrated disturbance alerts ↗</a>. GLAD-L, GLAD-S2, RADD and DIST-ALERT. Version, coverage, repeated-event handling and pixel footprint must be recorded.</td><td>Weekly acquisition and review.</td></tr><tr><th scope="row">Rainfall</th><td><a href="https://power.larc.nasa.gov/docs/services/api/temporal/monthly/" target="_blank" rel="noopener">NASA POWER PRECTOTCORR ↗</a>. Daily mean in mm/day × days in the month. Same-month mean of 1991–2020 totals. Single centroid-point proxy; unavailable months remain null.</td><td>Monthly after source availability.</td></tr><tr><th scope="row">Vegetation</th><td><a href="https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html" target="_blank" rel="noopener">Sentinel-2 L2A ↗</a>. 12 months extracted at 250 m, unreviewed, no baseline. Retrieved 5 October 2026. Monthly median of valid observations per pixel with ORBIT mosaicking; spatial median, quartiles and valid-pixel coverage for the provisional perimeter and 10 km ring. The 30% coverage threshold is an assumption. Automatic series are shown to the team only.</td><td>Monthly; land-cover context annually.</td></tr><tr><th scope="row">Field</th><td><a href="https://support.kobotoolbox.org/api.html" target="_blank" rel="noopener">KoBoToolbox ↗</a>. Sample cards only. Consent and evidence validation before reuse.</td><td>After a visit; reconciliation weekly.</td></tr></tbody></table></div><h3>Proposed update and release flow</h3><ol class="dmrv-flow"><li><strong>Acquire & preserve</strong><span>Archive source responses, requested periods, versions and checksums.</span></li><li><strong>Validate & intersect</strong><span>Check coverage, geometry, units and duplicate observations; retain missing data.</span></li><li><strong>Human review</strong><span>Record the interpretation, evidence, reviewer and response. Provider confidence stays separate.</span></li><li><strong>Approve release</strong><span>Approve a contextual investor summary. A review state alone does not authorize release.</span></li><li><strong>Publish a version</strong><span>Release a sanitized artifact, dates and limitations; keep internal notes in restricted storage.</span></li></ol><p>These cadences and responsibilities are proposals. This demo has no scheduled pipeline, real permissions, KoBo connection, durable review log or automatic publication. Review controls affect synthetic examples in browser memory only.</p><h3>Risk interpretation</h3><p>Risk thresholds and responsible reviewers have not been approved. Categories remain “Not assessed”. A false-positive review on one detection is not an overall low-risk conclusion. A confirmed signal does not quantify carbon loss.</p><div class="actions"><a class="button small" href="docs/dmrv-methodology.md" download>Download technical documentation</a><a class="button small" href="docs/dmrv-investor-annex.html" target="_blank" rel="noopener">Open printable investor annex ↗</a><a class="button small" href="${team?'data/monitoring/entooma-sidai.json':'data/monitoring/investor-source-readiness.json'}" download>${team?'Download frozen source snapshot':'Download source readiness'}</a></div></section>${disclaimer()}`;
  }
  function markup({team, method=false}) {
    if (!snapshot) return missing('Monitoring could not load', 'The data room is available. Please reload to retry the monitoring snapshot.');
    if (method) return methodology({team});
    return `<div class="dmrv-module">${banner()}${controls()}<div class="issue dmrv-boundary"><span class="issue-icon" aria-hidden="true">△</span><div><strong>Provisional perimeter: 652,022 ha on file; 500,000 ha confirmed.</strong><p>CIP’s confirmed project area is ${number(snapshot.boundary.confirmed_area_ha)} ha. Spatial screening uses the shapefile-derived geometry on file; a corrected perimeter is pending. <a href="#/project/entooma-sidai/documents?citation=boundary">View boundary provenance →</a></p></div></div><div id="dmrv-content">${team?technical():investor()}</div>${disclaimer()}</div>`;
  }
  function unmount() {
    generation++;
    controller?.abort(); controller = null;
    if (map) {map.remove();map=null;}
  }
  async function mount(ctx) {
    unmount(); context=ctx;
    const token=generation;
    controller=new AbortController(); const signal=controller.signal;
    document.getElementById('dmrv-scenario')?.addEventListener('change', event=>{
      scenarioOn=event.target.checked;
      selectedMonth=null;selectedZone='all';reviewFilter='all';reviewPage=0;
      context.rerender();
    }, {signal});
    function refreshContent() {
      const content=document.getElementById('dmrv-content');
      const activeId=document.activeElement?.id;
      if(map){map.remove();map=null;}
      content.innerHTML=context.team?technical():investor();
      bindFilters(); drawMap(token);
      if(activeId)document.getElementById(activeId)?.focus({preventScroll:true});
      document.getElementById('announcer').textContent=`Monitoring window: ${selectedMonth?monthLabel(selectedMonth):'all 12 months'}. ${selectedEvents().length} detections.`;
    }
    function bindFilters() {
      document.getElementById('dmrv-month')?.addEventListener('change',event=>{selectedMonth=Number(event.target.value) ? snapshot.months[Number(event.target.value)-1] : null; reviewPage=0;refreshContent();}, {signal});
      document.getElementById('dmrv-zone')?.addEventListener('change',event=>{selectedZone=event.target.value;reviewPage=0;refreshContent();}, {signal});
      document.getElementById('dmrv-review-filter')?.addEventListener('change',event=>{reviewFilter=event.target.value;reviewPage=0;refreshContent();}, {signal});
    }
    document.getElementById('main').addEventListener('click',event=>{
      const button=event.target.closest('[data-dmrv-review]');
      if(button && context.team) openReview(button.dataset.dmrvReview, refreshContent);
      const pager=event.target.closest('[data-dmrv-page]');
      if(pager && context.team){reviewPage+=Number(pager.dataset.dmrvPage);refreshContent();document.getElementById('dmrv-review-title')?.scrollIntoView({block:'start'});}
      const anchor=event.target.closest('[data-dmrv-anchor]');
      if(anchor){event.preventDefault();document.getElementById(anchor.dataset.dmrvAnchor)?.scrollIntoView({behavior:'auto',block:'start'});}
    }, {signal});
    bindFilters(); await drawMap(token);
  }
  async function drawMap(token) {
    const target=document.getElementById('dmrv-map');
    if(!target)return;
    if(!window.L){document.getElementById('dmrv-map-status').textContent='Interactive map unavailable; source files remain accessible in the methodology.';return;}
    try {
      const response=await fetch(snapshot.boundary.buffer_file);
      if(!response.ok)throw Error('Buffer file unavailable');
      const buffer=await response.json();
      if(token!==generation || !target.isConnected)return;
      if(map){map.remove();map=null;}
      map=L.map(target,{scrollWheelZoom:false,preferCanvas:true});
      const status=document.getElementById('dmrv-map-status');
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
      tiles.on('tileerror',()=>{if(status.isConnected)status.textContent='Basemap unavailable; local perimeter and monitoring ring remain visible.';});
      tiles.addTo(map);
      L.geoJSON(buffer,{style:{color:'#bd871a',weight:1.5,dashArray:'5 5',fillColor:'#dcad45',fillOpacity:.10}}).addTo(map);
      const perimeter=L.geoJSON(context.geo,{style:{color:'#55752d',weight:2,fillColor:'#769841',fillOpacity:.15}}).addTo(map);
      const bounds=perimeter.getBounds();map.fitBounds(bounds.pad(.15));
      for(const row of selectedEvents()) {
        if(!Number.isFinite(row.lat)||!Number.isFinite(row.lon))continue;
        const node=document.createElement('div');node.textContent=row.sample_data?`SYNTHETIC EXAMPLE · ${categories[row.category]} · ${date(row.date)} · ${labels[row.review_status]}`:`Automatic · unreviewed · ${categories[row.category]} · ${date(row.date)}`;
        const marker=L.circleMarker([row.lat,row.lon],row.sample_data?{radius:6,color:row.category==='fire'?'#b95230':'#8a598c',fillOpacity:.8,weight:2}:{radius:selectedMonth?4.5:3,color:'#b95230',fillOpacity:selectedMonth ? .45 : .25,opacity:selectedMonth ? .75 : .4,weight:selectedMonth?1:.7}).bindTooltip(node);
        if(!row.sample_data){
          const products=[...new Set((row.provenance||[]).map(p=>p.product+' ('+p.processing+')'))].join(', ');
          marker.bindPopup(`<strong>Automatic · unreviewed</strong><br>${esc(row.acquired_at_utc)}<br>Satellite: ${esc(row.satellite)}<br>Product: ${esc(products)}<br>Provider confidence: ${esc(row.source_confidence)}<br><small>NASA FIRMS VIIRS 375 m · provider confidence is separate from CIP review. Review disabled in this demo.</small>`);
        }
        marker.addTo(map);
      }
      status.textContent=scenarioOn?'Synthetic event markers · local geographic layers':'Local geographic layers · '+(snapshot.fire.status==='pending'?'source event extraction pending':!actualEventsLoaded?'FIRMS point data unavailable; no absence of detections inferred':'loaded source detections only');
      document.getElementById('dmrv-map-reset').onclick=()=>map?.fitBounds(bounds.pad(.15));
      requestAnimationFrame(()=>map?.invalidateSize());
    } catch(error) {
      if(token===generation && document.getElementById('dmrv-map-status'))document.getElementById('dmrv-map-status').textContent='Monitoring map could not load. Boundary provenance remains available.';
    }
  }
  function openReview(id, refresh) {
    if(!scenarioOn)return;
    const row=exampleEvents.find(row=>row.id===id);if(!row||!row.sample_data)return;
    const dialog=document.getElementById('dialog');
    const returnButton=document.querySelector(`[data-dmrv-review="${id}"]`);
    dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">Review an illustrative alert</h2><button type="button" class="icon-button" id="dmrv-review-close" aria-label="Close review">×</button></div><form id="dmrv-review-form"><div class="dialog-body"><div class="disclosure">Synthetic example. Saving affects this local browser session only; no real assessment or publication occurs.</div><p>${esc(row.id)} · ${date(row.date)} · ${row.zone==='inside'?'Inside provisional perimeter':'Surrounding zone'}</p><label class="field" for="dmrv-review-state">Review state</label><select id="dmrv-review-state" name="state">${Object.entries(labels).map(([value,label])=>`<option value="${value}" ${row.review_status===value?'selected':''}>${label}</option>`).join('')}</select><label class="field" for="dmrv-review-note">Interpretation & response note</label><textarea id="dmrv-review-note" class="form-input" name="note" rows="4" maxlength="1000" placeholder="Explain the signal, evidence checked and response.">${esc(row.note)}</textarea><label class="option"><input id="dmrv-review-release" type="checkbox" name="release" ${row.published?'checked':''}><span><strong>Include in the investor demo</strong><small>Requires a reviewed state and an explanatory note. This is a simulated release decision.</small></span></label><p id="dmrv-review-error" role="alert" class="small"></p></div><div class="dialog-foot"><button type="button" id="dmrv-review-cancel" class="button">Cancel</button><button type="submit" class="button primary">Save example review</button></div></form>`;
    const close=()=>{dialog.close();returnButton?.focus();};
    document.getElementById('dmrv-review-close').onclick=close;document.getElementById('dmrv-review-cancel').onclick=close;
    dialog.showModal();
    document.getElementById('dmrv-review-form').onsubmit=event=>{
      event.preventDefault();
      const form=new FormData(event.target), state=form.get('state'), note=form.get('note').trim(), publish=form.has('release');
      if((state!=='new'||publish)&&!note){document.getElementById('dmrv-review-error').textContent='Add an interpretation and response note before saving a reviewed alert.';return;}
      if(publish&&state==='new'){document.getElementById('dmrv-review-error').textContent='A new, unreviewed alert cannot be included in the investor demo.';return;}
      row.review_status=state;row.note=note;row.published=publish;
      row.reviewer=state==='new'?null:'CIP reviewer (simulated)';
      row.reviewed_at=state==='new'?null:new Date().toISOString();
      dialog.close();refresh();
      document.querySelector(`[data-dmrv-review="${id}"]`)?.focus({preventScroll:true});
      document.getElementById('announcer').textContent='Illustrative review saved in browser memory.';
    };
  }
  async function loadFireEvents(token) {
    if(actualEventsLoaded||!snapshot.fire.events_file)return;
    if(snapshot.fire.events_file!=='data/monitoring/entooma-sidai-fire-events.json')throw Error('Unsupported FIRMS event file');
    const response=await fetch(snapshot.fire.events_file);if(!response.ok)throw Error('FIRMS event file unavailable');
    const raw=await response.text();
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)));
    const hash=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
    const data=JSON.parse(raw);
    if(token!==loadGeneration||loadedTeam!==true)return;
    if(hash!==snapshot.fire.events_sha256||data.results_sha256!==snapshot.fire.results_sha256||data.boundary_sha256!==snapshot.boundary.sha256
      ||data.ring_sha256!==snapshot.boundary.buffer_sha256||JSON.stringify(data.months)!==JSON.stringify(snapshot.months)
      ||JSON.stringify(data.period)!==JSON.stringify(snapshot.period)||data.event_count!==snapshot.fire.event_count
      ||data.events?.length!==data.event_count||data.events.some(row=>row.sample_data!==false||row.review_status!=='not_reviewed'||row.published!==false))throw Error('FIRMS event file incompatible with source snapshot');
    actualEvents=data.events;actualEventsLoaded=true;
  }
  async function load({team=false,monitoring=false}={}) {
    if(snapshot && loadedTeam===team){if(team&&monitoring)await loadFireEvents(loadGeneration);return;}
    const token=++loadGeneration;
    snapshot=null;scenario=null;actualEvents=[];actualEventsLoaded=false;loadedTeam=null;
    const files=team?['data/monitoring/entooma-sidai.json','data/monitoring/illustrative-scenario.json']:['data/monitoring/investor-source-readiness.json','data/monitoring/illustrative-investor-readiness.json'];
    const responses=await Promise.all(files.map(async url=>{
      const response=await fetch(url);if(!response.ok)throw Error(url);return response.json();
    }));
    if(token!==loadGeneration)return;
    [snapshot,scenario]=responses;
    loadedTeam=team;
    if(team){const previous=new Map((exampleEvents||[]).map(row=>[row.id,row]));exampleEvents=scenario.events.map(row=>previous.get(row.id)||structuredClone(row));}
    else if(!exampleEvents)exampleEvents=structuredClone(scenario.events);
    if(team&&monitoring)await loadFireEvents(token);
  }
  return {load,markup,mount,unmount};
})();
