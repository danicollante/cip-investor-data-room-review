/* Codex design study. All access rules below simulate UI states only.
 * No authentication, durable audit, file delivery, email or permissions are provided.
 * Source data stays in the existing repository. The catalog imports identities only.
 */
'use strict';
(() => {
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
const money = v => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const stageLabel = () => ({under_development:'Under development',under_validation:'Under validation',registered:'Registered',credits_issued:'Credits issued'}[project.sections.identity.registry_status] || 'Not stated');
const shortNum = v => new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v);
const date = v => v ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(v.slice(0,10)+'T12:00:00Z')) : 'Not provided';
const stamp = v => new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
const icons = {
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/><path d="M12 14v3"/>',
 users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0112 0v3M17 4a3 3 0 010 6M18 14a5 5 0 013 4v3"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 leaf:'<path d="M20 3C8 2 2 9 6 16s15 3 14-13ZM5 21l10-12"/>',
 doc:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v6h5M8 13h8M8 17h6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.doc}</svg>`;
const pill = (text,style='') => `<span class="pill ${style}">${esc(text)}</span>`;
const entooma = 'entooma-sidai';
let catalog, project, indicators, strings, geo, sourceCatalog, projectDocuments, profiles, active='team';
let query='',country='',readiness='',docQuery='',sourceFocusId='',sourceFocusKey='',activeProject=null;
let requests=[],events=[],invites=[],toastTimer,focusReturn,portfolioScroll=0,firstRender=true;
let sourceRecords=new Map(), documents=[], documentById=new Map();
const reviewSteps=[
 {title:'Find a project',profile:'team',route:'#/portfolio',task:'Find the first project you would show an investor. Which other projects can you evaluate from this preview?',stage:'Pilot: Entooma Sidai; other projects later',question:'Which projects and investor groups must be included in the first release?'},
 {title:'Find supporting documents',profile:'team',route:`#/project/${entooma}/documents`,task:'Find a project description. Then follow a citation from the overview or impact page back to its document entry.',stage:'Pilot',question:'Which document categories may be released first, and who approves each version?'},
 {title:'Assess the evidence',profile:'team',route:`#/project/${entooma}/impact`,task:'Find one claim you would show an investor and one you would want reviewed first.',stage:'Pilot or next release: CIP decision',question:'Is this page needed at launch? Who clears claims, imagery and financial figures?'},
 {title:'Try a partner invitation',profile:'partner',route:'#/access',task:'Invite a buyer to one selected project. Preview what that buyer can see.',stage:'Next release unless needed for the pilot',question:'Can partners invite within CIP-approved projects, or must CIP approve each invitation?'},
 {title:'Request corporate access',profile:'single',route:'#/corporate',task:'Request TopCo access. Then switch to the CIP team and review the request.',stage:'Next release unless needed for the pilot',question:'Is this workflow needed at launch? Should KYC use a separate named-access process?'}
];
let reviewStep=0,reviewQuestionVisible=false;
function renderReviewGuide(){
 const step=reviewSteps[reviewStep];
 $('#review-guide-content').innerHTML=`<div class="review-guide-head"><span>Demo review · ${reviewStep+1} of ${reviewSteps.length}</span><button class="review-guide-close" type="button" data-guide="close" aria-label="Close review guide">×</button></div><div class="review-guide-body"><h2>${step.title}</h2><p class="review-guide-persona">Preview as ${profiles[step.profile].label}</p><p class="review-guide-label">Try this task</p><p>${step.task}</p><button class="button small" type="button" data-guide="open">Open this view →</button>${reviewQuestionVisible?`<div class="review-guide-decision"><p class="review-guide-label">Scope question</p><p>${step.question}</p><p class="review-guide-stage">Proposed stage · ${step.stage}</p></div>`:`<button class="review-guide-reveal" type="button" data-guide="reveal">After trying, show scope question →</button>`}<p class="review-guide-note">Access and requests are simulated. Give your final priorities in the leadership feedback form.</p></div><div class="review-guide-foot"><button class="button small" type="button" data-guide="previous" ${reviewStep===0?'disabled':''}>← Previous</button><button class="button small primary" type="button" data-guide="next" ${reviewStep===reviewSteps.length-1?'disabled':''}>Next →</button></div>`;
}
function toggleReviewGuide(open){const guide=$('#review-guide'),toggle=$('#review-guide-toggle');guide.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open){renderReviewGuide();guide.querySelector('.review-guide-close').focus();}else toggle.focus();}
function reviewGuideAction(action){
 if(action==='close'){toggleReviewGuide(false);return;}
 if(action==='previous'||action==='next'){reviewStep+=action==='next'?1:-1;reviewQuestionVisible=false;renderReviewGuide();$('#review-guide-content [data-guide="open"]').focus();return;}
 if(action==='reveal'){reviewQuestionVisible=true;renderReviewGuide();$('#review-guide-content .review-guide-decision').scrollIntoView({block:'nearest'});return;}
 if(action==='open'){
  const step=reviewSteps[reviewStep];active=step.profile;query=country=readiness=docQuery=sourceFocusId=sourceFocusKey='';portfolioScroll=0;
  location.hash=step.route;route();$('#review-guide-content [data-guide="open"]').focus();
 }
}
const profile=()=>profiles[active];
const isTeam=()=>profile().role==='admin';
const canInvite=()=>['admin','partner'].includes(profile().role);
const visibleProjects=()=>catalog.projects.filter(p=>profile().projects.includes(p.id));
const canSee=id=>profile().projects.includes(id);
const tr=k=>strings[k]||k;
const citationHref=key=>`#/project/${entooma}/documents?citation=${encodeURIComponent(key)}`;
const sourceButton=(key,label)=>`<div class="source-actions"><a class="source-button" href="${citationHref(key)}" aria-label="Find cited document for ${esc(label)} in the project data room">View citation →</a><span class="source-context">${esc(label)}</span><a class="source-permalink" href="#/source/${esc(key)}" aria-label="Open direct citation for ${esc(label)}">Citation details</a></div>`;
function record(key,title,provenance,note,docId){sourceRecords.set(key,{title,provenance,note,docId});}
function output(name){return project.sections.financials.scenarios[0].outputs.find(x=>x.name===name);}
function makeSources(){
 const s=project.sections;
 record('area','Confirmed project area',s.identity.provenance,s.identity.provenance.caveats,'description');
 record('stage','Registry stage',s.identity.provenance,'Under development; not yet submitted for validation.','description');
 record('boundary','Boundary on file',s.geo.provenance,s.geo.provenance.caveats,'boundary');
 record('credits','Modelled credits over term',s.financials.scenarios[0].provenance,'Model output; figures require CIP validation before production use.','model');
 record('npv','Modelled net present value',s.financials.scenarios[0].provenance,'Model output; figures require CIP validation before production use.','model');
 const er=output('Net emission reductions, per year');
 record('er','Provisional annual emission reductions',er.figure.source_override||s.financials.scenarios[0].provenance,er.figure.note||er.figure.source_override?.caveats||'Calculated on the superseded 650,647 ha area. Awaiting reconciliation against the confirmed 500,000 ha.','er');
 for(const theme of indicators.themes)for(const i of theme.indicators){
  const docId=i.id==='land-cover-baseline'?'feasibility':i.id==='womens-participation'?'idea':i.id==='benefit-sharing'?'onepager':'description';
  record(i.id,tr(`ind.${i.id}.title`),i.meta,tr(i.meta.caveats_key),docId);
 }
 for(const item of s.legal_regulatory.items||[])record('legal-'+item.id,item.label||item.title,item.provenance,item.provenance.caveats||item.note,'legal-'+item.id);
 const faq=s.risks_faq.items?.[0]||s.risks_faq.questions?.[0];
 record('faq','FAQs for Entooma Sidai Project',faq?.provenance||{source:'FAQs for Entooma Sidai Project (7-20-2026).docx',updated:'2026-07-20',provider:'Climate Investment Partners',toc_ref:'8.c'},'Source record only. Original document delivery is not connected in this design preview.','faq');
}
function makeDocumentIndex(){
 documents=projectDocuments.sections.flatMap(section=>section.subsections.flatMap(sub=>sub.documents.map(entry=>({...entry,sectionId:section.id,sectionTitle:section.title,subsectionId:sub.id,subsectionTitle:sub.title}))));
 documentById=new Map(documents.map(entry=>[entry.id,entry]));
 if(documents.length!==projectDocuments.documentCount||projectDocuments.sectionCount!==8)throw new Error('Project data room TOC count mismatch');
 for(const [key,record] of sourceRecords){
  const binding=bindingFor(key,record);
  if(!binding||!documentById.has(binding.primary))throw new Error('Unresolved source-record binding: '+record.docId);
 }
}
function bindingFor(key,record){
 const raw=sourceCatalog.claimDocumentOverrides?.[key]||sourceCatalog.claimDocumentBindings[record.docId];
 if(!raw)return null;
 const target=id=>projectDocuments.citationTargets[id];
 return {...raw,primary:target(raw.primary),related:(raw.related||[]).map(target)};
}
function nav(){
 const p=profile();const selected=location.hash||'#/portfolio';
 $('#sidebar').innerHTML=`<a href="#/portfolio" aria-label="CIP project portfolio"><img class="logo" src="../../assets/brand/00_CIP_Hor_fullcolor.svg" alt="Climate Investment Partners"></a><p class="brand-sub">Investor data room</p><nav aria-label="Main navigation"><div class="nav-label">Projects</div><a class="nav-link" href="#/portfolio" ${selected.includes('/portfolio')||selected.includes('/project/')||selected.includes('/source/')?'aria-current="page"':''}><span class="nav-icon">${icon('grid')}</span>Portfolio<span class="nav-count">${visibleProjects().length}</span></a>${activeProject?`<div class="sidebar-project"><span>${esc(activeProject.name)}</span>${activeProject.populated?`<a href="#/project/${activeProject.id}/documents">Project Data Room</a><a href="#/project/${activeProject.id}/overview">Overview</a>`:''}</div>`:''}<div class="nav-label">CIP corporate</div><a class="nav-link" href="#/corporate" ${selected==='#/corporate'?'aria-current="page"':''}><span class="nav-icon">${icon('lock')}</span>Corporate access</a>${canInvite()?`<div class="nav-label">Manage</div><a class="nav-link" href="#/access" ${selected==='#/access'?'aria-current="page"':''}><span class="nav-icon">${icon('users')}</span>${isTeam()?'Access management':'Project invitations'}${isTeam()&&requests.some(r=>r.status==='pending')?`<span class="nav-count">${requests.filter(r=>r.status==='pending').length}</span>`:''}</a>`:''}</nav><div class="sidebar-bottom"><strong>${esc(p.organization)}</strong>${esc(p.role==='admin'?'Portfolio administration':p.role==='partner'?'Project sharing partner':'Invited project access')}<p style="margin:12px 0 0">${isTeam()?'Master index · 17 projects':'Your invitation determines which projects appear here.'}</p></div>`;
 $('#preview-label').textContent=p.label;$('#identity-label').textContent=p.organization;$('#avatar').textContent=p.organization.slice(0,2).toUpperCase();
}
function breadcrumbs(parts){$('#breadcrumbs').innerHTML=[`<a href="#/portfolio">Investor data room</a>`,...parts.map((p,i)=>`<span aria-hidden="true">/</span><span class="${i===parts.length-1?'current':''}">${esc(p)}</span>`)].join('');}
function pageHeading(title,subtitle,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${isTeam()?'CIP workspace':'Your workspace'}</div><h1>${esc(title)}</h1><p>${subtitle}</p></div>${actions}</div>`;}
function renderPortfolio(){
 breadcrumbs(['Project portfolio']);const visible=visibleProjects();
 $('#main').innerHTML=pageHeading('Project portfolio',isTeam()?'An overview of the projects in CIP’s document index. Open the populated Entooma Sidai Project Data Room.':'Explore the projects shared with you. Each project brings its documents, overview and supporting evidence together.',canInvite()?'<button class="button" data-action="invite">Share project access <span aria-hidden="true">↗</span></button>':'')+
 `${canSee(entooma)?`<section class="feature" aria-label="Featured populated project"><div><div class="eyebrow">Project data room available</div><h2>Entooma Sidai</h2><p>Rangeland restoration and conservation in Narok County, Kenya.</p><div class="feature-meta"><span>${projectDocuments.documentCount} documents · ${projectDocuments.sectionCount} sections</span><span>${num(project.sections.identity.area.value)} ha · Confirmed area</span><span>Verra ${esc(project.sections.identity.registry_id)}</span></div></div><a class="button primary" href="#/project/${entooma}/documents">Explore project documents <span aria-hidden="true">→</span></a></section>`:''}
 <div class="portfolio-meta"><span><strong>${visible.length}</strong>${isTeam()?'projects in the index':'projects shared with you'}</span><span><strong>${visible.filter(p=>p.populated).length}</strong>populated data room</span>${!isTeam()?'<span class="scope-line">'+icon('lock').replace('<svg ','<svg width="13" height="13" ')+'Invitation scope</span>':''}</div>
 <div class="toolbar"><label class="search">${icon('search')}<span class="sr-only">Search projects</span><input id="project-search" type="search" placeholder="Search projects or registry ID" value="${esc(query)}"></label><label><span class="sr-only">Filter by location</span><select id="country-filter"><option value="">All locations</option>${[...new Set(visible.map(p=>p.country).filter(Boolean))].sort().map(c=>`<option ${c===country?'selected':''}>${esc(c)}</option>`).join('')}</select></label><label><span class="sr-only">Filter by brief availability</span><select id="readiness-filter"><option value="">All briefs</option><option value="ready" ${readiness==='ready'?'selected':''}>Populated brief</option><option value="pending" ${readiness==='pending'?'selected':''}>Awaiting content</option></select></label></div><div id="portfolio-results"></div>`;
 renderRows();
 $('#project-search').addEventListener('input',e=>{query=e.target.value;renderRows();});
 $('#country-filter').addEventListener('change',e=>{country=e.target.value;renderRows();});
 $('#readiness-filter').addEventListener('change',e=>{readiness=e.target.value;renderRows();});
}
function renderRows(){
 const visible=visibleProjects();const list=visible.filter(p=>(!country||p.country===country)&&(!readiness||p.populated===(readiness==='ready'))&&`${p.name} ${p.country} ${p.registryId}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>Number(b.populated)-Number(a.populated)||a.name.localeCompare(b.name));
 $('#portfolio-results').innerHTML=list.length?`<div class="table-wrap"><table class="portfolio-table"><caption class="sr-only">Projects included in the current workspace. Projects awaiting content are unavailable in this preview.</caption><thead><tr><th scope="col">Project</th><th scope="col">Location</th><th scope="col">Registry stage</th><th scope="col">Project area</th><th scope="col">Content</th></tr></thead><tbody>${list.map(p=>`<tr class="${p.populated?'ready-row':'pending-row'}"><td><div class="project-name-wrap"><span class="project-mark" aria-hidden="true">${p.populated?'ES':esc(p.name.split(' ').filter(n=>/^[A-Za-z]/.test(n)).slice(0,2).map(n=>n[0].toUpperCase()).join(''))}</span><div>${p.populated?`<a class="project-link" href="#/project/${p.id}/documents">${esc(p.name)}</a>`:`<span class="project-link pending-project" aria-disabled="true">${esc(p.name)}</span>`}<span class="project-sub">${p.populated?'Grassland restoration':p.registryId?'Verra '+esc(p.registryId)+' · From master index':'From master index'}</span></div></div></td><td>${p.country?esc(p.country):'<span class="pending-text">Not provided</span>'}</td><td>${p.populated?pill(stageLabel(),'green'):'<span class="pending-text">Not populated</span>'}</td><td>${p.populated?num(project.sections.identity.area.value)+' <span class="muted">ha</span>':'<span class="pending-text">Not populated</span>'}</td><td>${p.populated?`<a href="#/project/${p.id}/documents">Open data room →</a>`:'<span class="pending-text">Unavailable in preview</span>'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h2>No matching projects</h2><p>Try another name, registry ID or location.</p><button class="button" data-action="clear-filters">Clear filters</button></div>`;
 $('#portfolio-results').insertAdjacentHTML('beforeend',`<div class="table-foot"><span>${list.length} of ${visible.length} projects${isTeam()?' · Names from the supplied master index':''}</span><span>Missing brief content does not indicate project status.</span></div>`);
 $('#announcer').textContent=`${list.length} projects shown.`;
}
function projectHeader(p,tab){return `<div class="page-heading"><div><div class="eyebrow">Project · ${esc(p.name)}</div><div class="project-title-line"><h1>${p.populated?'Entooma Sidai':esc(p.name)}</h1>${p.populated?pill(stageLabel(),'green'):pill('Brief awaiting content')}</div><p>${p.populated?'Narok County, Kenya · Grassland restoration · Verra '+esc(project.sections.identity.registry_id):esc(p.country||'Location not provided in the index')}</p></div><a class="button" href="#/portfolio">← Back to portfolio</a></div>${p.populated?`<nav class="tabs" aria-label="Project sections">${[['documents','Project Data Room'],['overview','Overview'],['impact','Impact & evidence'],['financials','Financials'],['diligence','Diligence']].map(([id,label])=>`<a href="#/project/${p.id}/${id}" ${tab===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`:''}`;}
function geoSVG(){
 const polygons=[];for(const f of geo.features||[]){if(f.geometry.type==='Polygon')polygons.push(f.geometry.coordinates);if(f.geometry.type==='MultiPolygon')polygons.push(...f.geometry.coordinates);}
 const points=polygons.flat(2);if(!points.length)return '';
 const ys=points.map(p=>p[1]);const cos=Math.cos((Math.min(...ys)+Math.max(...ys))/2*Math.PI/180);
 const xs=points.map(p=>p[0]*cos),minX=Math.min(...xs),maxY=Math.max(...ys);const w=Math.max(...xs)-minX,h=maxY-Math.min(...ys),scale=Math.min(350/w,185/h);
 const paths=polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${((p[0]*cos-minX)*scale+25).toFixed(2)},${((maxY-p[1])*scale+10).toFixed(2)}`).join(' ')+' Z').join(' '));
 return `<svg viewBox="0 0 400 210" role="img" aria-label="Boundary on file, predating the confirmed project area. Revision pending."><g fill="#78995355" stroke="#658540" stroke-width="1.5" fill-rule="evenodd">${paths.map(d=>`<path d="${d}"/>`).join('')}</g></svg>`;
}
function metric(label,value,unit,basis,note,key){const s=sourceRecords.get(key);return `<article class="metric"><div class="metric-label">${esc(label)}</div><div>${pill(basis,basis.includes('Provisional')?'amber':'outline')}</div><div class="metric-value">${esc(value)} <small>${esc(unit)}</small></div><p class="metric-note">${esc(note)}</p>${sourceButton(key,(s.provenance.short||'View source')+' · '+date(s.provenance.updated))}</article>`;}
function overview(){const identity=project.sections.identity;const er=output('Net emission reductions, per year');
 return `<section class="project-hero"><div class="hero-copy"><div class="eyebrow">Kenya / Nature-based solutions</div><h2>A rangeland restoration project in the Maasai Mara.</h2><p>A grassland restoration and conservation project built around sustainable grazing management in the Maasai Mara landscape.</p><a class="button primary" href="#/project/${entooma}/documents">Explore project documents →</a><div class="hero-facts"><div><strong>${esc(identity.methodology.id)}</strong>Grassland methodology</div><div><strong>VCS / CCB</strong>Standards in project design</div></div></div><div class="geo-preview">${geoSVG()}<div class="geo-label">Boundary on file · Revision pending · Not the confirmed area</div></div></section>
 <div class="section-heading"><h2>Project at a glance</h2><a href="#/project/${entooma}/documents" class="small">Project Data Room →</a></div>
 <div class="metric-grid">${metric('Confirmed project area',num(identity.area.value),'ha','Developer-confirmed','Area confirmed by CIP. The boundary on file has not yet been revised.','area')}${metric('Annual emission reductions',num(er.figure.value),'tCO₂e / year','Provisional estimate','Calculated on the earlier 650,647 ha area. Reconciliation is pending.','er')}${metric('Registry position',stageLabel(),'','Documented stage','Project description drafted. Not yet submitted for validation.','stage')}</div>
 <div class="issue"><span class="issue-icon" aria-hidden="true">△</span><div><strong>Boundary and estimate need reconciliation</strong><p>The boundary on file measures 652,022 ha; CIP’s confirmed area is ${num(identity.area.value)} ha. The emissions workbook uses 650,647 ha. These are different source bases.</p>${sourceButton('boundary','Read the boundary qualification')}</div></div>
 <div class="two-col"><section class="panel"><h2>Registry lifecycle</h2><p class="small muted">Current position is documented. Later stages are not achieved.</p><ol class="milestones">${['Under development','Under validation','Registered','Credits issued'].map((s,i)=>`<li class="${i===0?'current':''}" ${i===0?'aria-current="step"':''}><strong>${s}</strong>${i===0?'Current position':'Not started'}</li>`).join('')}</ol>${sourceButton('stage','Project description · Milestones, p.46')}</section><section class="panel"><h2>What to explore next</h2><ul class="plain-list"><li><a href="#/project/${entooma}/documents">Project Data Room →</a><small>Browse the complete document tree for Entooma Sidai.</small></li><li><a href="#/project/${entooma}/impact">Impact & evidence →</a><small>Separate commitments, context and documented findings.</small></li><li><a href="#/project/${entooma}/diligence">Diligence →</a><small>Review outstanding legal and project questions.</small></li></ul></section></div>`;
}
function impact(){
 const basis={'area-managed':'Developer-confirmed area','land-cover-baseline':'Regional context','wildlife-corridor':'Geographic context','key-species':'Conservation context','communities-engaged':'Design commitment','womens-participation':'Design commitment','local-jobs':'Planned roles','benefit-sharing':'Described mechanism'};
 return `<div class="section-heading"><div><h2>Impact & evidence</h2><p>What the project commits to, what the sources describe, and what is still to be measured.</p></div></div>${indicators.themes.map(t=>`<section><h3 class="theme-heading"><span class="theme-dot"></span>${esc(tr('theme.'+t.id+'.title'))}</h3><div class="indicator-grid">${t.indicators.map(i=>i.id==='key-species'?speciesPreview(i):`<article class="indicator"><div>${pill(basis[i.id],'outline')}</div><h3>${esc(i.id==='local-jobs'?'Planned employment roles':tr('ind.'+i.id+'.title'))}</h3><p class="muted">${esc(tr(i.card_definition_key))}</p><div class="finding">${['numeral','chart'].includes(i.figure_type)?num(i.value)+' '+esc(i.unit):esc(tr(i.pullline_key||i.quote_key))}</div>${sourceButton(i.id,i.meta.short+' · '+date(i.meta.updated))}</article>`).join('')}</div></section>`).join('')}`;
}
function speciesIndicator(){return indicators.themes.flatMap(t=>t.indicators).find(i=>i.id==='key-species');}
function speciesPreview(i){
 return `<article class="indicator species-preview"><div>${pill('Conservation context','outline')}</div><h3>${esc(tr('ind.key-species.title'))}</h3><p class="muted">${esc(tr(i.card_definition_key))}</p><div class="species-preview-images" aria-hidden="true">${i.species.map(sp=>`<img src="../../${esc(sp.image)}" alt="" loading="lazy" decoding="async">`).join('')}</div><div class="species-preview-footer"><span>${i.species.length} species · Categories, not counts</span><a href="#/project/${entooma}/species">Explore species →</a></div>${sourceButton(i.id,i.meta.short+' · '+date(i.meta.updated))}</article>`;
}
function speciesCard(sp){
 const labels=['LC','NT','VU','EN','CR'];const name=tr(sp.name_key),status=tr(sp.status_key);
 return `<article class="species-card"><div class="species-photo"><img src="../../${esc(sp.image)}" alt="Illustrative photograph of ${esc(name)}" loading="lazy" decoding="async"></div><div class="species-body"><div><h3>${esc(name)}</h3><p class="species-latin"><i>${esc(sp.latin)}</i></p></div><div class="species-status"><strong>${esc(status)}</strong><div class="species-scale" role="img" aria-label="Conservation category: ${esc(status)}. Category ${sp.scale_index+1} of 5, from least concern to critically endangered.">${labels.map((label,index)=>`<span class="${index===sp.scale_index?'is-active':''}" aria-hidden="true"><b></b><small>${label}</small></span>`).join('')}</div></div></div></article>`;
}
function speciesView(){
 const i=speciesIndicator();
 return `<div class="species-view-intro"><div><div class="eyebrow">Biodiversity / Entooma Sidai</div><h2>${esc(tr('ind.key-species.title'))}</h2><p>${esc(tr('ind.key-species.pullline'))}</p></div><a class="button small" href="#/project/${entooma}/impact">← Back to impact</a></div><div class="species-view-heading"><span>${esc(tr('ind.key-species.section_caption'))}</span></div><div class="species-grid">${i.species.map(speciesCard).join('')}</div><div class="species-notes"><p>${esc(tr('species.scale_note'))}</p><p>These photographs illustrate the species; they do not document a project-site observation.</p><p>${esc(tr('species.photo_credit'))}</p>${sourceButton(i.id,'View project description · §5.1, pp.155–159')}</div>`;
}
function documentsView(){
 return `<div class="section-heading"><div><div class="eyebrow">Entooma Sidai · Project-level data room</div><h2>Project Data Room</h2><p>${projectDocuments.documentCount} documents in ${projectDocuments.sectionCount} sections · Original TOC order and folder structure.</p></div><span class="pill outline">Complete project TOC</span></div><p class="details-line">Browse every document listed in the Entooma Sidai TOC. Citation links locate the named file here and show the page, section or passage recorded for the claim.</p><div class="toolbar"><label class="search">${icon('search')}<span class="sr-only">Search project documents</span><input type="search" id="document-search" placeholder="Search documents, sections or folders" value="${esc(docQuery)}"></label>${docQuery?'<button class="button small" data-action="clear-docs">Clear search</button>':`<button class="button small" data-action="expand-docs">${openSections.size===projectDocuments.sectionCount?'Collapse all':'Expand all'}</button>`}</div><div id="document-results"></div>`;
}
const openSections=new Set(['1']);
function claimsForEntry(id){return [...sourceRecords].filter(([key,r])=>{const b=bindingFor(key,r);return b?.primary===id||b?.related?.includes(id);}).map(([key,r])=>({key,title:r.title}));}
function emptyText(state){return state==='media'?'Media folder · files are not itemized in the original TOC.':'No documents listed yet.';}
function docRow(d,nested=false){
 const claims=claimsForEntry(d.id),focused=d.id===sourceFocusId,claim=focused?sourceRecords.get(sourceFocusKey):null;
 return `<article class="doc-row source-row toc-file ${nested?'toc-nested':''} ${focused?'is-target':''}" id="source-entry-${esc(d.id)}"><span class="file-icon" aria-hidden="true">${esc(d.format)}</span><div class="doc-copy">${nested?`<h6>${esc(d.name)}</h6>`:`<h5>${esc(d.name)}</h5>`}<p>${claims.length?`${claims.length} linked ${claims.length===1?'claim':'claims'}`:'Document in project room'}</p>${claim?`<p class="source-fragment"><strong>Cited for: ${esc(claim.title)}</strong><br>${esc(claim.provenance.source)}<br><a href="#/source/${esc(sourceFocusKey)}">View citation details →</a></p>`:''}</div><a class="button small" href="#/source/${esc(d.id)}" aria-label="View document entry for ${esc(d.name)}">View entry →</a></article>`;
}
function renderSubsection(sub,docs,folders){
 const groups=[],at=new Map();
 function groupFor(path,label,state){
  if(!at.has(path)){at.set(path,groups.length);groups.push({path,label:label||path,state:state||'',docs:[],folder:false});}
  const group=groups[at.get(path)];if(label)group.label=label;if(state)group.state=state;return group;
 }
 docs.forEach(d=>{if(d.groupPath)groupFor(d.groupPath,d.groupLabel).docs.push(d);});
 folders.forEach(f=>{const group=groupFor(f.path,f.label,f.emptyState);group.folder=true;});
 const survivors=groups.filter(g=>g.docs.length||!groups.some(other=>other!==g&&other.path.startsWith(g.path+' / ')));
 const loose=docs.filter(d=>!d.groupPath);
 return `<div class="toc-subsection"><h4 class="toc-subtitle">${esc(sub.title)}${['empty','media','unknown'].includes(sub.emptyState)?` <span class="toc-empty-tag">${esc(sub.emptyState.toUpperCase())}</span>`:''}</h4>${loose.map(d=>docRow(d)).join('')}${survivors.map(g=>`<div class="toc-group"><h5>${esc(g.label)}</h5>${g.docs.map(d=>docRow(d,true)).join('')}${!g.docs.length?`<p class="toc-no-files">${emptyText(sub.emptyState==='media'?'media':g.state)}</p>`:''}</div>`).join('')}${!loose.length&&!survivors.length?`<p class="toc-no-files">${emptyText(sub.emptyState)}</p>`:''}</div>`;
}
function renderDocs(){
 const search=docQuery.trim().toLowerCase();let shown=0;
 const toolbarButton=$('#main .toolbar > button');
 if(toolbarButton){toolbarButton.dataset.action=search?'clear-docs':'expand-docs';toolbarButton.textContent=search?'Clear search':openSections.size===projectDocuments.sectionCount?'Collapse all':'Expand all';}
 const sections=projectDocuments.sections.map(section=>{let sectionCount=0;
  const sectionHit=!!search&&section.title.toLowerCase().includes(search);
  const subsections=section.subsections.map(sub=>{
   const subHit=sectionHit||!!search&&sub.title.toLowerCase().includes(search);
   const docs=sub.documents.filter(d=>!search||subHit||`${d.name} ${d.groupPath} ${d.groupLabel}`.toLowerCase().includes(search));
   const folders=sub.folders.filter(f=>!search||subHit||`${f.name} ${f.path} ${f.label}`.toLowerCase().includes(search)||docs.some(d=>d.groupPath===f.path||d.groupPath.startsWith(f.path+' / ')));
   if(search&&!subHit&&!docs.length&&!folders.length)return '';
   shown+=docs.length;sectionCount+=docs.length;
   return renderSubsection(sub,docs,folders);
  }).filter(Boolean);
  if(search&&!subsections.length)return '';
  const expanded=!!search||openSections.has(section.id);
  return `<section class="toc-section"><h3 class="toc-section-heading"><button class="toc-section-toggle" data-toggle-section="${esc(section.id)}" aria-expanded="${expanded}" aria-controls="toc-body-${esc(section.id)}"><span class="toc-chevron" aria-hidden="true">${expanded?'▾':'▸'}</span><span>${esc(section.title)}</span><span class="toc-count">${sectionCount}</span></button></h3><div class="toc-section-body" id="toc-body-${esc(section.id)}" ${expanded?'':'hidden'}>${subsections.join('')}</div></section>`;
 }).filter(Boolean);
 $('#document-results').innerHTML=`<p class="small muted">${shown} of ${documents.length} documents shown · ${projectDocuments.sectionCount} TOC sections</p>${sections.length?sections.join(''):'<div class="empty"><h3>No documents match</h3><p>Try another filename, section or folder.</p><button class="button" data-action="clear-docs">Clear search</button></div>'}<p class="small muted toc-delivery-note">Document names and hierarchy come from CIP's original TOC. Secure file delivery is not connected in this design preview.</p>`;
 $('#announcer').textContent=`${shown} of ${documents.length} project documents shown.`;
}
function financials(){
 const fin=project.sections.financials.scenarios[0];
 return `<div class="issue"><span class="issue-icon">△</span><div><strong>Model figures · CIP validation required</strong><p>This preview shows the documented model outputs to everyone with Entooma Sidai project access. CIP should validate their use before a production data room is launched.</p></div></div><div class="section-heading"><div><h2>Modelled financials</h2><p>${esc(fin.label)} · ${date(fin.provenance.updated)}</p></div></div><div class="metric-grid">${metric('Modelled credits over term',shortNum(output('Credits delivered, total over term').figure.value),'VCU','Model output',num(output('Credits delivered, total over term').figure.value)+' VCU in the source model.','credits')}${metric('Modelled net present value',shortNum(output('NPV').figure.value),'USD','Model output',money(output('NPV').figure.value)+' USD in the source model.','npv')}</div><section class="panel" style="margin-top:24px"><h2>Model assumptions</h2>${fin.assumptions.map(a=>`<div class="financial-row"><span>${esc(a.name)}</span><strong>${a.figure.state==='provided'?(a.figure.unit==='calendar year'?String(a.figure.value):num(a.figure.value))+' '+esc(a.figure.unit):'Not stated'}${a.figure.state==='provided'&&typeof a.figure.value==='number'&&String(a.figure.value).split('.')[1]?.length>2?'<small class="exact-number">Source states '+esc(a.figure.value)+' '+esc(a.figure.unit)+'</small>':''}</strong></div>`).join('')}${sourceButton('npv','View model source and qualifications')}</section>`;
}
function diligence(){const legal=project.sections.legal_regulatory;return `<div class="section-heading"><div><h2>Diligence & open questions</h2><p>Documented conditions, with the original qualification available for each item.</p></div></div>${(legal.items||[]).map(i=>`<article class="request-card"><div class="request-card-header"><h3>${esc(i.label||i.title||i.id)}</h3>${pill(i.status,i.status==='confirmed'?'green':'amber')}</div><p>${esc(i.note||i.text||i.summary||i.detail||'')}</p>${sourceButton('legal-'+i.id,i.provenance.short)}</article>`).join('')}`;}
function renderProject(id,tab){
 const p=catalog.projects.find(p=>p.id===id);if(!p||!canSee(id)){activeProject=null;breadcrumbs(['Project unavailable']);$('#main').innerHTML=`<section class="empty"><h1>Project unavailable</h1><p>This project is not included in your current invitation, or the link is unavailable.</p><a class="button primary" href="#/portfolio">View your projects</a></section>`;return;}
 activeProject=p;breadcrumbs(['Project portfolio',p.populated?'Entooma Sidai':p.name]);
 if(!p.populated){activeProject=null;breadcrumbs(['Project unavailable']);$('#main').innerHTML=`<section class="empty"><h1>Project unavailable in this preview</h1><p>${esc(p.name)} is listed in CIP’s pipeline, but its data room and brief are not populated.</p><a class="button primary" href="#/portfolio">Back to portfolio</a></section>`;return;}
 const views={overview,impact,species:speciesView,documents:documentsView,financials,diligence};tab=views[tab]?tab:'overview';
 if(tab==='species')breadcrumbs(['Project portfolio','Entooma Sidai','Key species']);
 $('#main').innerHTML=projectHeader(p,tab==='species'?'impact':tab)+views[tab]();
 if(tab==='documents'){renderDocs();$('#document-search').addEventListener('input',e=>{docQuery=e.target.value;sourceFocusId=sourceFocusKey='';renderDocs();});if(sourceFocusId)requestAnimationFrame(()=>$('#source-entry-'+sourceFocusId)?.scrollIntoView({block:'center'}));}
}
function latestRequest(){return requests.filter(r=>r.actorId===profile().id).at(-1);}
function renderCorporate(){breadcrumbs(['Corporate access']);const req=latestRequest();
 $('#main').innerHTML=pageHeading('Investing in CIP', 'Corporate materials are available through a separate access process.')+`<div class="corp-grid"><section class="panel corp-intro"><div class="corp-lock">${icon('lock')}</div><h2 style="font-size:27px">A separate view of the company</h2><p>For investors evaluating Climate Investment Partners at the company level, corporate access is reviewed independently of individual project invitations.</p><p>Access to Entooma Sidai or another project does not include TopCo materials.</p><div class="disclosure">Corporate documents are held separately and are not included in this prototype.</div>${isTeam()?'<a class="button primary" href="#/access">Review corporate requests →</a>':req?.status==='pending'?pill('Access request pending','amber'):req?.status==='approved'?pill('Access approved in this preview','green'):`<button class="button primary" data-action="request-topco">${req?.status==='declined'?'Make a new request':'Request corporate access'} →</button>`}</section><section class="request-summary"><h2>${req?'Your request':'How access works'}</h2>${req?`<p>${pill(req.status,req.status==='approved'?'green':'amber')}</p><p class="small">Request ${esc(req.id)} · ${esc(req.organization)}</p><ol class="timeline"><li><strong>Request recorded</strong><small>${esc(req.actor)} · ${stamp(req.created)}</small></li>${req.reviewed?`<li><strong>${req.status==='approved'?'Approved':'Declined'} by ${esc(req.reviewer)}</strong><small>${stamp(req.reviewed)}</small><small>${esc(req.reviewNote)}</small></li>`:'<li><strong>Awaiting CIP review</strong><small>A reviewer, decision and time will be recorded.</small></li>'}</ol>`:`<ol class="timeline"><li><strong>Tell us about your interest</strong><small>Your identity, organization and request time are recorded.</small></li><li><strong>CIP reviews the request</strong><small>An authorized reviewer records a decision and its time.</small></li><li><strong>Receive separate corporate access</strong><small>Project permissions remain unchanged.</small></li></ol>`}<p class="small muted">Preview only. Requests and decisions stay in this browser session; nothing is sent.</p></section></div>`;
}
function renderAccess(){breadcrumbs(['Access management']);if(!canInvite()){$('#main').innerHTML=`<section class="empty"><h1>Access management is unavailable</h1><p>Your invitation provides project viewing access.</p><a class="button" href="#/portfolio">View your projects</a></section>`;return;}
 const relevantEvents=isTeam()?events:events.filter(e=>e.actorId===profile().id);
 $('#main').innerHTML=pageHeading(isTeam()?'Access management':'Project invitations',isTeam()?'Review corporate requests and follow the history of project invitations.':'Share a selection of the projects CIP has made available to your organization.','<button class="button primary" data-action="invite">Create project invitation ↗</button>')+
 `<div class="disclosure">Design preview: identities, invitations and decisions are simulated. No access is granted to actual documents and no invitation is sent.</div>${isTeam()?`<div class="section-heading"><h2>Corporate access requests</h2><span class="pill outline">${requests.filter(r=>r.status==='pending').length} pending</span></div>${requests.length?requests.slice().reverse().map(r=>`<article class="request-card"><div class="request-card-header"><div><h3>${esc(r.organization)} · Corporate access</h3><p class="small muted">${esc(r.id)} · ${esc(r.actor)} · ${stamp(r.created)}</p></div>${pill(r.status,r.status==='approved'?'green':'amber')}</div><p>${esc(r.reason)}</p>${r.status==='pending'?`<div class="actions"><button class="button small primary" data-review="${r.id}" data-decision="approved">Approve request</button><button class="button small danger" data-review="${r.id}" data-decision="declined">Decline request</button></div>`:`<p class="small muted">${r.status==='approved'?'Approved':'Declined'} by ${esc(r.reviewer)} · ${stamp(r.reviewed)}<br>${esc(r.reviewNote)}</p>`}</article>`).join(''):'<div class="empty"><h3>No requests yet</h3><p>Use an investor preview to try the corporate access request flow.</p><button class="button" data-action="preview">Choose a preview</button></div>'}`:''}
 <div class="section-heading"><h2>Invitation activity</h2></div>${invites.filter(i=>isTeam()||i.actorId===profile().id).map(i=>`<article class="request-card"><div class="request-card-header"><div><h3>${esc(i.organization)}</h3><p class="small muted">Created by ${esc(i.actor)} · ${stamp(i.created)}</p></div>${pill(i.projects.length+' projects','green')}</div><p class="small">${i.projects.map(id=>esc(catalog.projects.find(p=>p.id===id).name)).join(' · ')}</p><p class="small muted">Project viewer · TopCo excluded · Invitation not sent</p><button class="button small" data-preview-invite="${i.id}">Preview this invitation →</button></article>`).join('')||'<p class="muted">No project invitations created in this session.</p>'}
 <div class="section-heading"><h2>Activity history</h2></div><section class="panel">${relevantEvents.length?relevantEvents.slice().reverse().map(e=>`<div class="history-row"><strong>${esc(e.action)}</strong><small>${esc(e.actor)} · ${stamp(e.time)}</small><small>${esc(e.description)}</small></div>`).join(''):'<p class="muted">Requests, decisions and invitations will appear here.</p>'}</section>`;
}
function modal(title,body,footer=''){focusReturn=document.activeElement;const d=$('#dialog');d.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close" aria-label="Close dialog">×</button></div>${body}${footer?`<div class="dialog-foot">${footer}</div>`:''}`;if(!d.open)d.showModal();}
function close(){const d=$('#dialog');d.close();if(focusReturn?.isConnected)focusReturn.focus();else $('#main').focus();}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;toastTimer=setTimeout(()=>$('#toast').textContent='',5500);}
function sourceRecordBody(key,r){
 const p=r.provenance,binding=bindingFor(key,r),linked=[binding.primary,...(binding.related||[])].map(id=>documentById.get(id));
 return `<div class="dialog-body source-record-body"><div class="eyebrow">Citation record</div><p class="evidence-source">${esc(p.source)}</p><dl class="evidence-meta"><dt>Source date</dt><dd>${date(p.updated)}</dd><dt>Produced by</dt><dd>${esc(p.provider||'Not stated')}</dd><dt>Original TOC location</dt><dd>${esc(linked[0].sectionTitle)} / ${esc(linked[0].subsectionTitle)}${linked[0].groupPath?' / '+esc(linked[0].groupPath):''}</dd><dt>Claim basis</dt><dd>As stated in the cited source</dd></dl><h3>Qualification</h3><p class="small" style="margin-top:10px">${esc(r.note||'No additional qualification recorded.')}</p><h3>Documents in the project data room</h3><ul class="source-record-links">${linked.map((entry,index)=>`<li><span>${index?'Related':'Primary'} · ${esc(entry.name)}</span><span class="small muted">${esc(entry.subsectionId)}</span></li>`).join('')}</ul>${binding.basisNote?`<p class="small">${esc(binding.basisNote)}</p>`:''}<div class="disclosure">This design preview preserves the document name and cited passage. Secure document delivery is not connected yet.</div></div>`;
}
function evidence(key){const r=sourceRecords.get(key);if(!r||!canSee(entooma))return;
 modal(r.title,sourceRecordBody(key,r),`<button class="button" data-action="close">Close</button><a class="button primary" href="${citationHref(key)}">Find document in Project Data Room →</a>`);
}
function renderSourceRoute(ref){
 const p=catalog.projects.find(p=>p.id===entooma);if(!canSee(entooma)){renderProject(entooma,'overview');return;}
 activeProject=p;const r=sourceRecords.get(ref),entry=documentById.get(ref);
 if(!r&&!entry){breadcrumbs(['Project portfolio','Entooma Sidai','Citation unavailable']);$('#main').innerHTML=projectHeader(p,'documents')+`<section class="empty"><h2>Citation or document unavailable</h2><p>This citation or project document entry does not exist.</p><a class="button" href="#/project/${entooma}/documents">Browse Project Data Room</a></section>`;return;}
 if(r){breadcrumbs(['Project portfolio','Entooma Sidai','Project Data Room','Citation',r.title]);$('#main').innerHTML=projectHeader(p,'documents')+`<div class="section-heading"><div><h2>${esc(r.title)}</h2><p>Direct citation from the project brief.</p></div><a class="button small" href="${citationHref(ref)}">← Find document in Project Data Room</a></div><section class="panel source-detail">${sourceRecordBody(ref,r)}<a class="button primary" href="${citationHref(ref)}">Search cited file in Project Data Room →</a></section>`;return;}
 const claims=claimsForEntry(entry.id);breadcrumbs(['Project portfolio','Entooma Sidai','Project Data Room',entry.name]);
 $('#main').innerHTML=projectHeader(p,'documents')+`<div class="section-heading"><div><h2>Project document</h2><p>${esc(entry.sectionTitle)} / ${esc(entry.subsectionTitle)}${entry.groupPath?' / '+esc(entry.groupPath):''}</p></div><a class="button small" href="#/project/${entooma}/documents">← Project Data Room</a></div><section class="panel source-detail"><div class="source-row-heading"><h3>${esc(entry.name)}</h3>${pill(entry.format,'outline')}</div><h3>Linked claims</h3>${claims.length?`<ul class="plain-list">${claims.map(claim=>`<li><a href="#/source/${esc(claim.key)}">${esc(claim.title)} · Citation details →</a></li>`).join('')}</ul>`:'<p>No claim in the current brief cites this document.</p>'}<div class="disclosure">The full project TOC is visible in this demo. Secure file delivery is not connected yet.</div></section>`;
}
function previewDialog(){modal('Preview the access experience',`<form id="preview-form"><div class="dialog-body"><p>Switch between example roles to explore the design. These controls do not provide security or change any real permissions.</p><fieldset><legend>Example role</legend>${['team','partner','single','africa'].map(id=>`<label class="option"><input type="radio" name="profile" value="${id}" ${active===id?'checked':''}><span><strong>${esc(profiles[id].label)}</strong><small>${esc(profiles[id].description)}</small></span></label>`).join('')}</fieldset><div class="disclosure">Requests and invitation history are kept only until you reload this page.</div></div><div class="dialog-foot"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary" type="submit">Apply preview →</button></div></form>`);$('#preview-form').addEventListener('submit',e=>{e.preventDefault();const next=new FormData(e.target).get('profile');if(!next)return;setProfile(next);});}
function setProfile(id){close();active=id;query=country=readiness=docQuery=sourceFocusId=sourceFocusKey='';portfolioScroll=0;location.hash='#/portfolio';route();toast('Previewing '+profile().label+'. Access is simulated.');}
function addEvent(action,description){events.push({action,description,actor:profile().actor,actorId:profile().id,time:new Date().toISOString()});}
function requestDialog(){if(isTeam()||latestRequest()?.status==='pending'||latestRequest()?.status==='approved')return;
 modal('Request corporate access',`<form id="request-form"><div class="dialog-body"><p>Tell CIP about your interest in investing at the company level.</p><dl class="evidence-meta"><dt>Requested by</dt><dd>${esc(profile().actor)}</dd><dt>Organization</dt><dd>${esc(profile().organization)}</dd><dt>Access requested</dt><dd>CIP corporate / TopCo</dd></dl><label class="field" for="request-reason">Reason for requesting access</label><textarea id="request-reason" name="reason" maxlength="1200" required placeholder="Describe the purpose of your corporate review…"></textarea><div class="disclosure">This demonstrates request tracking. No request or personal information is sent.</div></div><div class="dialog-foot"><button type="button" class="button" data-action="close">Cancel</button><button type="submit" class="button primary">Record demo request →</button></div></form>`);
 $('#request-form').addEventListener('submit',e=>{e.preventDefault();const reason=new FormData(e.target).get('reason').trim();if(!reason){$('#request-reason').setCustomValidity('Please enter a reason.');$('#request-reason').reportValidity();return;}const r={id:'COR-'+String(requests.length+1).padStart(3,'0'),actorId:profile().id,actor:profile().actor,organization:profile().organization,reason,created:new Date().toISOString(),status:'pending'};requests.push(r);addEvent('Corporate access requested',r.id+' · '+r.organization);close();route();toast('Demo request recorded. Switch to CIP team to review it.');});$('#request-reason').addEventListener('input',e=>e.target.setCustomValidity(''));
}
function reviewDialog(id,decision){if(!isTeam())return;const r=requests.find(r=>r.id===id&&r.status==='pending');if(!r)return;
 modal(decision==='approved'?'Approve corporate request':'Decline corporate request',`<form id="review-form"><div class="dialog-body"><p>${esc(r.organization)} · ${esc(r.id)}</p><p>This decision concerns corporate access only. Project permissions stay unchanged.</p><label class="field" for="review-note">Decision note</label><textarea id="review-note" name="note" required maxlength="1200" placeholder="Record the reason or next step…"></textarea><p class="small muted">Recorded as ${esc(profile().actor)}. Simulated decision only.</p></div><div class="dialog-foot"><button type="button" class="button" data-action="close">Cancel</button><button class="button primary" type="submit">Record ${decision==='approved'?'approval':'decision'}</button></div></form>`);
 $('#review-form').addEventListener('submit',e=>{e.preventDefault();const note=new FormData(e.target).get('note').trim();if(!note){$('#review-note').setCustomValidity('Please record a decision note.');$('#review-note').reportValidity();return;}Object.assign(r,{status:decision,reviewer:profile().actor,reviewed:new Date().toISOString(),reviewNote:note});addEvent('Corporate access '+decision,r.id+' · '+r.organization+' · '+note);close();route();toast('Demo decision recorded with reviewer and time.');});$('#review-note').addEventListener('input',e=>e.target.setCustomValidity(''));
}
function inviteDialog(){if(!canInvite())return;modal('Share selected projects',`<form id="invite-form"><div class="dialog-body"><p>Only populated project rooms can be included in this preview. The recipient will see the selected room.</p><label class="field" for="invite-org">Recipient organization (example)</label><input class="form-input" id="invite-org" name="organization" value="Microsoft" required maxlength="100"><label class="field" for="invite-person">Recipient name (example)</label><input class="form-input" id="invite-person" name="person" placeholder="Example reviewer" required maxlength="100"><fieldset style="margin-top:20px"><legend>Projects included</legend>${visibleProjects().map(p=>`<label class="option ${p.populated?'':'unavailable-option'}"><input type="checkbox" name="projects" value="${p.id}" ${p.id===entooma?'checked':''} ${p.populated?'':'disabled'}><span><strong>${esc(p.name)}</strong><small>${p.populated?esc(p.country||'Location not populated'):'Unavailable in preview · awaiting content'}</small></span></label>`).join('')}</fieldset><p class="small" id="invite-error" role="alert"></p><div class="disclosure">Role: project viewer. TopCo access is excluded and cannot be added through this invitation. No email is sent.</div></div><div class="dialog-foot"><button type="button" class="button" data-action="close">Cancel</button><button type="submit" class="button primary">Create demo invitation →</button></div></form>`);
 $('#invite-form').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),projects=f.getAll('projects').filter(id=>canSee(id)&&catalog.projects.find(p=>p.id===id)?.populated),organization=f.get('organization').trim(),person=f.get('person').trim();if(!projects.length||!organization||!person){$('#invite-error').textContent='Enter a recipient and select at least one available project.';return;}const id='INV-'+String(invites.length+1).padStart(3,'0');const invitation={id,projects,organization,person,actor:profile().actor,actorId:profile().id,created:new Date().toISOString()};invites.push(invitation);profiles[id]={id,projects,organization,actor:person+' · '+organization+' (demo)',label:organization+' · '+projects.length+' projects',role:'investor'};addEvent('Project invitation created',id+' · '+organization+' · '+projects.length+' projects · TopCo excluded');close();location.hash='#/access';route();toast('Demo invitation created. You can preview the recipient’s project list.');});
}
function route(){
 const [pathname,queryString='']=(location.hash||'#/portfolio').slice(2).split('?');
 const path=pathname.split('/'),params=new URLSearchParams(queryString);activeProject=null;
 if($('#dialog').open)close();
 if(path[0]==='project'&&path[2]==='documents'){
  if(params.has('citation')){
   const key=params.get('citation'),record=sourceRecords.get(key),binding=record?bindingFor(key,record):null,document=binding?documentById.get(binding.primary):null;
   if(document){docQuery=document.name;sourceFocusId=document.id;sourceFocusKey=key;}
   else{docQuery=sourceFocusId=sourceFocusKey='';}
  }else{docQuery=sourceFocusId=sourceFocusKey='';}
 }
 if(path[0]==='project')renderProject(path[1],path[2]||'overview');else if(path[0]==='source')renderSourceRoute(path[1]);else if(path[0]==='corporate')renderCorporate();else if(path[0]==='access')renderAccess();else renderPortfolio();
 nav();$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');
 const heading=$('#main h1');document.title=(heading?.textContent||'Project portfolio')+' · CIP Investor Data Room';
 if(!firstRender){$('#main').focus({preventScroll:true});$('#announcer').textContent=heading?.textContent||'Page updated';}
 window.scrollTo(0,path[0]==='portfolio'?portfolioScroll:0);firstRender=false;
}
async function init(){
 if(location.protocol==='file:'){$('#main').innerHTML='<div class="empty"><h1>Open the local preview</h1><p>This working prototype loads the project’s data files. Serve the repository over HTTP, then open this page through the local server.</p><p class="small">From the project folder: <code>python3 -m http.server 8000 --bind 127.0.0.1</code></p><a class="button primary" href="http://localhost:8000/docs/_sandbox-codex/Portfolio%20Pipeline.codex.html">Open local preview →</a></div>';return;}
 try{
 const urls=['portfolio-codex/catalog.json','../../data/entooma-sidai/project.json','../../data/indicators.json','../../data/i18n/en.json','../../data/geo/project_area.geojson','portfolio-codex/source-index.json','portfolio-codex/project-documents.json'];
 [catalog,project,indicators,strings,geo,sourceCatalog,projectDocuments]=await Promise.all(urls.map(async u=>{const r=await fetch(u);if(!r.ok)throw new Error('Unable to load '+u);return r.json();}));
 const africa=catalog.projects.filter(p=>[entooma,'dongwe-kabompo-community-carbon-project','agroforestry-project-of-cameroon','uganda-native-reforestation-and-agroforestry-project'].includes(p.id)).map(p=>p.id);
 profiles={team:{id:'team',label:'CIP team',organization:'Climate Investment Partners',actor:'CIP reviewer (demo)',role:'admin',projects:catalog.projects.map(p=>p.id),description:'All 17 project identities. Review corporate requests and create invitations.'},partner:{id:'partner',label:'Collington Capital · Partner',organization:'Collington Capital',actor:'Collington partner (demo)',role:'partner',projects:africa,description:'Four selected African projects. Can invite others to a subset; cannot grant TopCo access.'},single:{id:'microsoft',label:'Microsoft · Entooma only',organization:'Microsoft',actor:'Microsoft reviewer (demo)',role:'investor',projects:[entooma],description:'An example project-only invitation from Collington Capital.'},africa:{id:'microsoft',label:'Microsoft · Four projects',organization:'Microsoft',actor:'Microsoft reviewer (demo)',role:'investor',projects:africa,description:'Entooma, Dongwe-Kabompo, Cameroon and Uganda. No wider portfolio or TopCo documents.'}};
 makeSources();makeDocumentIndex();route();
 }catch(err){console.error(err);$('#main').innerHTML='<section class="empty"><h1>The portfolio could not load</h1><p>Please check the local server and reload the page.</p><button class="button" onclick="location.reload()">Try again</button></section>';return;}
 $('#preview-settings').addEventListener('click',previewDialog);
 $('#review-guide-toggle').addEventListener('click',()=>toggleReviewGuide($('#review-guide').hidden));
 $('#review-guide').addEventListener('click',e=>{const button=e.target.closest('[data-guide]');if(button)reviewGuideAction(button.dataset.guide);});
 $('#menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
 $('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus();});
 window.addEventListener('hashchange',route);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#review-guide').hidden){toggleReviewGuide(false);return;}if(e.key==='Escape'&&$('#sidebar').classList.contains('open')){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').focus();}});
 document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#/project/"]');if(link&&(location.hash==='#/portfolio'||!location.hash))portfolioScroll=window.scrollY;
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.evidence)evidence(b.dataset.evidence);
  if(b.dataset.findDocument){const key=b.dataset.sourceKey||'',record=sourceRecords.get(key);if(!record)return;close();location.hash=citationHref(key);route();}
  if(b.dataset.toggleSection){const id=b.dataset.toggleSection;if(openSections.has(id))openSections.delete(id);else openSections.add(id);renderDocs();}
  if(b.dataset.review)reviewDialog(b.dataset.review,b.dataset.decision);
  if(b.dataset.previewInvite)setProfile(b.dataset.previewInvite);
  switch(b.dataset.action){case'close':close();break;case'preview':previewDialog();break;case'invite':inviteDialog();break;case'request-topco':requestDialog();break;case'clear-filters':query=country=readiness='';renderPortfolio();$('#project-search').focus();break;case'clear-docs':docQuery=sourceFocusId=sourceFocusKey='';location.hash=`#/project/${entooma}/documents`;renderProject(entooma,'documents');$('#document-search').focus();break;case'expand-docs':if(openSections.size===projectDocuments.sectionCount)openSections.clear();else projectDocuments.sections.forEach(section=>openSections.add(section.id));renderProject(entooma,'documents');break;}
 });
}
init();
})();
