/* Entooma geographic context. These layers are illustrative source boundaries,
 * not a validated 500,000 ha project perimeter. */
'use strict';
window.CIPMap = (() => {
 const definitions = [
  {id:'project',label:'Boundary on file',color:'#55752d',fill:'#769841',opacity:.34,weight:3,checked:true},
  {id:'reserve',label:'Maasai Mara National Reserve',file:'mara_reserve.geojson',color:'#2e6b9e',fill:'#4b9ac6',opacity:.18,weight:2,checked:true},
  {id:'conservancies',label:'Mara conservancies',file:'mara_conservancies.geojson',color:'#a53c65',fill:'#be6a88',opacity:.19,weight:2,checked:true},
  {id:'forest',label:'Forest cover',file:'forest.geojson',color:'#66549a',fill:'#7767a9',opacity:.27,weight:1.5,checked:false},
  {id:'cropland',label:'Cropland',file:'cropland.geojson',color:'#bd871a',fill:'#dcad45',opacity:.30,weight:1.5,checked:false}
 ];
 let map=null,layers={},bounds=null,generation=0;
 const escape = value => String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function markup(fallbackSvg){
  return `<section class="map-panel" aria-labelledby="map-title"><div class="map-panel-head"><div><div class="eyebrow">Entooma Sidai / spatial context</div><h2 id="map-title">Project boundary and surrounding land</h2><p>Explore the available GIS layers in their geographic context.</p></div><span class="map-source-tag">Source GIS · March 2026</span></div><div class="map-layout"><div class="map-stage"><div id="project-map" role="region" aria-label="Interactive map of the Entooma Sidai boundary and surrounding land"></div><div class="map-fallback" id="map-fallback">${fallbackSvg}<p>Map unavailable. The project boundary outline is shown without a basemap.</p></div></div><div class="map-legend"><h3>Layers</h3><div class="map-legend-list">${definitions.map(item=>`<label class="map-layer"><input type="checkbox" data-map-layer="${item.id}" ${item.checked?'checked':''} ${item.id==='project'?'':'disabled'}><span class="map-swatch" style="--swatch:${item.fill}" aria-hidden="true"></span><span>${escape(item.label)}</span></label>`).join('')}</div><button type="button" class="button small map-reset" id="map-reset">Reset view</button><p class="map-load-status" id="map-load-status" role="status" aria-live="polite">Loading map layers…</p></div></div><div class="map-caveat"><strong>Boundary under review</strong><span>The GIS file outlines 652,022 ha; CIP’s confirmed project area is 500,000 ha. This map does not establish the final project perimeter.</span></div></section>`;
 }
 function unmount(){generation++;if(map){map.remove();map=null;}layers={};bounds=null;}
 function tooltip(feature){const node=document.createElement('span');node.textContent=feature.properties?.name||'Map feature';return node;}
 function makeLayer(data,item){return L.geoJSON(data,{style:{color:item.color,weight:item.weight,fillColor:item.fill,fillOpacity:item.opacity,opacity:.95},onEachFeature(feature,layer){layer.bindTooltip(tooltip(feature),{sticky:true});}});}
 async function mount(projectArea){
  unmount();const token=generation;const target=document.getElementById('project-map');const status=document.getElementById('map-load-status');
  if(!target||!window.L){if(status)status.textContent='Interactive map unavailable.';return;}
  map=L.map(target,{zoomControl:false,scrollWheelZoom:false,preferCanvas:true});
  L.control.zoom({position:'topleft'}).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  const project=definitions[0];layers.project=makeLayer(projectArea,project).addTo(map);
  bounds=layers.project.getBounds();map.fitBounds(bounds,{padding:[24,24],maxZoom:10});
  document.getElementById('map-fallback').hidden=true;
  document.getElementById('map-reset').addEventListener('click',()=>map?.fitBounds(bounds,{padding:[24,24],maxZoom:10}));
  for(const input of document.querySelectorAll('[data-map-layer]'))input.addEventListener('change',()=>{const layer=layers[input.dataset.mapLayer];if(!map||!layer)return;if(input.checked)layer.addTo(map);else map.removeLayer(layer);});
  requestAnimationFrame(()=>map?.invalidateSize());
  const results=await Promise.allSettled(definitions.slice(1).map(async item=>{const response=await fetch(`data/geo/${item.file}`);if(!response.ok)throw Error(item.file);return response.json();}));
  if(token!==generation||!map)return;
  let failures=0;
  results.forEach((result,index)=>{const item=definitions[index+1];const input=document.querySelector(`[data-map-layer="${item.id}"]`);if(result.status!=='fulfilled'){failures++;input.closest('.map-layer').classList.add('map-layer-unavailable');return;}layers[item.id]=makeLayer(result.value,item);input.disabled=false;if(input.checked)layers[item.id].addTo(map);});
  status.textContent=failures?`${failures} layer${failures===1?'':'s'} could not load.`:'All five GIS layers loaded.';
 }
 return {markup,mount,unmount};
})();
