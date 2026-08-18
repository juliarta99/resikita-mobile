import { TENGAH_NUSANTARA, ZOOM_NASIONAL } from "@/constants/peta";

export type LeafletMarker = {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
};
type Opts = {
  center: { lat: number; lng: number };
  zoom?: number;
  pick?: boolean;
  markers?: LeafletMarker[];
};

/** Bangun HTML peta Leaflet + OpenStreetMap (tanpa API key). */
export function buildLeafletHtml(opts: Opts): string {
  // Cadangan nasional, bukan koordinat satu daerah tertentu, lihat
  // `constants/peta.ts`.
  const lat = opts.center?.lat ?? TENGAH_NUSANTARA.lat;
  const lng = opts.center?.lng ?? TENGAH_NUSANTARA.lng;
  const zoom = opts.zoom ?? ZOOM_NASIONAL;
  const pick = opts.pick ? "true" : "false";
  const markers = JSON.stringify(opts.markers ?? []);

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{height:100%;margin:0;padding:0;background:#E2E8F0}
.pin{width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.leaflet-container{font-family:system-ui,sans-serif}
</style></head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var CENTER=[${lat},${lng}], ZOOM=${zoom}, PICK=${pick}, INIT=${markers};
var map=L.map('map',{zoomControl:true}).setView(CENTER,ZOOM);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
var COLORS={green:'#057D5D',amber:'#F59E0B',red:'#EF4444',blue:'#2563EB'};
function icon(c){return L.divIcon({className:'',html:'<div class="pin" style="background:'+(COLORS[c]||COLORS.green)+'"></div>',iconSize:[24,24],iconAnchor:[12,22]});}
var layer=L.layerGroup().addTo(map);
function renderMarkers(list){layer.clearLayers();(list||[]).forEach(function(m){var mk=L.marker([m.lat,m.lng],{icon:icon(m.color)}).addTo(layer);mk.on('click',function(){send({type:'marker',id:m.id});});});}
function send(o){var s=JSON.stringify(o);if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(s);}else if(window.parent){window.parent.postMessage(s,'*');}}
/* Atribusi ODbL wajib mengarah ke halaman hak cipta OSM, tapi membiarkan
   tautannya menavigasi WebView berarti peta tertimpa halaman itu tanpa jalan
   kembali. Kliknya dicegat lalu diteruskan ke aplikasi untuk dibuka di peramban
   sistem, satu perilaku yang sama di web maupun native. */
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;var a=t.closest('.leaflet-control-attribution a');if(a&&a.href){e.preventDefault();send({type:'link',url:a.href});}});
var pin=null;
function setPin(la,ln){if(pin){pin.setLatLng([la,ln]);}else{pin=L.marker([la,ln],{icon:icon('red'),draggable:true}).addTo(map);pin.on('dragend',function(e){var p=e.target.getLatLng();send({type:'press',lat:p.lat,lng:p.lng});});}}
if(PICK){map.on('click',function(e){setPin(e.latlng.lat,e.latlng.lng);send({type:'press',lat:e.latlng.lat,lng:e.latlng.lng});});setPin(CENTER[0],CENTER[1]);}
renderMarkers(INIT);
function handle(raw){try{var c=JSON.parse(raw);if(c.cmd==='setView'){map.setView([c.lat,c.lng],c.zoom||map.getZoom());}else if(c.cmd==='markers'){renderMarkers(c.list);}else if(c.cmd==='pick'){setPin(c.lat,c.lng);}}catch(e){}}
window.__handle=handle;
window.addEventListener('message',function(e){if(typeof e.data==='string')handle(e.data);});
setTimeout(function(){map.invalidateSize();send({type:'ready'});},300);
</script></body></html>`;
}
